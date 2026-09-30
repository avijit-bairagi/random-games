package com.example.gameplatform.game.twentynine;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.game.core.GameEngine;
import com.example.gameplatform.game.core.GameEvent;
import com.example.gameplatform.game.core.GameResult;
import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import com.example.gameplatform.player.model.Player;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

@Component
public class TwentyNineGameEngine implements GameEngine<TwentyNineState.Details, TwentyNineAction, TwentyNineConfiguration> {

    private static final Logger log = LoggerFactory.getLogger(TwentyNineGameEngine.class);

    public static final String GAME_TYPE = "TWENTY_NINE";

    // 29 deck: 8 cards per suit, ranked J(3pts), 9(2pts), A(1pt), 10(1pt), K(0), Q(0), 8(0), 7(0)
    // trickRank: J=8, 9=7, A=6, 10=5, K=4, Q=3, 8=2, 7=1
    private static final String[] SUITS = {TwentyNineCard.HEARTS, TwentyNineCard.DIAMONDS, TwentyNineCard.CLUBS, TwentyNineCard.SPADES};
    private static final String[] RANKS = {"J", "9", "A", "10", "K", "Q", "8", "7"};
    private static final int[] POINTS = {3, 2, 1, 1, 0, 0, 0, 0};
    private static final int[] TRICK_RANKS = {8, 7, 6, 5, 4, 3, 2, 1};

    // Teams: A = playerOrder[0] + playerOrder[2], B = playerOrder[1] + playerOrder[3]
    private static final String TEAM_A = "A";
    private static final String TEAM_B = "B";

    private final Random random;

    public TwentyNineGameEngine() { this(new Random()); }
    public TwentyNineGameEngine(Random random) { this.random = random; }

    @Override public String gameType() { return GAME_TYPE; }
    @Override public String displayName() { return "Twenty-Nine (29)"; }
    @Override public int minPlayers() { return 4; }
    @Override public int maxPlayers() { return 4; }
    @Override public boolean isSpectatorAllowed() { return true; }
    @Override public boolean isLateJoinAllowed() { return false; }
    @Override public TwentyNineConfiguration defaultConfiguration() { return new TwentyNineConfiguration(6); }

    @Override
    public GameState<TwentyNineState.Details> createGame(String gameId, List<Player> players, TwentyNineConfiguration configuration) {
        if (players.size() != 4) throw new IllegalArgumentException("Twenty-Nine requires exactly 4 players");

        int targetGamePoints = configuration != null ? configuration.getTargetGamePoints() : 6;

        List<String> playerOrder = new ArrayList<>();
        for (Player p : players) playerOrder.add(p.getId());

        // Dealer is last player; bidding starts left of dealer
        String dealerId = playerOrder.get(3);
        String starterPlayerId = playerOrder.get(0); // left of dealer

        // First deal: 4 cards each
        Map<String, List<TwentyNineCard>> hands = dealFirstFour(playerOrder);

        Map<String, Integer> gamePoints = new HashMap<>();
        gamePoints.put(TEAM_A, 0);
        gamePoints.put(TEAM_B, 0);

        Map<String, Integer> roundCardPoints = new HashMap<>();
        roundCardPoints.put(TEAM_A, 0);
        roundCardPoints.put(TEAM_B, 0);

        TwentyNineState.Details details = TwentyNineState.Details.builder()
                .phase(TwentyNineState.Details.PHASE_BIDDING)
                .playerOrder(playerOrder)
                .dealerId(dealerId)
                .starterPlayerId(starterPlayerId)
                .currentPlayerId(starterPlayerId)
                .currentBid(14) // bids must be > 14, so first valid bid is 15
                .highestBidderId(null)
                .consecutivePasses(0)
                .passedPlayers(new HashSet<>())
                .doubled(false)
                .redoubled(false)
                .doublerPlayerId(null)
                .trumpSuit(null)
                .trumpRevealed(false)
                .hands(hands)
                .secondDealDone(false)
                .currentTrick(new ArrayList<>())
                .leadSuit(null)
                .trickNumber(1)
                .lastTrick(new ArrayList<>())
                .lastTrickWinner(null)
                .roundCardPoints(roundCardPoints)
                .gamePoints(gamePoints)
                .targetGamePoints(targetGamePoints)
                .trumpRequestPending(false)
                .trumpRequesterPlayerId(null)
                .build();

        return TwentyNineState.builder()
                .gameId(gameId)
                .status(GameStatus.IN_PROGRESS)
                .players(playerOrder)
                .winner(null)
                .sequence(0)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();
    }

    private List<TwentyNineCard> buildDeck() {
        List<TwentyNineCard> deck = new ArrayList<>(32);
        for (String suit : SUITS) {
            for (int i = 0; i < RANKS.length; i++) {
                deck.add(new TwentyNineCard(suit, RANKS[i], POINTS[i], TRICK_RANKS[i]));
            }
        }
        return deck;
    }

