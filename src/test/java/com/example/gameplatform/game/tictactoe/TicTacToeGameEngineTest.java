package com.example.gameplatform.game.tictactoe;

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

class TicTacToeGameEngineTest {

    private TicTacToeGameEngine engine;
    private Player player1;
    private Player player2;

    @BeforeEach
    void setUp() {
        engine = new TicTacToeGameEngine(new java.util.Random() {
            @Override
            public boolean nextBoolean() {
                return true; // player 1 starts
            }
        });
        player1 = Player.create("p1", "Alice");
        player2 = Player.create("p2", "Bob");
    }

    @Test
    @DisplayName("shouldRandomlyAssignStartingPlayer")
    void shouldRandomlyAssignStartingPlayer() {
        TicTacToeGameEngine randomEngine = new TicTacToeGameEngine(new java.util.Random() {
            @Override
            public boolean nextBoolean() {
                return false; // player 2 starts
            }
        });
        GameState<TicTacToeState.Details> state = randomEngine.createGame("game-random", List.of(player1, player2), randomEngine.defaultConfiguration());
        assertEquals("p2", state.getDetails().getCurrentPlayerId());
        assertEquals("p2", state.getDetails().getPlayerX());
        assertEquals("p1", state.getDetails().getPlayerO());
        assertEquals("Tic Tac Toe", randomEngine.displayName());
    }

    @Test
    @DisplayName("shouldPlaceValidMove")
    void shouldPlaceValidMove() {
        GameState<TicTacToeState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        
        GameResult result = engine.processAction(state, player1, new TicTacToeAction("PLACE_MARK", 0, 0));
        assertTrue(result.isSuccessful());
        assertEquals("X", ((TicTacToeState) result.getNewState()).getDetails().getBoard()[0][0]);
        assertEquals("p2", ((TicTacToeState) result.getNewState()).getDetails().getCurrentPlayerId());
    }

    @Test
    @DisplayName("shouldRejectOccupiedCell")
    void shouldRejectOccupiedCell() {
        GameState<TicTacToeState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        GameResult res1 = engine.processAction(state, player1, new TicTacToeAction("PLACE_MARK", 1, 1));
        assertTrue(res1.isSuccessful());

        GameResult res2 = engine.processAction(res1.getNewState(), player2, new TicTacToeAction("PLACE_MARK", 1, 1));
        assertFalse(res2.isSuccessful());
        assertEquals(ErrorCodes.INVALID_MOVE, res2.getErrorCode());
    }

    @Test
    @DisplayName("shouldRejectMoveFromWrongPlayer")
    void shouldRejectMoveFromWrongPlayer() {
        GameState<TicTacToeState.Details> state = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        
        // Bob attempts to play first (Alice's turn)
        GameResult result = engine.processAction(state, player2, new TicTacToeAction("PLACE_MARK", 0, 0));
        assertFalse(result.isSuccessful());
        assertEquals(ErrorCodes.NOT_YOUR_TURN, result.getErrorCode());
    }

    @Test
    @DisplayName("shouldDetectHorizontalWin")
    void shouldDetectHorizontalWin() {
        GameState<?> s = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        // Row 0 win for Alice: (0,0), (1,0), (0,1), (1,1), (0,2)
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 0)).getNewState();
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 1, 0)).getNewState();
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 1)).getNewState();
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 1, 1)).getNewState();
        GameResult winResult = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 2));

        assertTrue(winResult.isSuccessful());
        assertEquals(GameStatus.FINISHED, winResult.getNewState().getStatus());
        assertEquals("p1", winResult.getNewState().getWinner());
    }

    @Test
    @DisplayName("shouldDetectVerticalWin")
    void shouldDetectVerticalWin() {
        GameState<?> s = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        // Col 0 win for Alice: (0,0), (0,1), (1,0), (1,1), (2,0)
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 0)).getNewState();
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 0, 1)).getNewState();
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 1, 0)).getNewState();
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 1, 1)).getNewState();
        GameResult winResult = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 2, 0));

        assertTrue(winResult.isSuccessful());
        assertEquals(GameStatus.FINISHED, winResult.getNewState().getStatus());
        assertEquals("p1", winResult.getNewState().getWinner());
    }

    @Test
    @DisplayName("shouldDetectDiagonalWin")
    void shouldDetectDiagonalWin() {
        GameState<?> s = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        // Main diagonal win: (0,0), (0,1), (1,1), (0,2), (2,2)
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 0)).getNewState();
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 0, 1)).getNewState();
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 1, 1)).getNewState();
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 0, 2)).getNewState();
        GameResult winResult = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 2, 2));

        assertTrue(winResult.isSuccessful());
        assertEquals(GameStatus.FINISHED, winResult.getNewState().getStatus());
        assertEquals("p1", winResult.getNewState().getWinner());
    }

    @Test
    @DisplayName("shouldDetectDraw")
    void shouldDetectDraw() {
        GameState<?> s = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        // X O X
        // X X O
        // O X O
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 0)).getNewState(); // X
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 0, 1)).getNewState(); // O
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 2)).getNewState(); // X
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 1, 2)).getNewState(); // O
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 1, 0)).getNewState(); // X
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 2, 0)).getNewState(); // O
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 1, 1)).getNewState(); // X
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 2, 2)).getNewState(); // O
        GameResult drawResult = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 2, 1)); // X

        assertTrue(drawResult.isSuccessful());
        assertEquals(GameStatus.DRAW, drawResult.getNewState().getStatus());
        assertNull(drawResult.getNewState().getWinner());
    }

    @Test
    @DisplayName("shouldRejectMoveAfterGameFinished")
    void shouldRejectMoveAfterGameFinished() {
        GameState<?> s = engine.createGame("game-1", List.of(player1, player2), engine.defaultConfiguration());
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 0)).getNewState();
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 1, 0)).getNewState();
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 1)).getNewState();
        s = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 1, 1)).getNewState();
        s = engine.processAction(s, player1, new TicTacToeAction("PLACE_MARK", 0, 2)).getNewState();

        GameResult res = engine.processAction(s, player2, new TicTacToeAction("PLACE_MARK", 2, 2));
        assertFalse(res.isSuccessful());
        assertEquals(ErrorCodes.GAME_ALREADY_FINISHED, res.getErrorCode());
    }
}
