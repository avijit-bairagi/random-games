package com.example.gameplatform.game.chess;

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

class ChessGameEngineTest {

    private ChessGameEngine engine;
    private Player player1;
    private Player player2;

    @BeforeEach
    void setUp() {
        engine = new ChessGameEngine();
        player1 = Player.create("p1", "Alice");
        player2 = Player.create("p2", "Bob");
    }

    @Test
    @DisplayName("shouldInitializeChessGameCorrectly")
    void shouldInitializeChessGameCorrectly() {
        GameState<ChessState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());

        assertNotNull(state);
        assertEquals(GameStatus.IN_PROGRESS, state.getStatus());
        assertEquals(2, state.getPlayers().size());

        ChessState.Details details = (ChessState.Details) state.getDetails();
        assertNotNull(details.getFen());
        assertTrue(details.getFen().startsWith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq"));
        assertNotNull(details.getWhitePlayerId());
        assertNotNull(details.getBlackPlayerId());
        assertEquals(details.getWhitePlayerId(), details.getCurrentPlayerId());
    }

    @Test
    @DisplayName("shouldProcessValidMoveAction")
    void shouldProcessValidMoveAction() {
        GameState<ChessState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        ChessState.Details details = (ChessState.Details) state.getDetails();
        String startingPlayerId = details.getCurrentPlayerId();
        assertTrue(startingPlayerId.equals("p1"));

        ChessAction action = new ChessAction("MOVE", "e2", "e4", null);
        GameResult result = engine.processAction(state, player1, action);

        assertTrue(result.isSuccessful());
        ChessState newState = (ChessState) result.getNewState();
        assertNotEquals(startingPlayerId, newState.getDetails().getCurrentPlayerId());
        assertTrue(newState.getDetails().getFen().contains(" b"));
        assertEquals(1, newState.getDetails().getMoveHistory().size());
        assertEquals("e2e4", newState.getDetails().getMoveHistory().get(0));
    }

    @Test
    @DisplayName("shouldRejectMoveFromWrongPlayer")
    void shouldRejectMoveFromWrongPlayer() {
        GameState<ChessState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        ChessState.Details details = (ChessState.Details) state.getDetails();
        assertTrue(details.getCurrentPlayerId().equals("p1"));

        // player2 tries to move but it's player1's turn
        ChessAction action = new ChessAction("MOVE", "e7", "e5", null);
        GameResult result = engine.processAction(state, player2, action);

        assertFalse(result.isSuccessful());
        assertEquals(ErrorCodes.NOT_YOUR_TURN, result.getErrorCode());
    }

    @Test
    @DisplayName("shouldRejectIllegalMove")
    void shouldRejectIllegalMove() {
        GameState<ChessState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());

        // Pawn can't move sideways
        ChessAction action = new ChessAction("MOVE", "e2", "d3", null);
        GameResult result = engine.processAction(state, player1, action);

        assertFalse(result.isSuccessful());
        assertEquals(ErrorCodes.INVALID_MOVE, result.getErrorCode());
    }

    @Test
    @DisplayName("shouldAlternateTurns")
    void shouldAlternateTurns() {
        GameState<ChessState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());

        // White moves e2-e4
        GameResult result1 = engine.processAction(state, player1, new ChessAction("MOVE", "e2", "e4", null));
        assertTrue(result1.isSuccessful());
        ChessState state2 = (ChessState) result1.getNewState();
        assertEquals("p2", state2.getDetails().getCurrentPlayerId());

        // Black moves e7-e5
        GameResult result2 = engine.processAction(state2, player2, new ChessAction("MOVE", "e7", "e5", null));
        assertTrue(result2.isSuccessful());
        ChessState state3 = (ChessState) result2.getNewState();
        assertEquals("p1", state3.getDetails().getCurrentPlayerId());
    }

    @Test
    @DisplayName("shouldDetectCheckmate")
    void shouldDetectCheckmate() {
        // Fool's mate: fastest checkmate in chess
        GameState<ChessState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());

        GameResult r1 = engine.processAction(state, player1, new ChessAction("MOVE", "f2", "f3", null));
        assertTrue(r1.isSuccessful());
        GameResult r2 = engine.processAction(r1.getNewState(), player2, new ChessAction("MOVE", "e7", "e5", null));
        assertTrue(r2.isSuccessful());
        GameResult r3 = engine.processAction(r2.getNewState(), player1, new ChessAction("MOVE", "g2", "g4", null));
        assertTrue(r3.isSuccessful());
        GameResult r4 = engine.processAction(r3.getNewState(), player2, new ChessAction("MOVE", "d8", "h4", null));
        assertTrue(r4.isSuccessful());

        ChessState finalState = (ChessState) r4.getNewState();
        assertEquals(GameStatus.FINISHED, finalState.getStatus());
        assertEquals("p2", finalState.getWinner());
        assertTrue(finalState.getDetails().isCheckmate());
    }

    @Test
    @DisplayName("shouldForfeitOnDisconnect")
    void shouldForfeitOnDisconnect() {
        GameState<ChessState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());

        GameResult result = engine.onPlayerDisconnect(state, player1);
        assertTrue(result.isSuccessful());
        ChessState newState = (ChessState) result.getNewState();
        assertEquals(GameStatus.FINISHED, newState.getStatus());
        assertEquals("p2", newState.getWinner());
    }

    @Test
    @DisplayName("shouldReturnCorrectGameType")
    void shouldReturnCorrectGameType() {
        assertEquals("CHESS", engine.gameType());
        assertEquals("Chess", engine.displayName());
        assertEquals(2, engine.minPlayers());
        assertEquals(2, engine.maxPlayers());
        assertTrue(engine.isSpectatorAllowed());
        assertFalse(engine.isLateJoinAllowed());
    }
}
