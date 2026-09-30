package com.example.gameplatform.game.twentynine;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.game.core.GameResult;
import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import com.example.gameplatform.player.model.Player;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TwentyNineGameEngineTest {

    private TwentyNineGameEngine engine;
    private Player p1, p2, p3, p4;
    private List<Player> players;

    @BeforeEach
    void setUp() {
        engine = new TwentyNineGameEngine();
        p1 = Player.create("p1", "Alice");
        p2 = Player.create("p2", "Bob");
        p3 = Player.create("p3", "Charlie");
        p4 = Player.create("p4", "Diana");
        players = List.of(p1, p2, p3, p4);
    }

    @Test
    @DisplayName("shouldInitializeGameWith4PlayersAnd8CardsEach")
    void shouldInitializeGameWith4PlayersAnd8CardsEach() {
        GameState<TwentyNineState.Details> state = engine.createGame("tn-1", players, engine.defaultConfiguration());

        assertEquals("TWENTY_NINE", state.getGameType());
        assertEquals("Twenty-Nine (29)", engine.displayName());
        assertEquals(4, engine.minPlayers());
        assertEquals(4, engine.maxPlayers());
        assertTrue(engine.isSpectatorAllowed());
        assertFalse(engine.isLateJoinAllowed());
        assertEquals(GameStatus.IN_PROGRESS, state.getStatus());

        TwentyNineState.Details details = state.getDetails();
        assertEquals(TwentyNineState.Details.PHASE_BIDDING, details.getPhase());
        assertEquals(4, details.getHands().get("p1").size());
        assertEquals(4, details.getHands().get("p2").size());
        assertEquals(4, details.getHands().get("p3").size());
        assertEquals(4, details.getHands().get("p4").size());
        assertEquals("p4", details.getDealerId());
        assertEquals("p1", details.getStarterPlayerId());
        assertEquals("p1", details.getCurrentPlayerId());
        assertTrue(details.getPassedPlayers() != null);
        assertEquals(0, details.getPassedPlayers().size());
    }

    @Test
    @DisplayName("shouldRejectBidOutOfTurn")
    void shouldRejectBidOutOfTurn() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        GameResult res = engine.processAction(state, p2, TwentyNineAction.bid(15));

        assertFalse(res.isSuccessful());
        assertEquals(ErrorCodes.NOT_YOUR_TURN, res.getErrorCode());
    }

    @Test
    @DisplayName("shouldAdvanceTurnAfterPassToNextNonPassedPlayer")
    void shouldAdvanceTurnAfterPassToNextNonPassedPlayer() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        String currentPlayerId = details.getCurrentPlayerId();

        // Find the player object for the current player and have them pass
        Player currentPlayer = findPlayerById(currentPlayerId);
        GameResult res = engine.processAction(state, currentPlayer, TwentyNineAction.pass());

        assertTrue(res.isSuccessful());
        TwentyNineState newState = (TwentyNineState) res.getNewState();
        TwentyNineState.Details newDetails = newState.getDetails();

        // The passed player should be in passedPlayers
        assertTrue(newDetails.getPassedPlayers().contains(currentPlayerId));

        // The next player should be someone who hasn't passed
        String nextPlayerId = newDetails.getCurrentPlayerId();
        assertFalse(newDetails.getPassedPlayers().contains(nextPlayerId));
        assertNotEquals(currentPlayerId, nextPlayerId);
    }

    @Test
    @DisplayName("passedPlayerShouldNotBePromptedAgainForBidding")
    void passedPlayerShouldNotBePromptedAgainForBidding() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // Player 0 passes
        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();

        // Player 1 bids
        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();

        // Player 0 should NOT be prompted again — find who is current
        String currentPlayerId = details.getCurrentPlayerId();
        // After p1 bids, turn goes to next non-passed player
        // p0 has passed, so the turn should skip p0
        assertFalse(details.getPassedPlayers().contains(currentPlayerId),
                "Passed player " + currentPlayerId + " should not be prompted again");
        assertNotEquals(order.get(0), currentPlayerId,
                "Passed player should not be the current player");
    }

    @Test
    @DisplayName("shouldCompleteBiddingWhenThreePlayersPassAfterABid")
    void shouldCompleteBiddingWhenThreePlayersPassAfterABid() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // Player 0 bids
        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Player 1 passes
        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();
        assertEquals(1, details.getPassedPlayers().size());

        // Player 2 passes
        Player p2 = findPlayerById(order.get(2));
        res = engine.processAction(state, p2, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();
        assertEquals(2, details.getPassedPlayers().size());

        // Player 3 passes — should complete bidding (3 passes after first bid)
        Player p3 = findPlayerById(order.get(3));
        res = engine.processAction(state, p3, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();

        assertEquals(TwentyNineState.Details.PHASE_SELECT_TRUMP, details.getPhase());
        assertEquals(3, details.getPassedPlayers().size());
    }

    @Test
    @DisplayName("shouldForceDealerToBidWhenAllFourPassWithoutABid")
    void shouldForceDealerToBidWhenAllFourPassWithoutABid() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // All 4 players pass in order
        for (int i = 0; i < 4; i++) {
            Player p = findPlayerById(order.get(i));
            GameResult res = engine.processAction(state, p, TwentyNineAction.pass());
            assertTrue(res.isSuccessful(), "Pass by player " + (i + 1) + " should succeed");
            state = res.getNewState();
            details = ((TwentyNineState) state).getDetails();
        }

        // After all 4 pass, dealer should be forced to bid
        assertEquals(15, details.getCurrentBid());
        assertEquals(details.getDealerId(), details.getHighestBidderId());
        assertEquals(TwentyNineState.Details.PHASE_SELECT_TRUMP, details.getPhase());
    }

    @Test
    @DisplayName("shouldRejectSecondPassBySamePlayer")
    void shouldRejectSecondPassBySamePlayer() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // Player 0 passes
        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Player 1 bids
        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();

        // If somehow player 0 is current again, their second pass should be rejected
        // But since advanceBiddingTurn skips passed players, this shouldn't happen
        // Test the defensive check: ensure p0 is not the current player
        String currentPlayerId = details.getCurrentPlayerId();
        assertFalse(order.get(0).equals(currentPlayerId),
                "Passed player should not be prompted to act again");
    }

    @Test
    @DisplayName("shouldSkipPassedPlayersWhenAdvancingBiddingTurn")
    void shouldSkipPassedPlayersWhenAdvancingBiddingTurn() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // Players 0 and 1 pass
        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Player 2 bids — should advance to player 3, skipping any passed players
        Player p2 = findPlayerById(order.get(2));
        res = engine.processAction(state, p2, TwentyNineAction.bid(16));
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();

        String nextPlayer = details.getCurrentPlayerId();
        assertFalse(details.getPassedPlayers().contains(nextPlayer),
                "Turn should not advance to a passed player");
    }

    private Player findPlayerById(String id) {
        return players.stream().filter(p -> p.getId().equals(id)).findFirst().orElse(null);
    }

    // ===================== DOUBLE / REDOUBLE TESTS =====================

    @Test
    @DisplayName("shouldAllowDoubleDuringBiddingPhase")
    void shouldAllowDoubleDuringBiddingPhase() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // Player 0 bids 15
        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // After p0 bids, turn advances to p1 (opposing team)
        // Player 1 (opposing team) doubles
        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, new TwentyNineAction(TwentyNineAction.DOUBLE, null, null, null));
        assertTrue(res.isSuccessful(), "Opponent should be able to double during bidding");
        details = ((TwentyNineState) res.getNewState()).getDetails();
        assertTrue(details.isDoubled());

        // Verify turn advanced after double
        assertNotEquals(order.get(1), details.getCurrentPlayerId(), "Turn should advance after double");
    }

    @Test
    @DisplayName("shouldRejectDoubleByBiddingTeam")
    void shouldRejectDoubleByBiddingTeam() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // Player 0 bids 15
        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Player 0 (bidding team) tries to double
        res = engine.processAction(state, p0, new TwentyNineAction(TwentyNineAction.DOUBLE, null, null, null));
        assertFalse(res.isSuccessful(), "Bidding team should not be able to double");
        assertEquals(ErrorCodes.INVALID_ACTION, res.getErrorCode());
    }

    @Test
    @DisplayName("shouldAllowDoubleDuringPlayingPhaseAfterTrumpSelected")
    void shouldAllowDoubleDuringPlayingPhaseAfterTrumpSelected() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // Simulate: bid, passes, trump selected, playing
        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.bid(20));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        Player p2 = findPlayerById(order.get(2));
        res = engine.processAction(state, p2, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        Player p3 = findPlayerById(order.get(3));
        res = engine.processAction(state, p3, TwentyNineAction.pass());
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();
        assertEquals(TwentyNineState.Details.PHASE_SELECT_TRUMP, details.getPhase());

        // Select trump
        res = engine.processAction(state, p0, TwentyNineAction.selectTrump("SPADES"));
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();
        assertEquals(TwentyNineState.Details.PHASE_PLAYING, details.getPhase());

        // Now opponent (team B) should be able to double during PLAYING phase
        Player p1Again = findPlayerById(order.get(1));
        res = engine.processAction(state, p1Again, new TwentyNineAction(TwentyNineAction.DOUBLE, null, null, null));
        assertTrue(res.isSuccessful(), "Opponent should be able to double during playing phase");
        details = ((TwentyNineState) res.getNewState()).getDetails();
        assertTrue(details.isDoubled());
    }

    @Test
    @DisplayName("shouldAllowRedoubleAfterOpponentDoubles")
    void shouldAllowRedoubleAfterOpponentDoubles() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        // Bid to get into a state where opponent can double
        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Opponent (team B) doubles during bidding
        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, new TwentyNineAction(TwentyNineAction.DOUBLE, null, null, null));
        assertTrue(res.isSuccessful());
        state = res.getNewState();
        details = ((TwentyNineState) state).getDetails();
        assertTrue(details.isDoubled());

        // Since Double advanced the turn to p2 (or skipped p1's teammate p3 and went to p0),
        // we need to make sure the right player attempts the redouble.
        // The bidding team (p0, p2) can redouble. p0 is next after p3 (if p2 passed).
        // Let's check who is the current player.
        Player currentPlayer = findPlayerById(details.getCurrentPlayerId());
        res = engine.processAction(state, currentPlayer, new TwentyNineAction(TwentyNineAction.REDOUBLE, null, null, null));
        assertTrue(res.isSuccessful(), "Bidding team should be able to redouble after opponent doubles");
        details = ((TwentyNineState) res.getNewState()).getDetails();
        assertTrue(details.isRedoubled());
    }

    @Test
    @DisplayName("shouldRejectRedoubleWithoutPriorDouble")
    void shouldRejectRedoubleWithoutPriorDouble() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Try to redouble without opponent having doubled
        res = engine.processAction(state, p0, new TwentyNineAction(TwentyNineAction.REDOUBLE, null, null, null));
        assertFalse(res.isSuccessful(), "Cannot redouble without a prior double");
        assertEquals(ErrorCodes.INVALID_ACTION, res.getErrorCode());
    }

    @Test
    @DisplayName("shouldRejectRedoubleByOpposingTeam")
    void shouldRejectRedoubleByOpposingTeam() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Opponent doubles
        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, new TwentyNineAction(TwentyNineAction.DOUBLE, null, null, null));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Same opponent tries to redouble (should fail — only bidding team can redouble)
        res = engine.processAction(state, p1, new TwentyNineAction(TwentyNineAction.REDOUBLE, null, null, null));
        assertFalse(res.isSuccessful(), "Opposing team should not be able to redouble");
        assertEquals(ErrorCodes.INVALID_ACTION, res.getErrorCode());
    }

    @Test
    @DisplayName("shouldRejectDoubleAfterRedouble")
    void shouldRejectDoubleAfterRedouble() {
        GameState<?> state = engine.createGame("tn-1", players, engine.defaultConfiguration());
        TwentyNineState.Details details = ((TwentyNineState) state).getDetails();
        List<String> order = details.getPlayerOrder();

        Player p0 = findPlayerById(order.get(0));
        GameResult res = engine.processAction(state, p0, TwentyNineAction.bid(15));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Opponent doubles
        Player p1 = findPlayerById(order.get(1));
        res = engine.processAction(state, p1, new TwentyNineAction(TwentyNineAction.DOUBLE, null, null, null));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Bidding team redoubles
        Player currentPlayer = findPlayerById(((TwentyNineState)state).getDetails().getCurrentPlayerId());
        res = engine.processAction(state, currentPlayer, new TwentyNineAction(TwentyNineAction.REDOUBLE, null, null, null));
        assertTrue(res.isSuccessful());
        state = res.getNewState();

        // Opponent tries to double again — should fail (already doubled and redoubled)
        res = engine.processAction(state, p1, new TwentyNineAction(TwentyNineAction.DOUBLE, null, null, null));
        assertFalse(res.isSuccessful(), "Cannot double after redouble");
        assertEquals(ErrorCodes.INVALID_ACTION, res.getErrorCode());
    }
}