    private Map<String, List<TwentyNineCard>> dealFirstFour(List<String> playerOrder) {
        List<TwentyNineCard> deck = buildDeck();
        Collections.shuffle(deck, random);
        Map<String, List<TwentyNineCard>> hands = new HashMap<>();
        for (int i = 0; i < 4; i++) {
            List<TwentyNineCard> hand = new ArrayList<>(deck.subList(i * 4, i * 4 + 4));
            sortHand(hand);
            hands.put(playerOrder.get(i), hand);
        }
        // Store remaining 16 cards in a special key for second deal
        List<TwentyNineCard> remaining = new ArrayList<>(deck.subList(16, 32));
        hands.put("__remaining__", remaining);
        return hands;
    }

    private void doSecondDeal(TwentyNineState.Details details) {
        List<String> playerOrder = details.getPlayerOrder();
        List<TwentyNineCard> remaining = details.getHands().remove("__remaining__");
        if (remaining == null) return;
        for (int i = 0; i < 4; i++) {
            List<TwentyNineCard> extra = new ArrayList<>(remaining.subList(i * 4, i * 4 + 4));
            details.getHands().get(playerOrder.get(i)).addAll(extra);
            sortHand(details.getHands().get(playerOrder.get(i)));
        }
        details.setSecondDealDone(true);
    }

    private void sortHand(List<TwentyNineCard> hand) {
        hand.sort((a, b) -> {
            int sc = Integer.compare(suitPriority(a.getSuit()), suitPriority(b.getSuit()));
            if (sc != 0) return sc;
            return Integer.compare(b.getTrickRank(), a.getTrickRank());
        });
    }

    private int suitPriority(String suit) {
        if (suit == null) return 0;
        return switch (suit.toUpperCase()) {
            case "SPADES" -> 1;
            case "HEARTS" -> 2;
            case "CLUBS" -> 3;
            case "DIAMONDS" -> 4;
            default -> 5;
        };
    }

    private String teamOf(String playerId, List<String> playerOrder) {
        int idx = playerOrder.indexOf(playerId);
        return (idx == 0 || idx == 2) ? TEAM_A : TEAM_B;
    }

    private String opposingTeam(String team) {
        return TEAM_A.equals(team) ? TEAM_B : TEAM_A;
    }

    @Override
    public GameResult processAction(GameState<?> state, Player player, TwentyNineAction action) {
        if (!(state instanceof TwentyNineState tnState)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Invalid state type");
        }
        if (tnState.getStatus() == GameStatus.FINISHED || tnState.getStatus() == GameStatus.CANCELLED) {
            return GameResult.failure(ErrorCodes.GAME_ALREADY_FINISHED, "Game is already finished");
        }

        TwentyNineState.Details details = tnState.getDetails();
        String actionType = action.getActionType();

        // DOUBLE and REDOUBLE don't require it to be your turn in the normal sense
        if (TwentyNineAction.DOUBLE.equalsIgnoreCase(actionType)) {
            return processDouble(tnState, player, action);
        }
        if (TwentyNineAction.REDOUBLE.equalsIgnoreCase(actionType)) {
            return processRedouble(tnState, player, action);
        }
        if (TwentyNineAction.CONTINUE.equalsIgnoreCase(actionType)) {
            return processContinue(tnState, player, action);
        }
        if (!player.getId().equals(details.getCurrentPlayerId())) {
            return GameResult.failure(ErrorCodes.NOT_YOUR_TURN, "It is not your turn");
        }

        return switch (actionType == null ? "" : actionType.toUpperCase()) {
            case TwentyNineAction.BID -> processBid(tnState, player, action);
            case TwentyNineAction.PASS -> processPass(tnState, player, action);
            case TwentyNineAction.SELECT_TRUMP -> processSelectTrump(tnState, player, action);
            case TwentyNineAction.PLAY_CARD -> processPlayCard(tnState, player, action);
            case TwentyNineAction.REQUEST_TRUMP -> processRequestTrump(tnState, player, action);
            default -> GameResult.failure(ErrorCodes.INVALID_ACTION, "Unknown action: " + actionType);
        };
    }

    // ===================== CONTINUE (advance from ROUND_END) =====================

