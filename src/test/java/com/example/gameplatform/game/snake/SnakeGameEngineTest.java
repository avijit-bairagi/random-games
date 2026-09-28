package com.example.gameplatform.game.snake;

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

class SnakeGameEngineTest {

    private SnakeGameEngine engine;
    private Player player1;
    private Player player2;
    private Player player3;

    @BeforeEach
    void setUp() {
        engine = new SnakeGameEngine(new java.util.Random() {
            @Override
            public int nextInt(int bound) {
                return 0; // default player 1 starts
            }
        });
        player1 = Player.create("p1", "Alice");
        player2 = Player.create("p2", "Bob");
        player3 = Player.create("p3", "Charlie");
    }

    @Test
    @DisplayName("shouldRandomlySelectStartingPlayer")
    void shouldRandomlySelectStartingPlayer() {
        SnakeGameEngine randomEngine = new SnakeGameEngine(new java.util.Random() {
            @Override
            public int nextInt(int bound) {
                return 1; // player 2 (Bob) starts
            }
        });
        GameState<SnakeState.Details> state = randomEngine.createGame("snake-rand", List.of(player1, player2), randomEngine.defaultConfiguration());
        assertEquals("p2", state.getDetails().getCurrentPlayerId());
        assertEquals(SnakeGameEngine.PLAYER_COLORS[1], state.getDetails().getCurrentColor());
        assertTrue(state.getDetails().getLastActionMessage().contains("Bob"));
    }

    @Test
    @DisplayName("shouldCreateGameWithCorrectStartingStateForTwoThreeFourPlayers")
    void shouldCreateGameWithCorrectStartingStateForTwoThreeFourPlayers() {
        GameState<SnakeState.Details> state2 = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        assertNotNull(state2);
        assertEquals(GameStatus.IN_PROGRESS, state2.getStatus());
        assertEquals("p1", state2.getDetails().getCurrentPlayerId());
        assertEquals(0, state2.getDetails().getPlayers().get("p1").getPosition());
        assertEquals(0, state2.getDetails().getPlayers().get("p2").getPosition());

        GameState<SnakeState.Details> state3 = engine.createGame("snake-2", List.of(player1, player2, player3), engine.defaultConfiguration());
        assertEquals(3, state3.getDetails().getTurnOrder().size());

        // 1 player should fail
        assertThrows(IllegalArgumentException.class, () -> engine.createGame("snake-3", List.of(player1), engine.defaultConfiguration()));
    }

    @Test
    @DisplayName("shouldAdvancePlayerOnDiceRoll")
    void shouldAdvancePlayerOnDiceRoll() {
        GameState<SnakeState.Details> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        
        // Alice rolls a 3
        GameResult result = engine.processAction(state, player1, new SnakeAction(SnakeAction.ROLL_DICE, 3));
        assertTrue(result.isSuccessful());
        SnakeState newState = (SnakeState) result.getNewState();

        assertEquals(3, newState.getDetails().getPlayers().get("p1").getPosition());
        // Since roll was 3 (not 6), turn passes to Bob
        assertEquals("p2", newState.getDetails().getCurrentPlayerId());
    }

    @Test
    @DisplayName("shouldClimbLadderWhenLandingOnLadderBottom")
    void shouldClimbLadderWhenLandingOnLadderBottom() {
        GameState<SnakeState.Details> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        
        // Square 4 has a ladder to 14
        GameResult result = engine.processAction(state, player1, new SnakeAction(SnakeAction.ROLL_DICE, 4));
        assertTrue(result.isSuccessful());
        SnakeState newState = (SnakeState) result.getNewState();

        // 0 + 4 = 4 -> climb ladder to 14!
        assertEquals(14, newState.getDetails().getPlayers().get("p1").getPosition());
    }

    @Test
    @DisplayName("shouldSlideDownSnakeWhenLandingOnSnakeHead")
    void shouldSlideDownSnakeWhenLandingOnSnakeHead() {
        GameState<SnakeState.Details> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        SnakeState sState = (SnakeState) state;

        // Position Alice at square 13. Snake head is at 17 (slides to 7).
        sState.getDetails().getPlayers().get("p1").setPosition(13);

        // Alice rolls 4 -> 13 + 4 = 17 -> slides down to 7!
        GameResult result = engine.processAction(sState, player1, new SnakeAction(SnakeAction.ROLL_DICE, 4));
        assertTrue(result.isSuccessful());
        SnakeState newState = (SnakeState) result.getNewState();

        assertEquals(7, newState.getDetails().getPlayers().get("p1").getPosition());
    }

