package com.example.gameplatform.game.twentynine;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class TwentyNineState implements GameState<TwentyNineState.Details> {

    private String gameId;
    private GameStatus status;
    private List<String> players;
    private String winner;
    private int sequence;
    private long updatedAt;
    private Details details;

    public TwentyNineState() {}

    public TwentyNineState(String gameId, GameStatus status, List<String> players, String winner,
                           int sequence, long updatedAt, Details details) {
        this.gameId = gameId;
        this.status = status;
        this.players = players;
        this.winner = winner;
        this.sequence = sequence;
        this.updatedAt = updatedAt;
        this.details = details;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String gameId;
        private GameStatus status;
        private List<String> players;
        private String winner;
        private int sequence;
        private long updatedAt;
        private Details details;

        public Builder gameId(String gameId) { this.gameId = gameId; return this; }
        public Builder status(GameStatus status) { this.status = status; return this; }
        public Builder players(List<String> players) { this.players = players; return this; }
        public Builder winner(String winner) { this.winner = winner; return this; }
        public Builder sequence(int sequence) { this.sequence = sequence; return this; }
        public Builder updatedAt(long updatedAt) { this.updatedAt = updatedAt; return this; }
        public Builder details(Details details) { this.details = details; return this; }

        public TwentyNineState build() {
            return new TwentyNineState(gameId, status, players, winner, sequence, updatedAt, details);
        }
    }

    // ---- GameState interface ----
    @Override public String getGameId() { return gameId; }
    @Override public String getGameType() { return "TWENTY_NINE"; }
    @Override public GameStatus getStatus() { return status; }
    @Override public List<String> getPlayers() { return players; }
    @Override public String getWinner() { return winner; }
    @Override public int getSequence() { return sequence; }
    @Override public long getUpdatedAt() { return updatedAt; }
    @Override public Details getDetails() { return details; }

    @Override
    public Map<String, Object> toSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("gameId", gameId);
        summary.put("gameType", getGameType());
        summary.put("status", status);
        summary.put("players", players);
        summary.put("winner", winner);
        summary.put("sequence", sequence);
        summary.put("updatedAt", updatedAt);
        if (details != null) {
            summary.put("phase", details.getPhase());
            summary.put("currentPlayerId", details.getCurrentPlayerId());
            summary.put("currentBid", details.getCurrentBid());
            summary.put("highestBidderId", details.getHighestBidderId());
            summary.put("trumpRevealed", details.isTrumpRevealed());
            summary.put("passedPlayers", details.getPassedPlayers() != null ? details.getPassedPlayers() : java.util.Collections.emptySet());
            summary.put("gamePoints", details.getGamePoints());
            summary.put("trickNumber", details.getTrickNumber());
        }
        return summary;
    }

    // Setters
    public void setGameId(String gameId) { this.gameId = gameId; }
    public void setStatus(GameStatus status) { this.status = status; }
    public void setPlayers(List<String> players) { this.players = players; }
    public void setWinner(String winner) { this.winner = winner; }
    public void setSequence(int sequence) { this.sequence = sequence; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }
    public void setDetails(Details details) { this.details = details; }

    // ===================== Details inner class =====================
    public static class Details {
        public static final String PHASE_BIDDING = "BIDDING";
        public static final String PHASE_SELECT_TRUMP = "SELECT_TRUMP";
        public static final String PHASE_PLAYING = "PLAYING";
        public static final String PHASE_ROUND_END = "ROUND_END";
        public static final String PHASE_GAME_OVER = "GAME_OVER";

        /** Current game phase */
        private String phase;
        /** Player order (4 players) */
        private List<String> playerOrder;
        /** Partnerships: team "A" = [playerOrder[0], playerOrder[2]], team "B" = [playerOrder[1], playerOrder[3]] */
        /** Dealer player id */
        private String dealerId;
        /** Player to lead first trick (left of dealer) */
        private String starterPlayerId;
        /** Whose turn it is currently */
        private String currentPlayerId;

        // --- Bidding state ---
        /** Current highest bid (15-28) */
        private int currentBid;
        /** Player who placed the current highest bid */
        private String highestBidderId;
        /** Number of consecutive passes since last bid raise */
        private int consecutivePasses;
        /** Set of player IDs who have passed in the current bidding round (once passed, cannot bid again) */
        private Set<String> passedPlayers;
        /** Whether the opposing team has doubled */
        private boolean doubled;
        /** Whether the bidding team has redoubled */
        private boolean redoubled;
        /** Player who doubled (from opposing team) */
        private String doublerPlayerId;

        // --- Trump state ---
        /** Trump suit (known only to highest bidder until revealed) */
        private String trumpSuit;
        /** Whether trump has been revealed to all players */
        private boolean trumpRevealed;

        // --- Hands (each player gets 4 cards initially, then 4 more) ---
        /** Each player's current hand */
        private Map<String, List<TwentyNineCard>> hands;
        /** Whether second deal has been done */
        private boolean secondDealDone;

        // --- Trick state ---
        private List<TwentyNinePlayedCard> currentTrick;
        private String leadSuit;
        private int trickNumber;
        private List<TwentyNinePlayedCard> lastTrick;
        private String lastTrickWinner;

        // --- Round scoring ---
        /** Card points captured per team this round: "A" and "B" */
        private Map<String, Integer> roundCardPoints;
        /** Game points per team across all rounds: "A" and "B" */
        private Map<String, Integer> gamePoints;
        /** Target game points to win the match */
        private int targetGamePoints;

        // --- 7th card trump rule ---
        /** Whether a player has requested trump reveal (played 7th card) */
        private boolean trumpRequestPending;
        /** Player who requested trump reveal */
        private String trumpRequesterPlayerId;
        /** Summary of the last completed round (populated at ROUND_END) */
        private Map<String, Object> roundSummary;

        public Details() {}

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String phase;
            private List<String> playerOrder;
            private String dealerId;
            private String starterPlayerId;
            private String currentPlayerId;
            private int currentBid;
            private String highestBidderId;
            private int consecutivePasses;
            private Set<String> passedPlayers;
            private boolean doubled;
            private boolean redoubled;
            private String doublerPlayerId;
            private String trumpSuit;
            private boolean trumpRevealed;
            private Map<String, List<TwentyNineCard>> hands;
            private boolean secondDealDone;
            private List<TwentyNinePlayedCard> currentTrick;
            private String leadSuit;
            private int trickNumber;
            private List<TwentyNinePlayedCard> lastTrick;
            private String lastTrickWinner;
            private Map<String, Integer> roundCardPoints;
            private Map<String, Integer> gamePoints;
            private int targetGamePoints;
            private boolean trumpRequestPending;
            private String trumpRequesterPlayerId;
            private Map<String, Object> roundSummary;

            public Builder phase(String phase) { this.phase = phase; return this; }
            public Builder playerOrder(List<String> playerOrder) { this.playerOrder = playerOrder; return this; }
            public Builder dealerId(String dealerId) { this.dealerId = dealerId; return this; }
            public Builder starterPlayerId(String starterPlayerId) { this.starterPlayerId = starterPlayerId; return this; }
            public Builder currentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; return this; }
            public Builder currentBid(int currentBid) { this.currentBid = currentBid; return this; }
            public Builder highestBidderId(String highestBidderId) { this.highestBidderId = highestBidderId; return this; }
            public Builder consecutivePasses(int consecutivePasses) { this.consecutivePasses = consecutivePasses; return this; }
            public Builder passedPlayers(Set<String> passedPlayers) { this.passedPlayers = passedPlayers; return this; }
            public Builder doubled(boolean doubled) { this.doubled = doubled; return this; }
            public Builder redoubled(boolean redoubled) { this.redoubled = redoubled; return this; }
            public Builder doublerPlayerId(String doublerPlayerId) { this.doublerPlayerId = doublerPlayerId; return this; }
            public Builder trumpSuit(String trumpSuit) { this.trumpSuit = trumpSuit; return this; }
            public Builder trumpRevealed(boolean trumpRevealed) { this.trumpRevealed = trumpRevealed; return this; }
            public Builder hands(Map<String, List<TwentyNineCard>> hands) { this.hands = hands; return this; }
            public Builder secondDealDone(boolean secondDealDone) { this.secondDealDone = secondDealDone; return this; }
            public Builder currentTrick(List<TwentyNinePlayedCard> currentTrick) { this.currentTrick = currentTrick; return this; }
            public Builder leadSuit(String leadSuit) { this.leadSuit = leadSuit; return this; }
            public Builder trickNumber(int trickNumber) { this.trickNumber = trickNumber; return this; }
            public Builder lastTrick(List<TwentyNinePlayedCard> lastTrick) { this.lastTrick = lastTrick; return this; }
            public Builder lastTrickWinner(String lastTrickWinner) { this.lastTrickWinner = lastTrickWinner; return this; }
            public Builder roundCardPoints(Map<String, Integer> roundCardPoints) { this.roundCardPoints = roundCardPoints; return this; }
            public Builder gamePoints(Map<String, Integer> gamePoints) { this.gamePoints = gamePoints; return this; }
            public Builder targetGamePoints(int targetGamePoints) { this.targetGamePoints = targetGamePoints; return this; }
            public Builder trumpRequestPending(boolean trumpRequestPending) { this.trumpRequestPending = trumpRequestPending; return this; }
            public Builder trumpRequesterPlayerId(String trumpRequesterPlayerId) { this.trumpRequesterPlayerId = trumpRequesterPlayerId; return this; }
            public Builder roundSummary(Map<String, Object> roundSummary) { this.roundSummary = roundSummary; return this; }

            public Details build() {
                Details d = new Details();
                d.phase = phase;
                d.playerOrder = playerOrder;
                d.dealerId = dealerId;
                d.starterPlayerId = starterPlayerId;
                d.currentPlayerId = currentPlayerId;
                d.currentBid = currentBid;
                d.highestBidderId = highestBidderId;
                d.consecutivePasses = consecutivePasses;
                d.passedPlayers = passedPlayers != null ? passedPlayers : new HashSet<>();
                d.doubled = doubled;
                d.redoubled = redoubled;
                d.doublerPlayerId = doublerPlayerId;
                d.trumpSuit = trumpSuit;
                d.trumpRevealed = trumpRevealed;
                d.hands = hands;
                d.secondDealDone = secondDealDone;
                d.currentTrick = currentTrick;
                d.leadSuit = leadSuit;
                d.trickNumber = trickNumber;
                d.lastTrick = lastTrick;
                d.lastTrickWinner = lastTrickWinner;
                d.roundCardPoints = roundCardPoints;
                d.gamePoints = gamePoints;
                d.targetGamePoints = targetGamePoints;
                d.trumpRequestPending = trumpRequestPending;
                d.trumpRequesterPlayerId = trumpRequesterPlayerId;
                d.roundSummary = roundSummary;
                return d;
            }
        }

        // Getters and setters
        public String getPhase() { return phase; }
        public void setPhase(String phase) { this.phase = phase; }
        public List<String> getPlayerOrder() { return playerOrder; }
        public void setPlayerOrder(List<String> playerOrder) { this.playerOrder = playerOrder; }
        public String getDealerId() { return dealerId; }
        public void setDealerId(String dealerId) { this.dealerId = dealerId; }
        public String getStarterPlayerId() { return starterPlayerId; }
        public void setStarterPlayerId(String starterPlayerId) { this.starterPlayerId = starterPlayerId; }
        public String getCurrentPlayerId() { return currentPlayerId; }
        public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }
        public int getCurrentBid() { return currentBid; }
        public void setCurrentBid(int currentBid) { this.currentBid = currentBid; }
        public String getHighestBidderId() { return highestBidderId; }
        public void setHighestBidderId(String highestBidderId) { this.highestBidderId = highestBidderId; }
        public int getConsecutivePasses() { return consecutivePasses; }
        public void setConsecutivePasses(int consecutivePasses) { this.consecutivePasses = consecutivePasses; }
        public Set<String> getPassedPlayers() { return passedPlayers; }
        public void setPassedPlayers(Set<String> passedPlayers) { this.passedPlayers = passedPlayers; }
        public boolean isDoubled() { return doubled; }
        public void setDoubled(boolean doubled) { this.doubled = doubled; }
        public boolean isRedoubled() { return redoubled; }
        public void setRedoubled(boolean redoubled) { this.redoubled = redoubled; }
        public String getDoublerPlayerId() { return doublerPlayerId; }
        public void setDoublerPlayerId(String doublerPlayerId) { this.doublerPlayerId = doublerPlayerId; }
        public String getTrumpSuit() { return trumpSuit; }
        public void setTrumpSuit(String trumpSuit) { this.trumpSuit = trumpSuit; }
        public boolean isTrumpRevealed() { return trumpRevealed; }
        public void setTrumpRevealed(boolean trumpRevealed) { this.trumpRevealed = trumpRevealed; }
        public Map<String, List<TwentyNineCard>> getHands() { return hands; }
        public void setHands(Map<String, List<TwentyNineCard>> hands) { this.hands = hands; }
        public boolean isSecondDealDone() { return secondDealDone; }
        public void setSecondDealDone(boolean secondDealDone) { this.secondDealDone = secondDealDone; }
        public List<TwentyNinePlayedCard> getCurrentTrick() { return currentTrick; }
        public void setCurrentTrick(List<TwentyNinePlayedCard> currentTrick) { this.currentTrick = currentTrick; }
        public String getLeadSuit() { return leadSuit; }
        public void setLeadSuit(String leadSuit) { this.leadSuit = leadSuit; }
        public int getTrickNumber() { return trickNumber; }
        public void setTrickNumber(int trickNumber) { this.trickNumber = trickNumber; }
        public List<TwentyNinePlayedCard> getLastTrick() { return lastTrick; }
        public void setLastTrick(List<TwentyNinePlayedCard> lastTrick) { this.lastTrick = lastTrick; }
        public String getLastTrickWinner() { return lastTrickWinner; }
        public void setLastTrickWinner(String lastTrickWinner) { this.lastTrickWinner = lastTrickWinner; }
        public Map<String, Integer> getRoundCardPoints() { return roundCardPoints; }
        public void setRoundCardPoints(Map<String, Integer> roundCardPoints) { this.roundCardPoints = roundCardPoints; }
        public Map<String, Integer> getGamePoints() { return gamePoints; }
        public void setGamePoints(Map<String, Integer> gamePoints) { this.gamePoints = gamePoints; }
        public int getTargetGamePoints() { return targetGamePoints; }
        public void setTargetGamePoints(int targetGamePoints) { this.targetGamePoints = targetGamePoints; }
        public boolean isTrumpRequestPending() { return trumpRequestPending; }
        public void setTrumpRequestPending(boolean trumpRequestPending) { this.trumpRequestPending = trumpRequestPending; }
        public String getTrumpRequesterPlayerId() { return trumpRequesterPlayerId; }
        public void setTrumpRequesterPlayerId(String trumpRequesterPlayerId) { this.trumpRequesterPlayerId = trumpRequesterPlayerId; }
        public Map<String, Object> getRoundSummary() { return roundSummary; }
        public void setRoundSummary(Map<String, Object> roundSummary) { this.roundSummary = roundSummary; }
    }
}