    private GameResult processContinue(TwentyNineState state, Player player, TwentyNineAction action) {
        TwentyNineState.Details details = state.getDetails();
        if (!TwentyNineState.Details.PHASE_ROUND_END.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Not in round end phase");
        }
        details.setRoundSummary(null);
        List<GameEvent> events = new ArrayList<>();
        startNewRound(details, details.getPlayerOrder(), events, state.getGameId());
        TwentyNineState newState = TwentyNineState.builder()
                .gameId(state.getGameId())
                .status(state.getStatus())
                .players(state.getPlayers())
                .winner(state.getWinner())
                .sequence(state.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();
        return GameResult.success(newState, events);
    }

    // ===================== BIDDING =====================

    private GameResult processBid(TwentyNineState state, Player player, TwentyNineAction action) {
        TwentyNineState.Details details = state.getDetails();
        if (!TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Not in bidding phase");
        }
        Integer bid = action.getBid();
        if (bid == null || bid < 15 || bid > 28) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Bid must be between 15 and 28");
        }
        if (bid <= details.getCurrentBid()) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Bid must be higher than current bid of " + details.getCurrentBid());
        }

        // If a double is active and another player bids, the double is dismissed
        if (details.isDoubled()) {
            details.setDoubled(false);
            details.setDoublerPlayerId(null);
        }