    @Test
    @DisplayName("shouldGrantBonusTurnOnRollingSix")
    void shouldGrantBonusTurnOnRollingSix() {
        GameState<SnakeState.Details> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        
        // Alice rolls a 6
        GameResult result = engine.processAction(state, player1, new SnakeAction(SnakeAction.ROLL_DICE, 6));
        assertTrue(result.isSuccessful());
        SnakeState newState = (SnakeState) result.getNewState();

        assertEquals(6, newState.getDetails().getPlayers().get("p1").getPosition());
        // Alice rolled 6 -> keeps turn!
        assertEquals("p1", newState.getDetails().getCurrentPlayerId());
        assertEquals(1, newState.getDetails().getConsecutiveSixes());
    }

    @Test
    @DisplayName("shouldPassTurnAfterThreeConsecutiveSixes")
    void shouldPassTurnAfterThreeConsecutiveSixes() {
        GameState<?> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());

        // Alice rolls 6 (1st)
        state = engine.processAction(state, player1, new SnakeAction(SnakeAction.ROLL_DICE, 6)).getNewState();
        assertEquals("p1", ((SnakeState) state).getDetails().getCurrentPlayerId());

        // Alice rolls 6 (2nd)
        state = engine.processAction(state, player1, new SnakeAction(SnakeAction.ROLL_DICE, 6)).getNewState();
        assertEquals("p1", ((SnakeState) state).getDetails().getCurrentPlayerId());

        // Alice rolls 6 (3rd) -> penalty: turn passes to Bob!
        GameResult thirdRoll = engine.processAction(state, player1, new SnakeAction(SnakeAction.ROLL_DICE, 6));
        assertTrue(thirdRoll.isSuccessful());
        SnakeState newState = (SnakeState) thirdRoll.getNewState();

        assertEquals("p2", newState.getDetails().getCurrentPlayerId());
        assertEquals(0, newState.getDetails().getConsecutiveSixes());
    }

    @Test
    @DisplayName("shouldStayInPlaceWhenRollExceedsOneHundred")
    void shouldStayInPlaceWhenRollExceedsOneHundred() {
        GameState<SnakeState.Details> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        SnakeState sState = (SnakeState) state;
        sState.getDetails().getPlayers().get("p1").setPosition(97);

        // Alice rolls 5 -> 97 + 5 = 102 > 100 -> cannot move!
        GameResult result = engine.processAction(sState, player1, new SnakeAction(SnakeAction.ROLL_DICE, 5));
        assertTrue(result.isSuccessful());
        SnakeState newState = (SnakeState) result.getNewState();

        assertEquals(97, newState.getDetails().getPlayers().get("p1").getPosition());
    }

    @Test
    @DisplayName("shouldWinMatchWhenReachingOneHundred")
    void shouldWinMatchWhenReachingOneHundred() {
        GameState<SnakeState.Details> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        SnakeState sState = (SnakeState) state;
        sState.getDetails().getPlayers().get("p1").setPosition(95);

        // Alice rolls 5 -> 95 + 5 = 100 -> WINNER!
        GameResult result = engine.processAction(sState, player1, new SnakeAction(SnakeAction.ROLL_DICE, 5));
        assertTrue(result.isSuccessful());
        SnakeState newState = (SnakeState) result.getNewState();

        assertEquals(100, newState.getDetails().getPlayers().get("p1").getPosition());
        assertEquals(GameStatus.FINISHED, newState.getStatus());
        assertEquals("p1", newState.getWinner());
    }

    @Test
    @DisplayName("shouldRejectRollFromWrongPlayer")
    void shouldRejectRollFromWrongPlayer() {
        GameState<SnakeState.Details> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        
        // Bob tries to roll during Alice's turn
        GameResult result = engine.processAction(state, player2, new SnakeAction(SnakeAction.ROLL_DICE, 3));
        assertFalse(result.isSuccessful());
        assertEquals(ErrorCodes.NOT_YOUR_TURN, result.getErrorCode());
    }

    @Test
    @DisplayName("shouldDeclareRemainingPlayerWinnerOnDisconnect")
    void shouldDeclareRemainingPlayerWinnerOnDisconnect() {
        GameState<SnakeState.Details> state = engine.createGame("snake-1", List.of(player1, player2), engine.defaultConfiguration());
        
        GameResult disconnectResult = engine.onPlayerDisconnect(state, player1);
        assertTrue(disconnectResult.isSuccessful());
        SnakeState newState = (SnakeState) disconnectResult.getNewState();

        assertEquals(GameStatus.FINISHED, newState.getStatus());
        assertEquals("p2", newState.getWinner());
    }
}
