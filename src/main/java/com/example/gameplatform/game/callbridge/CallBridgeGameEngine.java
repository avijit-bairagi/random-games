package com.example.gameplatform.game.callbridge;

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
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Component
public class CallBridgeGameEngine implements GameEngine<CallBridgeState.Details, CallBridgeAction, CallBridgeConfiguration> {

    private static final Logger log = LoggerFactory.getLogger(CallBridgeGameEngine.class);

    public static final String GAME_TYPE = "CALL_BRIDGE";
    public static final String[] SUITS = {Card.SPADES, Card.HEARTS, Card.DIAMONDS, Card.CLUBS};
    public static final String[] RANKS = {"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"};
    public static final int[] VALUES = {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14};

    private final Random random;

    public CallBridgeGameEngine() {
        this(new Random());
    }

    public CallBridgeGameEngine(Random random) {
        this.random = random;
    }

    @Override
    public String gameType() {
        return GAME_TYPE;
    }

    @Override
    public String displayName() {
        return "Call Bridge";
    }

    @Override
    public int minPlayers() {
        return 4;
    }

    @Override
    public int maxPlayers() {
        return 4;
    }

    @Override
    public boolean isSpectatorAllowed() {
        return true;
    }

    @Override
    public boolean isLateJoinAllowed() {
        return false;
    }

    @Override
    public CallBridgeConfiguration defaultConfiguration() {
        return new CallBridgeConfiguration(5);
    }

    @Override
    public GameState<CallBridgeState.Details> createGame(String gameId, List<Player> players, CallBridgeConfiguration configuration) {
        if (players.size() != 4) {
            throw new IllegalArgumentException("Call Bridge requires exactly 4 players");
        }

        int totalRounds = configuration != null && configuration.getTotalRounds() > 0 ? configuration.getTotalRounds() : 5;
        String winCondition = configuration != null && configuration.getWinCondition() != null ? configuration.getWinCondition() : CallBridgeConfiguration.WIN_CONDITION_ROUNDS;
        int pointThreshold = configuration != null && configuration.getPointThreshold() > 0 ? configuration.getPointThreshold() : 50;

        List<String> playerOrder = new ArrayList<>();
        for (Player p : players) {
            playerOrder.add(p.getId());
        }

        // Deal initial deck
        Map<String, List<Card>> hands = dealDeck(playerOrder);

        String starter = playerOrder.get(random.nextInt(playerOrder.size()));
        String dealer = playerOrder.get(playerOrder.size() - 1);

        Map<String, Integer> bids = new HashMap<>();
        Map<String, Integer> tricksWon = new HashMap<>();
        Map<String, Double> totalScores = new HashMap<>();
        for (String pId : playerOrder) {
            tricksWon.put(pId, 0);
            totalScores.put(pId, 0.0);
        }

        CallBridgeState.Details details = CallBridgeState.Details.builder()
                .phase(CallBridgeState.Details.PHASE_BIDDING)
                .currentRound(1)
                .totalRounds(totalRounds)
                .winCondition(winCondition)
                .pointThreshold(pointThreshold)
                .dealerId(dealer)
                .starterPlayerId(starter)
                .currentPlayerId(starter)
                .playerOrder(playerOrder)
                .hands(hands)
                .bids(bids)
                .tricksWon(tricksWon)
                .roundScores(new ArrayList<>())
                .totalScores(totalScores)
                .currentTrick(new ArrayList<>())
                .leadSuit(null)
                .trickNumber(1)
                .lastTrick(new ArrayList<>())
                .lastTrickWinner(null)
                .build();

        return CallBridgeState.builder()
                .gameId(gameId)
                .status(GameStatus.IN_PROGRESS)
                .players(playerOrder)
                .winner(null)
                .sequence(0)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();
    }

    private Map<String, List<Card>> dealDeck(List<String> playerOrder) {
        List<Card> deck = new ArrayList<>(52);
        for (String suit : SUITS) {
            for (int i = 0; i < RANKS.length; i++) {
                deck.add(new Card(suit, RANKS[i], VALUES[i]));
            }
        }
        Collections.shuffle(deck, random);

        Map<String, List<Card>> hands = new HashMap<>();
        for (int i = 0; i < 4; i++) {
            List<Card> hand = new ArrayList<>(deck.subList(i * 13, (i + 1) * 13));
            sortHand(hand);
            hands.put(playerOrder.get(i), hand);
        }
        return hands;
    }

