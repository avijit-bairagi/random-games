package com.example.gameplatform.game.callbridge;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.game.core.GameResult;
import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import com.example.gameplatform.player.model.Player;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CallBridgeGameEngineTest {

    private CallBridgeGameEngine engine;
    private Player p1, p2, p3, p4;
    private List<Player> players;

    @BeforeEach
    void setUp() {
        engine = new CallBridgeGameEngine();
        p1 = Player.create("p1", "Alice");
        p2 = Player.create("p2", "Bob");
        p3 = Player.create("p3", "Charlie");
        p4 = Player.create("p4", "Diana");
        players = List.of(p1, p2, p3, p4);
    }

    @Test
    @DisplayName("shouldInitializeGameWith4PlayersAnd13CardsEach")
    void shouldInitializeGameWith4PlayersAnd13CardsEach() {
        GameState<CallBridgeState.Details> state = engine.createGame("cb-1", players, engine.defaultConfiguration());

        assertEquals("CALL_BRIDGE", state.getGameType());
        assertEquals("Call Bridge", engine.displayName());
        assertEquals(4, engine.minPlayers());
        assertEquals(4, engine.maxPlayers());
        assertTrue(engine.isSpectatorAllowed());
        assertFalse(engine.isLateJoinAllowed());
        assertEquals(GameStatus.IN_PROGRESS, state.getStatus());

        CallBridgeState.Details details = state.getDetails();
        assertEquals(CallBridgeState.Details.PHASE_BIDDING, details.getPhase());
        assertEquals(1, details.getCurrentRound());
        assertEquals(5, details.getTotalRounds());
        assertEquals("p1", details.getCurrentPlayerId());
        assertEquals("p1", details.getStarterPlayerId());
        assertEquals("p4", details.getDealerId());

        assertEquals(4, details.getHands().size());
        for (String pId : List.of("p1", "p2", "p3", "p4")) {
            assertEquals(13, details.getHands().get(pId).size());
            assertEquals(0, details.getTricksWon().get(pId));
            assertEquals(0.0, details.getTotalScores().get(pId));
        }
    }

    @Test
    @DisplayName("shouldFailWhenPlayerCountNot4")
    void shouldFailWhenPlayerCountNot4() {
        assertThrows(IllegalArgumentException.class, () ->
                engine.createGame("cb-invalid", List.of(p1, p2), engine.defaultConfiguration()));
    }

    @Test
    @DisplayName("shouldRejectBidOutOfTurn")
    void shouldRejectBidOutOfTurn() {
        GameState<?> state = engine.createGame("cb-1", players, engine.defaultConfiguration());
        GameResult res = engine.processAction(state, p2, CallBridgeAction.bid(3));

        assertFalse(res.isSuccessful());
        assertEquals(ErrorCodes.NOT_YOUR_TURN, res.getErrorCode());
    }

    @Test
    @DisplayName("shouldRejectInvalidBidRange")
    void shouldRejectInvalidBidRange() {
        GameState<?> state = engine.createGame("cb-1", players, engine.defaultConfiguration());
        GameResult res0 = engine.processAction(state, p1, CallBridgeAction.bid(0));
        assertFalse(res0.isSuccessful());
        assertEquals(ErrorCodes.INVALID_ACTION, res0.getErrorCode());

        GameResult res14 = engine.processAction(state, p1, CallBridgeAction.bid(14));
        assertFalse(res14.isSuccessful());
        assertEquals(ErrorCodes.INVALID_ACTION, res14.getErrorCode());
    }

    @Test
    @DisplayName("shouldProgressThroughBiddingPhaseAndSwitchToPlayingPhase")
    void shouldProgressThroughBiddingPhaseAndSwitchToPlayingPhase() {
        GameState<?> s = engine.createGame("cb-1", players, engine.defaultConfiguration());

        // p1 bids 3
        s = engine.processAction(s, p1, CallBridgeAction.bid(3)).getNewState();
        assertEquals("p2", ((CallBridgeState) s).getDetails().getCurrentPlayerId());
        assertEquals(CallBridgeState.Details.PHASE_BIDDING, ((CallBridgeState) s).getDetails().getPhase());

        // p2 bids 2
        s = engine.processAction(s, p2, CallBridgeAction.bid(2)).getNewState();
        assertEquals("p3", ((CallBridgeState) s).getDetails().getCurrentPlayerId());

        // p3 bids 4
        s = engine.processAction(s, p3, CallBridgeAction.bid(4)).getNewState();
        assertEquals("p4", ((CallBridgeState) s).getDetails().getCurrentPlayerId());

        // p4 bids 4
        GameResult r4 = engine.processAction(s, p4, CallBridgeAction.bid(4));
        assertTrue(r4.isSuccessful());

        CallBridgeState finalBiddedState = (CallBridgeState) r4.getNewState();
        assertEquals(CallBridgeState.Details.PHASE_PLAYING, finalBiddedState.getDetails().getPhase());
        assertEquals("p1", finalBiddedState.getDetails().getCurrentPlayerId());
        assertEquals(1, finalBiddedState.getDetails().getTrickNumber());
        assertEquals(3, finalBiddedState.getDetails().getBids().get("p1"));
        assertEquals(2, finalBiddedState.getDetails().getBids().get("p2"));
        assertEquals(4, finalBiddedState.getDetails().getBids().get("p3"));
        assertEquals(4, finalBiddedState.getDetails().getBids().get("p4"));
    }

    @Test
    @DisplayName("shouldRejectPlayingCardDuringBiddingPhase")
    void shouldRejectPlayingCardDuringBiddingPhase() {
        GameState<?> s = engine.createGame("cb-1", players, engine.defaultConfiguration());
        Card card = ((CallBridgeState) s).getDetails().getHands().get("p1").get(0);

        GameResult res = engine.processAction(s, p1, CallBridgeAction.playCard(card));
        assertFalse(res.isSuccessful());
        assertEquals(ErrorCodes.INVALID_ACTION, res.getErrorCode());
    }

    @Test
    @DisplayName("shouldEnforceFollowingLeadSuit")
    void shouldEnforceFollowingLeadSuit() {
        CallBridgeState s = (CallBridgeState) engine.createGame("cb-1", players, engine.defaultConfiguration());
        // Set up custom controlled hands
        Map<String, List<Card>> hands = new HashMap<>();
        hands.put("p1", new ArrayList<>(List.of(new Card(Card.HEARTS, "A", 14), new Card(Card.SPADES, "K", 13))));
        hands.put("p2", new ArrayList<>(List.of(new Card(Card.HEARTS, "10", 10), new Card(Card.DIAMONDS, "A", 14))));
        hands.put("p3", new ArrayList<>(List.of(new Card(Card.SPADES, "2", 2), new Card(Card.CLUBS, "A", 14)))); // Void in hearts
        hands.put("p4", new ArrayList<>(List.of(new Card(Card.HEARTS, "2", 2), new Card(Card.SPADES, "A", 14))));

        s.getDetails().setHands(hands);
        s.getDetails().setPhase(CallBridgeState.Details.PHASE_PLAYING);
        s.getDetails().setCurrentPlayerId("p1");

        // p1 plays Hearts A (leads Hearts)
        GameState<?> s1 = engine.processAction(s, p1, CallBridgeAction.playCard(new Card(Card.HEARTS, "A", 14))).getNewState();
        assertEquals("p2", ((CallBridgeState) s1).getDetails().getCurrentPlayerId());
        assertEquals(Card.HEARTS, ((CallBridgeState) s1).getDetails().getLeadSuit());

        // p2 tries to play Diamonds A while holding Hearts 10 -> should fail
        GameResult illegalPlay = engine.processAction(s1, p2, CallBridgeAction.playCard(new Card(Card.DIAMONDS, "A", 14)));
        assertFalse(illegalPlay.isSuccessful());
        assertEquals(ErrorCodes.INVALID_MOVE, illegalPlay.getErrorCode());

        // p2 plays legal Hearts 10
        GameState<?> s2 = engine.processAction(s1, p2, CallBridgeAction.playCard(new Card(Card.HEARTS, "10", 10))).getNewState();
        assertEquals("p3", ((CallBridgeState) s2).getDetails().getCurrentPlayerId());

        // p3 has no hearts -> can legally play Spades 2 (trump) or Clubs A
        GameResult p3Trump = engine.processAction(s2, p3, CallBridgeAction.playCard(new Card(Card.SPADES, "2", 2)));
        assertTrue(p3Trump.isSuccessful());
    }

    @Test
    @DisplayName("shouldDetermineTrickWinnerWithSpadesTrump")
    void shouldDetermineTrickWinnerWithSpadesTrump() {
        CallBridgeState s = (CallBridgeState) engine.createGame("cb-1", players, engine.defaultConfiguration());
        Map<String, List<Card>> hands = new HashMap<>();
        hands.put("p1", new ArrayList<>(List.of(new Card(Card.HEARTS, "A", 14))));
        hands.put("p2", new ArrayList<>(List.of(new Card(Card.HEARTS, "K", 13))));
        hands.put("p3", new ArrayList<>(List.of(new Card(Card.SPADES, "2", 2)))); // Trumps with Spade 2
        hands.put("p4", new ArrayList<>(List.of(new Card(Card.HEARTS, "Q", 12))));

        s.getDetails().setHands(hands);
        s.getDetails().setPhase(CallBridgeState.Details.PHASE_PLAYING);
        s.getDetails().setCurrentPlayerId("p1");

        GameState<?> s1 = engine.processAction(s, p1, CallBridgeAction.playCard(new Card(Card.HEARTS, "A", 14))).getNewState();
        GameState<?> s2 = engine.processAction(s1, p2, CallBridgeAction.playCard(new Card(Card.HEARTS, "K", 13))).getNewState();
        GameState<?> s3 = engine.processAction(s2, p3, CallBridgeAction.playCard(new Card(Card.SPADES, "2", 2))).getNewState();
        GameResult res4 = engine.processAction(s3, p4, CallBridgeAction.playCard(new Card(Card.HEARTS, "Q", 12)));

        assertTrue(res4.isSuccessful());
        CallBridgeState stateAfterTrick = (CallBridgeState) res4.getNewState();

        // p3 trumped with spade, so p3 wins trick!
        assertEquals("p3", stateAfterTrick.getDetails().getLastTrickWinner());
        assertEquals(1, stateAfterTrick.getDetails().getTricksWon().get("p3"));
        assertEquals("p3", stateAfterTrick.getDetails().getCurrentPlayerId()); // p3 leads next
        assertEquals(2, stateAfterTrick.getDetails().getTrickNumber());
    }

    @Test
    @DisplayName("shouldDetermineTrickWinnerWithLeadSuitWhenNoSpades")
    void shouldDetermineTrickWinnerWithLeadSuitWhenNoSpades() {
        CallBridgeState s = (CallBridgeState) engine.createGame("cb-1", players, engine.defaultConfiguration());
        Map<String, List<Card>> hands = new HashMap<>();
        hands.put("p1", new ArrayList<>(List.of(new Card(Card.CLUBS, "10", 10))));
        hands.put("p2", new ArrayList<>(List.of(new Card(Card.CLUBS, "A", 14))));
        hands.put("p3", new ArrayList<>(List.of(new Card(Card.CLUBS, "K", 13))));
        hands.put("p4", new ArrayList<>(List.of(new Card(Card.CLUBS, "2", 2))));

        s.getDetails().setHands(hands);
        s.getDetails().setPhase(CallBridgeState.Details.PHASE_PLAYING);
        s.getDetails().setCurrentPlayerId("p1");

        GameState<?> s1 = engine.processAction(s, p1, CallBridgeAction.playCard(new Card(Card.CLUBS, "10", 10))).getNewState();
        GameState<?> s2 = engine.processAction(s1, p2, CallBridgeAction.playCard(new Card(Card.CLUBS, "A", 14))).getNewState();
        GameState<?> s3 = engine.processAction(s2, p3, CallBridgeAction.playCard(new Card(Card.CLUBS, "K", 13))).getNewState();
        GameResult res4 = engine.processAction(s3, p4, CallBridgeAction.playCard(new Card(Card.CLUBS, "2", 2)));

        assertTrue(res4.isSuccessful());
        CallBridgeState stateAfterTrick = (CallBridgeState) res4.getNewState();

        // p2 played highest Club (Ace = 14) -> p2 wins
        assertEquals("p2", stateAfterTrick.getDetails().getLastTrickWinner());
        assertEquals(1, stateAfterTrick.getDetails().getTricksWon().get("p2"));
        assertEquals("p2", stateAfterTrick.getDetails().getCurrentPlayerId());
    }

    @Test
    @DisplayName("shouldCalculateRoundScoreAndAdvanceRoundsOrFinish")
    void shouldCalculateRoundScoreAndAdvanceRoundsOrFinish() {
        // 1-round configuration
        CallBridgeConfiguration config = new CallBridgeConfiguration(1);
        CallBridgeState s = (CallBridgeState) engine.createGame("cb-1", players, config);

        Map<String, Integer> bids = new HashMap<>();
        bids.put("p1", 3);
        bids.put("p2", 4);
        bids.put("p3", 3);
        bids.put("p4", 3);
        s.getDetails().setBids(bids);
        s.getDetails().setPhase(CallBridgeState.Details.PHASE_PLAYING);
        s.getDetails().setTrickNumber(13); // Last trick of round

        // p1 has 3 won, p2 has 3 won (bid 4 -> fail), p3 has 4 won (bid 3 -> 3.1), p4 has 2 won (will win trick 13 -> 3 won -> 3.0)
        s.getDetails().getTricksWon().put("p1", 3);
        s.getDetails().getTricksWon().put("p2", 3);
        s.getDetails().getTricksWon().put("p3", 4);
        s.getDetails().getTricksWon().put("p4", 2);

        Map<String, List<Card>> hands = new HashMap<>();
        hands.put("p1", new ArrayList<>(List.of(new Card(Card.DIAMONDS, "2", 2))));
        hands.put("p2", new ArrayList<>(List.of(new Card(Card.DIAMONDS, "3", 3))));
        hands.put("p3", new ArrayList<>(List.of(new Card(Card.DIAMONDS, "4", 4))));
        hands.put("p4", new ArrayList<>(List.of(new Card(Card.DIAMONDS, "A", 14))));
        s.getDetails().setHands(hands);
        s.getDetails().setCurrentPlayerId("p1");

        GameState<?> s1 = engine.processAction(s, p1, CallBridgeAction.playCard(new Card(Card.DIAMONDS, "2", 2))).getNewState();
        GameState<?> s2 = engine.processAction(s1, p2, CallBridgeAction.playCard(new Card(Card.DIAMONDS, "3", 3))).getNewState();
        GameState<?> s3 = engine.processAction(s2, p3, CallBridgeAction.playCard(new Card(Card.DIAMONDS, "4", 4))).getNewState();
        GameResult res4 = engine.processAction(s3, p4, CallBridgeAction.playCard(new Card(Card.DIAMONDS, "A", 14)));

        assertTrue(res4.isSuccessful());
        CallBridgeState finalState = (CallBridgeState) res4.getNewState();

        assertEquals(GameStatus.FINISHED, finalState.getStatus());
        assertEquals(CallBridgeState.Details.PHASE_GAME_OVER, finalState.getDetails().getPhase());

        // p1: bid 3, won 3 -> 3.0
        // p2: bid 4, won 3 -> -4.0
        // p3: bid 3, won 4 -> 3.1
        // p4: bid 3, won 3 -> 3.0
        assertEquals(3.0, finalState.getDetails().getTotalScores().get("p1"));
        assertEquals(-4.0, finalState.getDetails().getTotalScores().get("p2"));
        assertEquals(3.1, finalState.getDetails().getTotalScores().get("p3"));
        assertEquals(3.0, finalState.getDetails().getTotalScores().get("p4"));
        assertEquals("p3", finalState.getWinner()); // Highest total score
    }

    @Test
    @DisplayName("shouldHandlePlayerDisconnectForfeit")
    void shouldHandlePlayerDisconnectForfeit() {
        CallBridgeState s = (CallBridgeState) engine.createGame("cb-1", players, engine.defaultConfiguration());
        s.getDetails().getTotalScores().put("p1", 5.0);
        s.getDetails().getTotalScores().put("p2", 8.2);
        s.getDetails().getTotalScores().put("p3", 3.0);
        s.getDetails().getTotalScores().put("p4", 1.0);

        GameResult res = engine.onPlayerDisconnect(s, p1);
        assertTrue(res.isSuccessful());
        assertEquals(GameStatus.FINISHED, res.getNewState().getStatus());
        assertEquals("p2", res.getNewState().getWinner()); // p2 had highest score among remaining
    }

    @Test
    @DisplayName("shouldParseActionAndConfigurationCorrectly")
    void shouldParseActionAndConfigurationCorrectly() {
        Map<String, Object> bidRaw = Map.of("action", "BID", "bid", 4);
        CallBridgeAction bidAction = engine.parseAction(bidRaw);
        assertEquals("BID", bidAction.getActionType());
        assertEquals(4, bidAction.getBid());

        Map<String, Object> playRaw = Map.of(
                "action", "PLAY_CARD",
                "card", Map.of("suit", "SPADES", "rank", "A", "value", 14)
        );
        CallBridgeAction playAction = engine.parseAction(playRaw);
        assertEquals("PLAY_CARD", playAction.getActionType());
        assertNotNull(playAction.getCard());
        assertEquals("SPADES", playAction.getCard().getSuit());
        assertEquals("A", playAction.getCard().getRank());
        assertEquals(14, playAction.getCard().getValue());

        Map<String, Object> cfgRaw = Map.of("totalRounds", 3);
        CallBridgeConfiguration config = engine.parseConfiguration(cfgRaw);
        assertEquals(3, config.getTotalRounds());
    }
}