        details.setCurrentBid(bid);
        details.setHighestBidderId(player.getId());
        details.setConsecutivePasses(0);
        // The bidding player is now active again — remove them from the passed set
        if (details.getPassedPlayers() != null) {
            details.getPassedPlayers().remove(player.getId());
        }

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("BID_PLACED", state.getGameId(), player.getId(), Map.of(
                "playerId", player.getId(), "bid", bid)));

        advanceBiddingTurn(details);
        return buildResult(state, events);
    }

    private GameResult processPass(TwentyNineState state, Player player, TwentyNineAction action) {
        TwentyNineState.Details details = state.getDetails();
        if (!TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Not in bidding phase");
        }

        // A player who has already passed should not be prompted again
        if (details.getPassedPlayers() != null && details.getPassedPlayers().contains(player.getId())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "You have already passed in this bidding round");
        }

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("BID_PASSED", state.getGameId(), player.getId(), Map.of("playerId", player.getId())));

        if (details.getPassedPlayers() == null) {
            details.setPassedPlayers(new HashSet<>());
        }
        details.getPassedPlayers().add(player.getId());
        details.setConsecutivePasses(details.getConsecutivePasses() + 1);

        // If no one has bid yet and all 4 pass, dealer must bid 15
        boolean nobodyBid = details.getHighestBidderId() == null;
        boolean allPassed = details.getPassedPlayers().size() >= 4;
        boolean threePassedAfterBid = details.getHighestBidderId() != null && details.getPassedPlayers().size() >= 3;

        if (allPassed && nobodyBid) {
            // Dealer forced to bid 15 — clear passed set since the dealer is now the active bidder
            details.setCurrentBid(15);
            details.setHighestBidderId(details.getDealerId());
            details.setConsecutivePasses(0);
            details.getPassedPlayers().clear();
            events.add(GameEvent.of("DEALER_FORCED_BID", state.getGameId(), details.getDealerId(), Map.of(
                    "playerId", details.getDealerId(), "bid", 15)));
            transitionToSelectTrump(details, events, state.getGameId());
        } else if (threePassedAfterBid) {
            // Bidding complete
            transitionToSelectTrump(details, events, state.getGameId());
        } else {
            advanceBiddingTurn(details);
        }

        return buildResult(state, events);
    }

    private void advanceBiddingTurn(TwentyNineState.Details details) {
        List<String> order = details.getPlayerOrder();
        Set<String> passed = details.getPassedPlayers();
        int idx = order.indexOf(details.getCurrentPlayerId());
        // Advance to the next player who has not yet passed
        for (int i = 1; i <= 4; i++) {
            String nextPlayerId = order.get((idx + i) % 4);
            if (passed == null || !passed.contains(nextPlayerId)) {
                details.setCurrentPlayerId(nextPlayerId);
                return;
            }
        }
        // All remaining players have passed — this shouldn't normally happen
        // because bidding ends before we get here, but guard against it
        details.setCurrentPlayerId(details.getHighestBidderId());
    }

    private void transitionToSelectTrump(TwentyNineState.Details details, List<GameEvent> events, String gameId) {
        details.setPhase(TwentyNineState.Details.PHASE_SELECT_TRUMP);
        details.setCurrentPlayerId(details.getHighestBidderId());
        events.add(GameEvent.of("BIDDING_COMPLETE", gameId, details.getHighestBidderId(), Map.of(
                "highestBidderId", details.getHighestBidderId(),
                "currentBid", details.getCurrentBid())));
    }

    // ===================== DOUBLE / REDOUBLE =====================

    private GameResult processDouble(TwentyNineState state, Player player, TwentyNineAction action) {
        TwentyNineState.Details details = state.getDetails();
        // Double is only allowed during bidding or playing phase
        if (!TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase()) &&
            !TwentyNineState.Details.PHASE_PLAYING.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Cannot double at this time");
        }
        if (details.getHighestBidderId() == null) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "No bid to double yet");
        }
        if (details.isDoubled()) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Already doubled");
        }
        // During bidding, the turn must be the doubler's
        // During playing, the double can be called by opponent (often before first lead or during early play)
        // For simplicity, we check if it is the current player's turn if it's bidding phase
        if (TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase())) {
            if (!player.getId().equals(details.getCurrentPlayerId())) {
                return GameResult.failure(ErrorCodes.INVALID_ACTION, "It is not your turn to double");
            }
        }

        String bidderTeam = teamOf(details.getHighestBidderId(), details.getPlayerOrder());
        String playerTeam = teamOf(player.getId(), details.getPlayerOrder());
        if (bidderTeam.equals(playerTeam)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Only the opposing team can double");
        }

        details.setDoubled(true);
        details.setDoublerPlayerId(player.getId());

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("DOUBLED", state.getGameId(), player.getId(), Map.of("playerId", player.getId())));

        // Only advance bidding turn if we are in bidding phase
        if (TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase())) {
            advanceBiddingTurn(details);
        }
        return buildResult(state, events);
    }

    private GameResult processRedouble(TwentyNineState state, Player player, TwentyNineAction action) {
        TwentyNineState.Details details = state.getDetails();
        // Redouble is only meaningful after an opponent has doubled
        if (!TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase()) &&
            !TwentyNineState.Details.PHASE_PLAYING.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Cannot redouble at this time");
        }
        if (!details.isDoubled()) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Cannot redouble without a double");
        }
        if (details.isRedoubled()) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Already redoubled");
        }
        // During bidding, it must be the player's turn to redouble
        if (TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase())) {
            if (!player.getId().equals(details.getCurrentPlayerId())) {
                return GameResult.failure(ErrorCodes.INVALID_ACTION, "It is not your turn to redouble");
            }
        }
        // Only the bidding team can redouble
        String bidderTeam = teamOf(details.getHighestBidderId(), details.getPlayerOrder());
        String playerTeam = teamOf(player.getId(), details.getPlayerOrder());
        if (!bidderTeam.equals(playerTeam)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Only the bidding team can redouble");
        }

        details.setRedoubled(true);

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("REDOUBLED", state.getGameId(), player.getId(), Map.of("playerId", player.getId())));

        // Only advance bidding turn if we are in bidding phase
        if (TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase())) {
            advanceBiddingTurn(details);
        }
        return buildResult(state, events);
    }

    // ===================== SELECT TRUMP =====================

    private GameResult processSelectTrump(TwentyNineState state, Player player, TwentyNineAction action) {
        TwentyNineState.Details details = state.getDetails();
        if (!TwentyNineState.Details.PHASE_SELECT_TRUMP.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Not in trump selection phase");
        }
        if (!player.getId().equals(details.getHighestBidderId())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Only the highest bidder selects trump");
        }
        String trump = action.getTrumpSuit();
        if (trump == null || (!trump.equalsIgnoreCase(TwentyNineCard.HEARTS) &&
                !trump.equalsIgnoreCase(TwentyNineCard.DIAMONDS) &&
                !trump.equalsIgnoreCase(TwentyNineCard.CLUBS) &&
                !trump.equalsIgnoreCase(TwentyNineCard.SPADES))) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Invalid trump suit");
        }

        details.setTrumpSuit(trump.toUpperCase());
        details.setTrumpRevealed(false); // hidden until revealed in play

        // Do second deal now
        doSecondDeal(details);

        // Transition to playing; starter leads first trick
        details.setPhase(TwentyNineState.Details.PHASE_PLAYING);
        details.setCurrentPlayerId(details.getStarterPlayerId());
        details.setTrickNumber(1);

        List<GameEvent> events = new ArrayList<>();
        // Trump suit is secret - only tell the bidder
        events.add(GameEvent.of("TRUMP_SELECTED", state.getGameId(), player.getId(), Map.of(
                "highestBidderId", player.getId(),
                "trumpRevealed", false
                // trumpSuit intentionally omitted from broadcast; clients will read from their own hand perspective
        )));
        events.add(GameEvent.of("CARDS_DEALT", state.getGameId(), null, Map.of("secondDeal", true)));

        return buildResult(state, events);
    }

    // ===================== PLAY CARD =====================

    private GameResult processPlayCard(TwentyNineState state, Player player, TwentyNineAction action) {
        TwentyNineState.Details details = state.getDetails();
        if (!TwentyNineState.Details.PHASE_PLAYING.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Not in playing phase");
        }

        TwentyNineCard cardToPlay = action.getCard();
        if (cardToPlay == null) return GameResult.failure(ErrorCodes.INVALID_MOVE, "No card specified");

        List<TwentyNineCard> hand = details.getHands().get(player.getId());
        if (hand == null) return GameResult.failure(ErrorCodes.INVALID_MOVE, "Player has no cards");

        TwentyNineCard matched = null;
        for (TwentyNineCard c : hand) {
            if (c.getSuit().equalsIgnoreCase(cardToPlay.getSuit()) && c.getRank().equalsIgnoreCase(cardToPlay.getRank())) {
                matched = c;
                break;
            }
        }
        if (matched == null) return GameResult.failure(ErrorCodes.INVALID_MOVE, "Card not in hand");

        // Validate suit-following rules
        String leadSuit = details.getLeadSuit();
        if (leadSuit != null) {
            boolean hasLeadSuit = hand.stream().anyMatch(c -> c.getSuit().equalsIgnoreCase(leadSuit));
            if (hasLeadSuit && !matched.getSuit().equalsIgnoreCase(leadSuit)) {
                return GameResult.failure(ErrorCodes.INVALID_MOVE, "Must follow lead suit: " + leadSuit);
            }
            // If player can't follow suit, clear any pending trump request flag (they are now playing)
            if (!hasLeadSuit) {
                details.setTrumpRequestPending(false);
            }
        }
        hand.remove(matched);
        details.getCurrentTrick().add(new TwentyNinePlayedCard(player.getId(), matched));

        if (leadSuit == null) {
            details.setLeadSuit(matched.getSuit());
        }

        // Check if playing this card reveals trump (7th card rule):
        // When a player cannot follow suit and plays a trump card, trump is revealed
        boolean trumpRevealedNow = false;
        if (!details.isTrumpRevealed() && details.getTrumpSuit() != null
                && matched.getSuit().equalsIgnoreCase(details.getTrumpSuit())
                && leadSuit != null && !matched.getSuit().equalsIgnoreCase(leadSuit)) {
            details.setTrumpRevealed(true);
            trumpRevealedNow = true;
        }

        List<GameEvent> events = new ArrayList<>();
        Map<String, Object> cardPayload = new HashMap<>();
        cardPayload.put("playerId", player.getId());
        cardPayload.put("card", matched);
        cardPayload.put("leadSuit", details.getLeadSuit());
        if (trumpRevealedNow) cardPayload.put("trumpRevealed", details.getTrumpSuit());
        events.add(GameEvent.of("CARD_PLAYED", state.getGameId(), player.getId(), cardPayload));

        List<String> playerOrder = details.getPlayerOrder();
        GameStatus gameStatus = state.getStatus();
        String gameWinner = state.getWinner();

        if (details.getCurrentTrick().size() < 4) {
            int idx = playerOrder.indexOf(player.getId());
            String nextPlayerId = playerOrder.get((idx + 1) % 4);
            details.setCurrentPlayerId(nextPlayerId);
            // Check if next player can't follow suit — if so, set trumpRequestPending so they can reveal trump
            if (!details.isTrumpRevealed() && details.getTrumpSuit() != null && details.getLeadSuit() != null) {
                List<TwentyNineCard> nextHand = details.getHands().get(nextPlayerId);
                if (nextHand != null) {
                    boolean nextHasLead = nextHand.stream().anyMatch(c -> c.getSuit().equalsIgnoreCase(details.getLeadSuit()));
                    details.setTrumpRequestPending(!nextHasLead);
                    details.setTrumpRequesterPlayerId(!nextHasLead ? nextPlayerId : null);
                }
            }
        } else {
            // Trick complete
            TwentyNinePlayedCard winningPlay = determineTrickWinner(details.getCurrentTrick(), details.getLeadSuit(), details.getTrumpSuit(), details.isTrumpRevealed());
            String winnerId = winningPlay.getPlayerId();
            String winnerTeam = teamOf(winnerId, playerOrder);

            // Accumulate card points
            int trickPoints = details.getCurrentTrick().stream().mapToInt(pc -> pc.getCard().getPoints()).sum();
            details.getRoundCardPoints().merge(winnerTeam, trickPoints, Integer::sum);

            details.setLastTrick(new ArrayList<>(details.getCurrentTrick()));
            details.setLastTrickWinner(winnerId);
            details.setCurrentTrick(new ArrayList<>());
            details.setLeadSuit(null);

            events.add(GameEvent.of("TRICK_WON", state.getGameId(), winnerId, Map.of(
                    "winnerId", winnerId,
                    "winnerTeam", winnerTeam,
                    "trickPoints", trickPoints,
                    "trickNumber", details.getTrickNumber(),
                    "roundCardPoints", details.getRoundCardPoints()
            )));

            // Early round completion check
            String bidderTeam = teamOf(details.getHighestBidderId(), playerOrder);
            String opposingTeam = opposingTeam(bidderTeam);
            int bid = details.getCurrentBid();
            int bidderPoints = details.getRoundCardPoints().getOrDefault(bidderTeam, 0);
            int opposingPoints = details.getRoundCardPoints().getOrDefault(opposingTeam, 0);

            boolean earlyFinish = false;
            if (opposingPoints >= (29 - bid)) {
                earlyFinish = true;
            } else if (bidderPoints >= bid) {
                earlyFinish = true;
            }

            if (details.getTrickNumber() >= 8 || earlyFinish) {
                // Round over - score it
                GameResult roundResult = scoreRound(state, events);
                if (roundResult != null) return roundResult;

                // Check match winner
                String matchWinnerTeam = null;
                for (Map.Entry<String, Integer> e : details.getGamePoints().entrySet()) {
                    if (e.getValue() >= details.getTargetGamePoints()) {
                        matchWinnerTeam = e.getKey();
                        break;
                    }
                }

                if (matchWinnerTeam != null) {
                    gameStatus = GameStatus.FINISHED;
                    // Winner = both players of winning team
                    List<String> winnerIds = getTeamPlayers(matchWinnerTeam, playerOrder);
                    gameWinner = String.join(",", winnerIds);
                    details.setPhase(TwentyNineState.Details.PHASE_GAME_OVER);
                    details.setCurrentPlayerId(null);
                    events.add(GameEvent.of("PLAYER_WON", state.getGameId(), gameWinner, Map.of(
                            "winnerTeam", matchWinnerTeam,
                            "gamePoints", details.getGamePoints()
                    )));
                } else {
                    // Stay in ROUND_END phase; players must send CONTINUE to start next round
                    details.setCurrentPlayerId(null);
                }
            } else {
                details.setTrickNumber(details.getTrickNumber() + 1);
                details.setCurrentPlayerId(winnerId);
            }
        }

        TwentyNineState newState = TwentyNineState.builder()
                .gameId(state.getGameId())
                .status(gameStatus)
                .players(state.getPlayers())
                .winner(gameWinner)
                .sequence(state.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();

        return GameResult.success(newState, events);
    }

    // ===================== REQUEST TRUMP (7th card rule) =====================

    private GameResult processRequestTrump(TwentyNineState state, Player player, TwentyNineAction action) {
        TwentyNineState.Details details = state.getDetails();
        if (!TwentyNineState.Details.PHASE_PLAYING.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Not in playing phase");
        }
        if (details.isTrumpRevealed()) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Trump is already revealed");
        }
        // A player can request trump reveal when they cannot follow the lead suit
        String leadSuit = details.getLeadSuit();
        if (leadSuit == null) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "No trick in progress");
        }
        List<TwentyNineCard> hand = details.getHands().get(player.getId());
        if (hand == null) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Player has no cards");
        }
        boolean hasLeadSuit = hand.stream().anyMatch(c -> c.getSuit().equalsIgnoreCase(leadSuit));
        if (hasLeadSuit) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "You have the lead suit; cannot request trump reveal");
        }

        details.setTrumpRevealed(true);
        details.setTrumpRequestPending(false);
        details.setTrumpRequesterPlayerId(player.getId());

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("TRUMP_REVEALED", state.getGameId(), player.getId(), Map.of(
                "trumpSuit", details.getTrumpSuit(),
                "requestedBy", player.getId()
        )));

        return buildResult(state, events);
    }

    // ===================== TRICK WINNER =====================

    private TwentyNinePlayedCard determineTrickWinner(List<TwentyNinePlayedCard> trick, String leadSuit, String trumpSuit, boolean trumpRevealed) {
        TwentyNinePlayedCard bestTrump = null;
        TwentyNinePlayedCard bestLead = null;

        for (TwentyNinePlayedCard play : trick) {
            TwentyNineCard c = play.getCard();
            boolean isTrump = trumpRevealed && trumpSuit != null && c.getSuit().equalsIgnoreCase(trumpSuit);
            boolean isLead = leadSuit != null && c.getSuit().equalsIgnoreCase(leadSuit);

            if (isTrump) {
                if (bestTrump == null || c.getTrickRank() > bestTrump.getCard().getTrickRank()) bestTrump = play;
            } else if (isLead) {
                if (bestLead == null || c.getTrickRank() > bestLead.getCard().getTrickRank()) bestLead = play;
            }
        }

        if (bestTrump != null) return bestTrump;
        if (bestLead != null) return bestLead;
        return trick.get(0);
    }

    // ===================== ROUND SCORING =====================

    private GameResult scoreRound(TwentyNineState state, List<GameEvent> events) {
        TwentyNineState.Details details = state.getDetails();
        List<String> playerOrder = details.getPlayerOrder();

        String bidderTeam = teamOf(details.getHighestBidderId(), playerOrder);
        String opposingTeam = opposingTeam(bidderTeam);
        int bid = details.getCurrentBid();
        int bidderPoints = details.getRoundCardPoints().getOrDefault(bidderTeam, 0);
        int opposingPoints = details.getRoundCardPoints().getOrDefault(opposingTeam, 0);

        boolean bidderSucceeded = bidderPoints >= bid;

        int multiplier = 1;
        if (details.isRedoubled()) multiplier = 4;
        else if (details.isDoubled()) multiplier = 2;

        if (bidderSucceeded) {
            details.getGamePoints().merge(bidderTeam, multiplier, Integer::sum);
        } else {
            details.getGamePoints().merge(opposingTeam, multiplier, Integer::sum);
        }

        // Build round summary for frontend modal
        Map<String, Object> summary = new HashMap<>();
        summary.put("bidderTeam", bidderTeam);
        summary.put("opposingTeam", opposingTeam);
        summary.put("bid", bid);
        summary.put("bidderCardPoints", bidderPoints);
        summary.put("opposingCardPoints", opposingPoints);
        summary.put("bidderSucceeded", bidderSucceeded);
        summary.put("doubled", details.isDoubled());
        summary.put("redoubled", details.isRedoubled());
        summary.put("multiplier", multiplier);
        summary.put("gamePoints", new HashMap<>(details.getGamePoints()));
        summary.put("trumpSuit", details.getTrumpSuit());
        summary.put("highestBidderId", details.getHighestBidderId());
        details.setRoundSummary(summary);
        details.setPhase(TwentyNineState.Details.PHASE_ROUND_END);

        events.add(GameEvent.of("ROUND_FINISHED", state.getGameId(), null, summary));

        return null; // caller continues
    }

    private void startNewRound(TwentyNineState.Details details, List<String> playerOrder, List<GameEvent> events, String gameId) {
        // Rotate dealer
        int dealerIdx = playerOrder.indexOf(details.getDealerId());
        String newDealer = playerOrder.get((dealerIdx + 1) % 4);
        String newStarter = playerOrder.get((dealerIdx + 2) % 4); // left of new dealer

        details.setDealerId(newDealer);
        details.setStarterPlayerId(newStarter);
        details.setCurrentPlayerId(newStarter);
        details.setPhase(TwentyNineState.Details.PHASE_BIDDING);
        details.setCurrentBid(14);
        details.setHighestBidderId(null);
        details.setConsecutivePasses(0);
        details.setPassedPlayers(new HashSet<>());
        details.setDoubled(false);
        details.setRedoubled(false);
        details.setDoublerPlayerId(null);
        details.setTrumpSuit(null);
        details.setTrumpRevealed(false);
        details.setSecondDealDone(false);
        details.setTrickNumber(1);
        details.setCurrentTrick(new ArrayList<>());
        details.setLeadSuit(null);
        details.setLastTrick(new ArrayList<>());
        details.setLastTrickWinner(null);
        details.setTrumpRequestPending(false);
        details.setTrumpRequesterPlayerId(null);

        Map<String, Integer> roundCardPoints = new HashMap<>();
        roundCardPoints.put(TEAM_A, 0);
        roundCardPoints.put(TEAM_B, 0);
        details.setRoundCardPoints(roundCardPoints);

        Map<String, List<TwentyNineCard>> newHands = dealFirstFour(playerOrder);
        details.setHands(newHands);

        events.add(GameEvent.of("NEW_ROUND", gameId, null, Map.of(
                "dealerId", newDealer,
                "starterPlayerId", newStarter
        )));
    }

    private List<String> getTeamPlayers(String team, List<String> playerOrder) {
        if (TEAM_A.equals(team)) return List.of(playerOrder.get(0), playerOrder.get(2));
        return List.of(playerOrder.get(1), playerOrder.get(3));
    }

    private GameResult buildResult(TwentyNineState state, List<GameEvent> events) {
        TwentyNineState newState = TwentyNineState.builder()
                .gameId(state.getGameId())
                .status(state.getStatus())
                .players(state.getPlayers())
                .winner(state.getWinner())
                .sequence(state.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(state.getDetails())
                .build();
        return GameResult.success(newState, events);
    }

    @Override
    public boolean isValidAction(GameState<?> state, Player player, TwentyNineAction action) {
        if (!(state instanceof TwentyNineState tnState) || tnState.getStatus() != GameStatus.IN_PROGRESS) return false;
        TwentyNineState.Details details = tnState.getDetails();
        String type = action.getActionType();
        if (type == null) return false;

        // Double and redouble can only be performed during bidding phase by the current player
        String phase = details.getPhase();
        if (!TwentyNineState.Details.PHASE_BIDDING.equals(phase)) return false;

        if (TwentyNineAction.DOUBLE.equalsIgnoreCase(type)) {
            // Only the current player can double
            if (!player.getId().equals(details.getCurrentPlayerId())) return false;
            if (details.isDoubled()) return false;
            if (details.getHighestBidderId() == null) return false;
            String bidderTeam = teamOf(details.getHighestBidderId(), details.getPlayerOrder());
            String playerTeam = teamOf(player.getId(), details.getPlayerOrder());
            return !bidderTeam.equals(playerTeam); // only opposing team can double
        }

        if (TwentyNineAction.REDOUBLE.equalsIgnoreCase(type)) {
            // Only the current player can redouble
            if (!player.getId().equals(details.getCurrentPlayerId())) return false;
            if (!details.isDoubled()) return false;          // must have a pending double
            if (details.isRedoubled()) return false;
            String bidderTeam = teamOf(details.getHighestBidderId(), details.getPlayerOrder());
            String playerTeam = teamOf(player.getId(), details.getPlayerOrder());
            return bidderTeam.equals(playerTeam); // only bidding team can redouble
        }

        if (TwentyNineAction.CONTINUE.equalsIgnoreCase(type)) {
            return TwentyNineState.Details.PHASE_ROUND_END.equals(details.getPhase());
        }

        if (!player.getId().equals(details.getCurrentPlayerId())) return false;

        Set<String> passed = details.getPassedPlayers();
        boolean notPassed = passed == null || !passed.contains(player.getId());

        return switch (type.toUpperCase()) {
            case TwentyNineAction.BID -> TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase())
                    && notPassed
                    && action.getBid() != null && action.getBid() > details.getCurrentBid()
                    && action.getBid() >= 15 && action.getBid() <= 28;
            case TwentyNineAction.PASS -> TwentyNineState.Details.PHASE_BIDDING.equals(details.getPhase())
                    && notPassed;
            case TwentyNineAction.SELECT_TRUMP -> TwentyNineState.Details.PHASE_SELECT_TRUMP.equals(details.getPhase())
                    && player.getId().equals(details.getHighestBidderId());
            case TwentyNineAction.PLAY_CARD -> TwentyNineState.Details.PHASE_PLAYING.equals(details.getPhase())
                    && action.getCard() != null;
            case TwentyNineAction.REQUEST_TRUMP -> TwentyNineState.Details.PHASE_PLAYING.equals(details.getPhase())
                    && !details.isTrumpRevealed();
            default -> false;
        };
    }

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        if (!(state instanceof TwentyNineState tnState) || tnState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.success(state);
        }
        TwentyNineState.Details details = tnState.getDetails();
        String disconnectedTeam = teamOf(player.getId(), details.getPlayerOrder());
        String winnerTeam = opposingTeam(disconnectedTeam);
        List<String> winnerIds = getTeamPlayers(winnerTeam, details.getPlayerOrder());
        String winnerStr = String.join(",", winnerIds);

        TwentyNineState newState = TwentyNineState.builder()
                .gameId(tnState.getGameId())
                .status(GameStatus.FINISHED)
                .players(tnState.getPlayers())
                .winner(winnerStr)
                .sequence(tnState.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();

        return GameResult.success(newState, List.of(GameEvent.of("PLAYER_FORFEIT", tnState.getGameId(), player.getId(), Map.of(
                "winner", winnerStr, "reason", "Player disconnected"))));
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.success(state);
    }

    @Override
    public TwentyNineAction parseAction(Map<String, Object> rawAction) {
        if (rawAction == null) return new TwentyNineAction();
        String actionType = (String) rawAction.getOrDefault("action", rawAction.get("actionType"));
        if (actionType == null) {
            if (rawAction.containsKey("bid")) actionType = TwentyNineAction.BID;
            else if (rawAction.containsKey("trumpSuit")) actionType = TwentyNineAction.SELECT_TRUMP;
            else if (rawAction.containsKey("card")) actionType = TwentyNineAction.PLAY_CARD;
            else actionType = TwentyNineAction.PASS;
        }

        Integer bid = rawAction.get("bid") instanceof Number n ? n.intValue() : null;
        String trumpSuit = rawAction.get("trumpSuit") instanceof String s ? s : null;

        TwentyNineCard card = null;
        if (rawAction.get("card") instanceof Map<?, ?> cardMap) {
            String suit = (String) cardMap.get("suit");
            String rank = (String) cardMap.get("rank");
            int pts = cardMap.get("points") instanceof Number pn ? pn.intValue() : 0;
            int tr = cardMap.get("trickRank") instanceof Number tn ? tn.intValue() : 0;
            card = new TwentyNineCard(suit, rank, pts, tr);
        } else if (rawAction.containsKey("suit") && rawAction.containsKey("rank")) {
            String suit = (String) rawAction.get("suit");
            String rank = (String) rawAction.get("rank");
            card = new TwentyNineCard(suit, rank, 0, 0);
        }

        return new TwentyNineAction(actionType, bid, trumpSuit, card);
    }

    @Override
    public TwentyNineConfiguration parseConfiguration(Map<String, Object> rawConfig) {
        if (rawConfig == null) return defaultConfiguration();
        int target = rawConfig.get("targetGamePoints") instanceof Number n ? n.intValue() : 6;
        return new TwentyNineConfiguration(target);
    }
}