    private void sortHand(List<Card> hand) {
        // Group: SPADES, CLUBS (blacks), then HEARTS, DIAMONDS (reds); within each suit highest value first
        hand.sort((a, b) -> {
            int suitCmp = Integer.compare(suitPriority(a.getSuit()), suitPriority(b.getSuit()));
            if (suitCmp != 0) return suitCmp;
            return Integer.compare(b.getValue(), a.getValue()); // descending value
        });
    }

    private int suitPriority(String suit) {
        if (suit == null) return 0;
        return switch (suit.toUpperCase()) {
            case Card.SPADES -> 1;
            case Card.HEARTS -> 2;
            case Card.CLUBS -> 3;
            case Card.DIAMONDS -> 4;
            default -> 5;
        };
    }

    @Override
    public GameResult processAction(GameState<?> state, Player player, CallBridgeAction action) {
        if (!(state instanceof CallBridgeState cbState)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Invalid state type");
        }

        if (cbState.getStatus() == GameStatus.FINISHED || cbState.getStatus() == GameStatus.CANCELLED) {
            return GameResult.failure(ErrorCodes.GAME_ALREADY_FINISHED, "Game is already finished");
        }

        CallBridgeState.Details details = cbState.getDetails();
        if (!player.getId().equals(details.getCurrentPlayerId())) {
            return GameResult.failure(ErrorCodes.NOT_YOUR_TURN, "It is not your turn");
        }

        String actionType = action.getActionType();
        if (CallBridgeAction.BID.equalsIgnoreCase(actionType)) {
            return processBidAction(cbState, player, action);
        } else if (CallBridgeAction.PLAY_CARD.equalsIgnoreCase(actionType)) {
            return processPlayCardAction(cbState, player, action);
        } else {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Unknown action: " + actionType);
        }
    }

    private GameResult processBidAction(CallBridgeState state, Player player, CallBridgeAction action) {
        CallBridgeState.Details details = state.getDetails();
        if (!CallBridgeState.Details.PHASE_BIDDING.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Game is not in bidding phase");
        }

        Integer bid = action.getBid();
        if (bid == null || bid < 2 || bid > 13) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Bid must be between 2 and 13");
        }

