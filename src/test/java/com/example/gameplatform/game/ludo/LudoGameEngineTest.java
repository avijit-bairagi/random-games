package com.example.gameplatform.game.ludo;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.game.core.GameResult;
import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import com.example.gameplatform.player.model.Player;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LudoGameEngineTest {

    private LudoGameEngine engine;
    private Player player1;
    private Player player2;

    @BeforeEach
    void setUp() {
        engine = new LudoGameEngine(new java.util.Random() {
            @Override
            public int nextInt(int bound) {
                return 0; // default player 1 starts
            }
        });
        player1 = Player.create("p1", "Alice");
        player2 = Player.create("p2", "Bob");
    }

    @Test
    @DisplayName("shouldRandomlySelectStartingPlayer")
    void shouldRandomlySelectStartingPlayer() {
        LudoGameEngine randomEngine = new LudoGameEngine(new java.util.Random() {
            @Override
            public int nextInt(int bound) {
                return 1; // player 2 (Bob) starts
            }
        });
        GameState<LudoState.Details> state = randomEngine.createGame("ludo-rand", List.of(player1, player2), randomEngine.defaultConfiguration());
        assertEquals("p2", state.getDetails().getCurrentPlayerId());
        // For 2 players, opposite side colors are RED and YELLOW
        assertEquals(LudoState.Color.YELLOW, state.getDetails().getCurrentColor());
        assertEquals(1, state.getDetails().getCurrentTurnIndex());
    }

    @Test
    @DisplayName("shouldAssignOppositeSidesForTwoPlayers")
    void shouldAssignOppositeSidesForTwoPlayers() {
        GameState<LudoState.Details> state2 = engine.createGame("ludo-2p", List.of(player1, player2), engine.defaultConfiguration());
        assertEquals(LudoState.Color.RED, state2.getDetails().getPlayerStates().get("p1").getColor());
        assertEquals(LudoState.Color.YELLOW, state2.getDetails().getPlayerStates().get("p2").getColor());
        assertEquals(LudoGameEngine.RED_START_INDEX, state2.getDetails().getPlayerStates().get("p1").getStartGlobalIndex());
        assertEquals(LudoGameEngine.YELLOW_START_INDEX, state2.getDetails().getPlayerStates().get("p2").getStartGlobalIndex());

        // 4 players test: RED, GREEN, YELLOW, BLUE
        Player player3 = Player.create("p3", "Charlie");
        Player player4 = Player.create("p4", "Diana");
        GameState<LudoState.Details> state4 = engine.createGame("ludo-4p", List.of(player1, player2, player3, player4), engine.defaultConfiguration());
        assertEquals(LudoState.Color.RED, state4.getDetails().getPlayerStates().get("p1").getColor());
        assertEquals(LudoState.Color.GREEN, state4.getDetails().getPlayerStates().get("p2").getColor());
        assertEquals(LudoState.Color.YELLOW, state4.getDetails().getPlayerStates().get("p3").getColor());
        assertEquals(LudoState.Color.BLUE, state4.getDetails().getPlayerStates().get("p4").getColor());
    }

    @Test
    @DisplayName("shouldCreateGameWithCorrectStartingState")
    void shouldCreateGameWithCorrectStartingState() {
        GameState<LudoState.Details> state = engine.createGame("ludo-1", List.of(player1, player2), engine.defaultConfiguration());
        
        assertNotNull(state);
        assertEquals(GameStatus.IN_PROGRESS, state.getStatus());
        assertEquals("p1", state.getDetails().getCurrentPlayerId());
        assertEquals(LudoState.Color.RED, state.getDetails().getCurrentColor());
        assertEquals(LudoState.TurnPhase.ROLLING, state.getDetails().getTurnPhase());
        assertEquals(4, state.getDetails().getPlayerStates().get("p1").getPieces().size());
        assertTrue(state.getDetails().getPlayerStates().get("p1").getPieces().get(0).isInYard());

        Player player3 = Player.create("p3", "Charlie");
        Player player4 = Player.create("p4", "Diana");

        // 4 players is valid
        GameState<LudoState.Details> state4 = engine.createGame("ludo-4", List.of(player1, player2, player3, player4), engine.defaultConfiguration());
        assertEquals(4, state4.getDetails().getPlayerTurnOrder().size());

        // 3 players is rejected for Ludo (only 2 or 4 allowed)
        assertThrows(IllegalArgumentException.class, () -> engine.createGame("ludo-3", List.of(player1, player2, player3), engine.defaultConfiguration()));
    }

    @Test
    @DisplayName("shouldRejectMoveBeforeRollingDice")
    void shouldRejectMoveBeforeRollingDice() {
        GameState<LudoState.Details> state = engine.createGame("ludo-1", List.of(player1, player2), engine.defaultConfiguration());
        
        GameResult result = engine.processAction(state, player1, new LudoAction(LudoAction.MOVE_PIECE, 0));
        assertFalse(result.isSuccessful());
        assertEquals(ErrorCodes.INVALID_ACTION, result.getErrorCode());
    }

    @Test
    @DisplayName("shouldMovePieceOutOfYardOnSix")
    void shouldMovePieceOutOfYardOnSix() {
        GameState<LudoState.Details> state = engine.createGame("ludo-1", List.of(player1, player2), engine.defaultConfiguration());
        
        // Mock / force state to have rolled a 6
        LudoState ludoState = (LudoState) state;
        ludoState.getDetails().setCurrentPlayerId("p1");
        ludoState.getDetails().setCurrentColor(LudoState.Color.RED);
        ludoState.getDetails().setTurnPhase(LudoState.TurnPhase.MOVING);
        ludoState.getDetails().setLastDiceRoll(6);
        ludoState.getDetails().setMovablePieceIndices(List.of(0, 1, 2, 3));

        GameResult result = engine.processAction(ludoState, player1, new LudoAction(LudoAction.MOVE_PIECE, 0));
        assertTrue(result.isSuccessful());
        LudoState newState = (LudoState) result.getNewState();
        LudoState.Piece piece0 = newState.getDetails().getPlayerStates().get("p1").getPieces().get(0);
        
        assertFalse(piece0.isInYard());
        assertEquals(0, piece0.getStep());
        // Since dice was 6, Alice should get another turn (rolling phase)
        assertEquals(LudoState.TurnPhase.ROLLING, newState.getDetails().getTurnPhase());
        assertEquals("p1", newState.getDetails().getCurrentPlayerId());
    }

    @Test
    @DisplayName("shouldAdvanceTurnWhenNoMovesAvailable")
    void shouldAdvanceTurnWhenNoMovesAvailable() {
        GameState<LudoState.Details> state = engine.createGame("ludo-1", List.of(player1, player2), engine.defaultConfiguration());
        LudoState lState = (LudoState) state;
        lState.getDetails().setCurrentPlayerId("p1");
        lState.getDetails().setCurrentColor(LudoState.Color.RED);
        lState.getDetails().setTurnPhase(LudoState.TurnPhase.ROLLING);

        // All pieces in yard, rolling non-6 means no valid moves
        // Execute roll
        GameResult result = engine.processAction(lState, player1, new LudoAction(LudoAction.ROLL_DICE, null));
        assertTrue(result.isSuccessful());
        LudoState newState = (LudoState) result.getNewState();
        
        if (newState.getDetails().getLastDiceRoll() != null && newState.getDetails().getLastDiceRoll() == 6) {
            // If random roll was 6, Alice is in MOVING phase
            assertEquals("p1", newState.getDetails().getCurrentPlayerId());
            assertEquals(LudoState.TurnPhase.MOVING, newState.getDetails().getTurnPhase());
        } else {
            // Turn auto-advances to Bob (p2)
            assertEquals("p2", newState.getDetails().getCurrentPlayerId());
            assertEquals(LudoState.TurnPhase.ROLLING, newState.getDetails().getTurnPhase());
        }
    }

    @Test
    @DisplayName("shouldCaptureOpponentPieceOnUnsafeCell")
    void shouldCaptureOpponentPieceOnUnsafeCell() {
        GameState<LudoState.Details> state = engine.createGame("ludo-1", List.of(player1, player2), engine.defaultConfiguration());
        LudoState lState = (LudoState) state;
        lState.getDetails().setCurrentPlayerId("p1");
        lState.getDetails().setCurrentColor(LudoState.Color.RED);

        // Place Bob's piece on global index 1
        LudoState.Piece bobPiece = lState.getDetails().getPlayerStates().get("p2").getPieces().get(0);
        bobPiece.setInYard(false);
        int bobStart = lState.getDetails().getPlayerStates().get("p2").getStartGlobalIndex();
        bobPiece.setStep((1 - bobStart + 52) % 52); // At global cell 1

        // Alice's piece 0 is at step 0 (global cell 0). Roll dice = 1 -> target step 1 (global cell 1)
        LudoState.Piece alicePiece = lState.getDetails().getPlayerStates().get("p1").getPieces().get(0);
        alicePiece.setInYard(false);
        alicePiece.setStep(0);

        lState.getDetails().setTurnPhase(LudoState.TurnPhase.MOVING);
        lState.getDetails().setLastDiceRoll(1);
        lState.getDetails().setMovablePieceIndices(List.of(0));

        GameResult result = engine.processAction(lState, player1, new LudoAction(LudoAction.MOVE_PIECE, 0));
        assertTrue(result.isSuccessful());
        LudoState updated = (LudoState) result.getNewState();

        // Bob's piece should be sent back to yard
        LudoState.Piece capturedBobPiece = updated.getDetails().getPlayerStates().get("p2").getPieces().get(0);
        assertTrue(capturedBobPiece.isInYard());
        assertEquals(-1, capturedBobPiece.getStep());

        // Alice gets a bonus turn for capturing
        assertEquals("p1", updated.getDetails().getCurrentPlayerId());
        assertEquals(LudoState.TurnPhase.ROLLING, updated.getDetails().getTurnPhase());
    }

    @Test
    @DisplayName("shouldGrantBonusTurnWhenSinglePieceReachesHomeWithoutWinning")
    void shouldGrantBonusTurnWhenSinglePieceReachesHomeWithoutWinning() {
        GameState<LudoState.Details> state = engine.createGame("ludo-1", List.of(player1, player2), engine.defaultConfiguration());
        LudoState lState = (LudoState) state;
        lState.getDetails().setCurrentPlayerId("p1");
        lState.getDetails().setCurrentColor(LudoState.Color.RED);

        // Piece 0 at step 55 (needs 2 to reach home goal 57)
        LudoState.PlayerState p1State = lState.getDetails().getPlayerStates().get("p1");
        LudoState.Piece piece0 = p1State.getPieces().get(0);
        piece0.setInYard(false);
        piece0.setStep(55);

        lState.getDetails().setTurnPhase(LudoState.TurnPhase.MOVING);
        lState.getDetails().setLastDiceRoll(2); // Non-6 roll
        lState.getDetails().setMovablePieceIndices(List.of(0));

        GameResult result = engine.processAction(lState, player1, new LudoAction(LudoAction.MOVE_PIECE, 0));
        assertTrue(result.isSuccessful());
        LudoState updatedState = (LudoState) result.getNewState();

        assertEquals(GameStatus.IN_PROGRESS, updatedState.getStatus());
        assertTrue(updatedState.getDetails().getPlayerStates().get("p1").getPieces().get(0).isFinished());
        assertEquals(57, updatedState.getDetails().getPlayerStates().get("p1").getPieces().get(0).getStep());
        assertEquals(1, updatedState.getDetails().getPlayerStates().get("p1").getPiecesFinished());

        // Player 1 gets a bonus turn for reaching home even on non-6 roll
        assertEquals("p1", updatedState.getDetails().getCurrentPlayerId());
        assertEquals(LudoState.TurnPhase.ROLLING, updatedState.getDetails().getTurnPhase());
    }

    @Test
    @DisplayName("shouldDeclareWinnerWhenAllPiecesReachHome")
    void shouldDeclareWinnerWhenAllPiecesReachHome() {
        GameState<LudoState.Details> state = engine.createGame("ludo-1", List.of(player1, player2), engine.defaultConfiguration());
        LudoState lState = (LudoState) state;
        lState.getDetails().setCurrentPlayerId("p1");
        lState.getDetails().setCurrentColor(LudoState.Color.RED);

        // 3 pieces already finished, 4th piece at step 56 (needs 1 to reach home goal 57)
        LudoState.PlayerState p1State = lState.getDetails().getPlayerStates().get("p1");
        p1State.setPiecesFinished(3);
        p1State.getPieces().get(0).setFinished(true);
        p1State.getPieces().get(1).setFinished(true);
        p1State.getPieces().get(2).setFinished(true);
        
        LudoState.Piece lastPiece = p1State.getPieces().get(3);
        lastPiece.setInYard(false);
        lastPiece.setStep(56);

        lState.getDetails().setTurnPhase(LudoState.TurnPhase.MOVING);
        lState.getDetails().setLastDiceRoll(1);
        lState.getDetails().setMovablePieceIndices(List.of(3));

        GameResult result = engine.processAction(lState, player1, new LudoAction(LudoAction.MOVE_PIECE, 3));
        assertTrue(result.isSuccessful());
        LudoState finishedState = (LudoState) result.getNewState();

        assertEquals(GameStatus.FINISHED, finishedState.getStatus());
        assertEquals("p1", finishedState.getWinner());
        assertEquals(4, finishedState.getDetails().getPlayerStates().get("p1").getPiecesFinished());
    }
}