        details.getBids().put(player.getId(), bid);

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("BID_PLACED", state.getGameId(), player.getId(), Map.of(
                "playerId", player.getId(),
                "player", player.getUsername() != null ? player.getUsername() : player.getId(),
                "bid", bid
        )));

        List<String> playerOrder = details.getPlayerOrder();
        boolean allBidded = true;
        for (String pId : playerOrder) {
            if (!details.getBids().containsKey(pId) || details.getBids().get(pId) == null) {
                allBidded = false;
                break;
            }
        }

        if (allBidded) {
            details.setPhase(CallBridgeState.Details.PHASE_PLAYING);
            details.setCurrentPlayerId(details.getStarterPlayerId());
            details.setTrickNumber(1);
            details.setCurrentTrick(new ArrayList<>());
            details.setLeadSuit(null);

            events.add(GameEvent.of("BIDDING_COMPLETED", state.getGameId(), player.getId(), Map.of(
                    "bids", details.getBids(),
                    "starterPlayerId", details.getStarterPlayerId()
            )));
        } else {
            int currentIndex = playerOrder.indexOf(player.getId());
            String nextPlayerId = playerOrder.get((currentIndex + 1) % playerOrder.size());
            details.setCurrentPlayerId(nextPlayerId);
        }

        CallBridgeState newState = CallBridgeState.builder()
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

    private GameResult processPlayCardAction(CallBridgeState state, Player player, CallBridgeAction action) {
        CallBridgeState.Details details = state.getDetails();
        if (!CallBridgeState.Details.PHASE_PLAYING.equals(details.getPhase())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Game is not in playing phase");
        }

        Card cardToPlay = action.getCard();
        if (cardToPlay == null) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "No card specified");
        }

        List<Card> hand = details.getHands().get(player.getId());
        if (hand == null) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Player has no cards");
        }

        Card matchedCard = null;
        for (Card c : hand) {
            if (c.getSuit().equalsIgnoreCase(cardToPlay.getSuit()) &&
                c.getRank().equalsIgnoreCase(cardToPlay.getRank())) {
                matchedCard = c;
                break;
            }
        }

        if (matchedCard == null) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Card is not in your hand");
        }

        // Validate suit following rule
        String leadSuit = details.getLeadSuit();
        if (leadSuit != null && !matchedCard.getSuit().equalsIgnoreCase(leadSuit)) {
            final String requiredSuit = leadSuit;
            boolean hasLeadSuit = hand.stream().anyMatch(c -> c.getSuit().equalsIgnoreCase(requiredSuit));
            if (hasLeadSuit) {
                return GameResult.failure(ErrorCodes.INVALID_MOVE, "Must follow lead suit: " + leadSuit);
            }
        }

        // Play the card
        hand.remove(matchedCard);
        if (details.getCurrentTrick() == null) {
            details.setCurrentTrick(new ArrayList<>());
        }
        details.getCurrentTrick().add(new PlayedCard(player.getId(), matchedCard));

        if (leadSuit == null) {
            details.setLeadSuit(matchedCard.getSuit());
            leadSuit = matchedCard.getSuit();
        }

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("CARD_PLAYED", state.getGameId(), player.getId(), Map.of(
                "playerId", player.getId(),
                "player", player.getUsername() != null ? player.getUsername() : player.getId(),
                "card", matchedCard,
                "leadSuit", leadSuit
        )));

        List<String> playerOrder = details.getPlayerOrder();
        GameStatus gameStatus = state.getStatus();
        String gameWinner = state.getWinner();

        if (details.getCurrentTrick().size() < 4) {
            // Next player in current trick
            int currentIndex = playerOrder.indexOf(player.getId());
            String nextPlayerId = playerOrder.get((currentIndex + 1) % playerOrder.size());
            details.setCurrentPlayerId(nextPlayerId);
        } else {
            // Trick is complete
            PlayedCard winningPlay = determineTrickWinner(details.getCurrentTrick(), details.getLeadSuit());
            String trickWinnerId = winningPlay.getPlayerId();

            int currentWon = details.getTricksWon().getOrDefault(trickWinnerId, 0);
            details.getTricksWon().put(trickWinnerId, currentWon + 1);

            details.setLastTrick(new ArrayList<>(details.getCurrentTrick()));
            details.setLastTrickWinner(trickWinnerId);
            details.setCurrentTrick(new ArrayList<>());
            details.setLeadSuit(null);

            events.add(GameEvent.of("TRICK_WON", state.getGameId(), trickWinnerId, Map.of(
                    "winnerId", trickWinnerId,
                    "winningCard", winningPlay.getCard(),
                    "trickNumber", details.getTrickNumber(),
                    "tricksWon", details.getTricksWon()
            )));

            if (details.getTrickNumber() >= 13) {
                // Round completed
                Map<String, Double> roundScoreMap = new HashMap<>();
                for (String pId : playerOrder) {
                    int bid = details.getBids().getOrDefault(pId, 1);
                    int won = details.getTricksWon().getOrDefault(pId, 0);
                    double score;
                    if (won >= bid) {
                        score = bid;
                    } else {
                        score = -1.0 * bid;
                    }
                    roundScoreMap.put(pId, score);

                    double total = details.getTotalScores().getOrDefault(pId, 0.0) + score;
                    details.getTotalScores().put(pId, total);
                }

                if (details.getRoundScores() == null) {
                    details.setRoundScores(new ArrayList<>());
                }
                details.getRoundScores().add(roundScoreMap);

                events.add(GameEvent.of("ROUND_FINISHED", state.getGameId(), null, Map.of(
                        "round", details.getCurrentRound(),
                        "roundScores", roundScoreMap,
                        "totalScores", details.getTotalScores()
                )));

                boolean matchOver = false;
                if (CallBridgeConfiguration.WIN_CONDITION_POINTS.equals(details.getWinCondition())) {
                    // Points mode: game ends when any player reaches the threshold
                    matchOver = details.getTotalScores().values().stream()
                            .anyMatch(s -> s >= details.getPointThreshold());
                } else {
                    // Rounds mode: game ends after totalRounds
                    matchOver = details.getCurrentRound() >= details.getTotalRounds();
                }
                if (matchOver) {
                    // Match finished
                    gameStatus = GameStatus.FINISHED;
                    gameWinner = determineOverallWinner(details.getTotalScores(), playerOrder);
                    details.setPhase(CallBridgeState.Details.PHASE_GAME_OVER);
                    details.setCurrentPlayerId(null);

                    events.add(GameEvent.of("PLAYER_WON", state.getGameId(), gameWinner, Map.of(
                            "winner", gameWinner,
                            "totalScores", details.getTotalScores()
                    )));
                } else {
                    // Next round
                    int nextRound = details.getCurrentRound() + 1;
                    details.setCurrentRound(nextRound);

                    int starterIdx = (nextRound - 1) % playerOrder.size();
                    String newStarter = playerOrder.get(starterIdx);
                    int dealerIdx = (starterIdx - 1 + playerOrder.size()) % playerOrder.size();
                    String newDealer = playerOrder.get(dealerIdx);

                    details.setStarterPlayerId(newStarter);
                    details.setDealerId(newDealer);
                    details.setCurrentPlayerId(newStarter);
                    details.setPhase(CallBridgeState.Details.PHASE_BIDDING);
                    details.setBids(new HashMap<>());
                    details.setTrickNumber(1);

                    Map<String, Integer> resetTricks = new HashMap<>();
                    for (String pId : playerOrder) {
                        resetTricks.put(pId, 0);
                    }
                    details.setTricksWon(resetTricks);

                    // Deal fresh cards for the new round
                    Map<String, List<Card>> newHands = dealDeck(playerOrder);
                    details.setHands(newHands);

                    events.add(GameEvent.of("CARDS_DEALT", state.getGameId(), null, Map.of(
                            "round", nextRound,
                            "starterPlayerId", newStarter
                    )));
                }
            } else {
                // Next trick in same round
                details.setTrickNumber(details.getTrickNumber() + 1);
                details.setCurrentPlayerId(trickWinnerId);
            }
        }

        CallBridgeState newState = CallBridgeState.builder()
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

    private PlayedCard determineTrickWinner(List<PlayedCard> trick, String leadSuit) {
        PlayedCard highestSpade = null;
        PlayedCard highestLeadSuit = null;

        for (PlayedCard play : trick) {
            Card c = play.getCard();
            if (Card.SPADES.equalsIgnoreCase(c.getSuit())) {
                if (highestSpade == null || c.getValue() > highestSpade.getCard().getValue()) {
                    highestSpade = play;
                }
            } else if (leadSuit != null && leadSuit.equalsIgnoreCase(c.getSuit())) {
                if (highestLeadSuit == null || c.getValue() > highestLeadSuit.getCard().getValue()) {
                    highestLeadSuit = play;
                }
            }
        }

        if (highestSpade != null) {
            return highestSpade;
        }
        return highestLeadSuit != null ? highestLeadSuit : trick.get(0);
    }

    private String determineOverallWinner(Map<String, Double> totalScores, List<String> playerOrder) {
        double maxScore = playerOrder.stream()
                .mapToDouble(pId -> totalScores.getOrDefault(pId, Double.NEGATIVE_INFINITY))
                .max()
                .orElse(Double.NEGATIVE_INFINITY);

        List<String> winners = playerOrder.stream()
                .filter(pId -> totalScores.getOrDefault(pId, Double.NEGATIVE_INFINITY) == maxScore)
                .collect(java.util.stream.Collectors.toList());

        return String.join(",", winners);
    }

    @Override
    public boolean isValidAction(GameState<?> state, Player player, CallBridgeAction action) {
        if (!(state instanceof CallBridgeState cbState) || cbState.getStatus() != GameStatus.IN_PROGRESS) {
            return false;
        }

        CallBridgeState.Details details = cbState.getDetails();
        if (!details.getCurrentPlayerId().equals(player.getId())) {
            return false;
        }

        String type = action.getActionType();
        if (CallBridgeAction.BID.equalsIgnoreCase(type)) {
            if (!CallBridgeState.Details.PHASE_BIDDING.equals(details.getPhase())) return false;
            Integer b = action.getBid();
            return b != null && b >= 1 && b <= 13;
        } else if (CallBridgeAction.PLAY_CARD.equalsIgnoreCase(type)) {
            if (!CallBridgeState.Details.PHASE_PLAYING.equals(details.getPhase())) return false;
            Card card = action.getCard();
            if (card == null) return false;
            List<Card> hand = details.getHands().get(player.getId());
            if (hand == null) return false;

            boolean inHand = hand.stream().anyMatch(c ->
                    c.getSuit().equalsIgnoreCase(card.getSuit()) && c.getRank().equalsIgnoreCase(card.getRank()));
            if (!inHand) return false;

            String leadSuit = details.getLeadSuit();
            if (leadSuit != null && !card.getSuit().equalsIgnoreCase(leadSuit)) {
                boolean hasLeadSuit = hand.stream().anyMatch(c -> c.getSuit().equalsIgnoreCase(leadSuit));
                if (hasLeadSuit) return false;
            }
            return true;
        }
        return false;
    }

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        if (!(state instanceof CallBridgeState cbState) || cbState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.success(state);
        }

        CallBridgeState.Details details = cbState.getDetails();
        String remainingWinner = details.getPlayerOrder().stream()
                .filter(id -> !id.equals(player.getId()))
                .max(Comparator.comparingDouble(id -> details.getTotalScores().getOrDefault(id, 0.0)))
                .orElse(null);

        List<GameEvent> events = List.of(GameEvent.of("PLAYER_FORFEIT", cbState.getGameId(), player.getId(), Map.of(
                "winner", remainingWinner != null ? remainingWinner : "NONE",
                "reason", "Player disconnected"
        )));

        CallBridgeState newState = CallBridgeState.builder()
                .gameId(cbState.getGameId())
                .status(remainingWinner != null ? GameStatus.FINISHED : GameStatus.CANCELLED)
                .players(cbState.getPlayers())
                .winner(remainingWinner)
                .sequence(cbState.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();

        return GameResult.success(newState, events);
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.success(state);
    }

    @Override
    public CallBridgeAction parseAction(Map<String, Object> rawAction) {
        if (rawAction == null) return new CallBridgeAction();
        String actionType = (String) rawAction.getOrDefault("action", (String) rawAction.get("actionType"));
        if (actionType == null) {
            if (rawAction.containsKey("bid")) {
                actionType = CallBridgeAction.BID;
            } else if (rawAction.containsKey("card") || rawAction.containsKey("suit")) {
                actionType = CallBridgeAction.PLAY_CARD;
            } else {
                actionType = CallBridgeAction.PLAY_CARD;
            }
        }

        Integer bid = null;
        if (rawAction.get("bid") instanceof Number n) {
            bid = n.intValue();
        }

        Card card = null;
        if (rawAction.get("card") instanceof Map<?, ?> cardMap) {
            String suit = (String) cardMap.get("suit");
            String rank = (String) cardMap.get("rank");
            int val = cardMap.get("value") instanceof Number vn ? vn.intValue() : rankToValue(rank);
            card = new Card(suit, rank, val);
        } else if (rawAction.containsKey("suit") && rawAction.containsKey("rank")) {
            String suit = (String) rawAction.get("suit");
            String rank = (String) rawAction.get("rank");
            int val = rawAction.get("value") instanceof Number vn ? vn.intValue() : rankToValue(rank);
            card = new Card(suit, rank, val);
        }

        return new CallBridgeAction(actionType, bid, card);
    }

    private int rankToValue(String rank) {
        if (rank == null) return 0;
        return switch (rank.toUpperCase()) {
            case "A" -> 14;
            case "K" -> 13;
            case "Q" -> 12;
            case "J" -> 11;
            case "10" -> 10;
            case "9" -> 9;
            case "8" -> 8;
            case "7" -> 7;
            case "6" -> 6;
            case "5" -> 5;
            case "4" -> 4;
            case "3" -> 3;
            case "2" -> 2;
            default -> 0;
        };
    }

    @Override
    public CallBridgeConfiguration parseConfiguration(Map<String, Object> rawConfig) {
        if (rawConfig == null) return defaultConfiguration();
        int rounds = rawConfig.get("totalRounds") instanceof Number n ? n.intValue() : 5;
        String winCondition = rawConfig.get("winCondition") instanceof String s ? s : CallBridgeConfiguration.WIN_CONDITION_ROUNDS;
        int pointThreshold = rawConfig.get("pointThreshold") instanceof Number n ? n.intValue() : 50;
        return new CallBridgeConfiguration(rounds, winCondition, pointThreshold);
    }
}
