package com.example.gameplatform.game.callbridge;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CallBridgeState implements GameState<CallBridgeState.Details> {

    private String gameId;
    private GameStatus status;
    private List<String> players;
    private String winner;
    private int sequence;
    private long updatedAt;
    private Details details;

    public CallBridgeState() {}

    public CallBridgeState(String gameId, GameStatus status, List<String> players, String winner,
                           int sequence, long updatedAt, Details details) {
        this.gameId = gameId;
        this.status = status;
        this.players = players;
        this.winner = winner;
        this.sequence = sequence;
        this.updatedAt = updatedAt;
        this.details = details;
    }

    public static class Details {
        public static final String PHASE_BIDDING = "BIDDING";
        public static final String PHASE_PLAYING = "PLAYING";
        public static final String PHASE_ROUND_END = "ROUND_END";
        public static final String PHASE_GAME_OVER = "GAME_OVER";

        private String phase;
        private int currentRound;
        private int totalRounds;
        private String winCondition;
        private int pointThreshold;
        private String dealerId;
        private String starterPlayerId;
        private String currentPlayerId;
        private List<String> playerOrder;
        private Map<String, List<Card>> hands; // playerId -> list of cards
        private Map<String, Integer> bids; // playerId -> bid
        private Map<String, Integer> tricksWon; // playerId -> tricks won in current round
        private List<Map<String, Double>> roundScores; // round -> (playerId -> score)
        private Map<String, Double> totalScores; // playerId -> cumulative score
        private List<PlayedCard> currentTrick; // cards played in current trick
        private String leadSuit; // suit led in current trick
        private int trickNumber; // 1..13
        private List<PlayedCard> lastTrick;
        private String lastTrickWinner;

        public Details() {}

        public Details(String phase, int currentRound, int totalRounds, String winCondition, int pointThreshold,
                       String dealerId,
                       String starterPlayerId, String currentPlayerId, List<String> playerOrder,
                       Map<String, List<Card>> hands, Map<String, Integer> bids,
                       Map<String, Integer> tricksWon, List<Map<String, Double>> roundScores,
                       Map<String, Double> totalScores, List<PlayedCard> currentTrick,
                       String leadSuit, int trickNumber, List<PlayedCard> lastTrick,
                       String lastTrickWinner) {
            this.phase = phase;
            this.currentRound = currentRound;
            this.totalRounds = totalRounds;
            this.winCondition = winCondition;
            this.pointThreshold = pointThreshold;
            this.dealerId = dealerId;
            this.starterPlayerId = starterPlayerId;
            this.currentPlayerId = currentPlayerId;
            this.playerOrder = playerOrder;
            this.hands = hands;
            this.bids = bids;
            this.tricksWon = tricksWon;
            this.roundScores = roundScores;
            this.totalScores = totalScores;
            this.currentTrick = currentTrick;
            this.leadSuit = leadSuit;
            this.trickNumber = trickNumber;
            this.lastTrick = lastTrick;
            this.lastTrickWinner = lastTrickWinner;
        }

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private String phase;
            private int currentRound;
            private int totalRounds;
            private String winCondition;
            private int pointThreshold;
            private String dealerId;
            private String starterPlayerId;
            private String currentPlayerId;
            private List<String> playerOrder;
            private Map<String, List<Card>> hands;
            private Map<String, Integer> bids;
            private Map<String, Integer> tricksWon;
            private List<Map<String, Double>> roundScores;
            private Map<String, Double> totalScores;
            private List<PlayedCard> currentTrick;
            private String leadSuit;
            private int trickNumber;
            private List<PlayedCard> lastTrick;
            private String lastTrickWinner;

            public Builder phase(String phase) { this.phase = phase; return this; }
            public Builder currentRound(int currentRound) { this.currentRound = currentRound; return this; }
            public Builder totalRounds(int totalRounds) { this.totalRounds = totalRounds; return this; }
            public Builder winCondition(String winCondition) { this.winCondition = winCondition; return this; }
            public Builder pointThreshold(int pointThreshold) { this.pointThreshold = pointThreshold; return this; }
            public Builder dealerId(String dealerId) { this.dealerId = dealerId; return this; }
            public Builder starterPlayerId(String starterPlayerId) { this.starterPlayerId = starterPlayerId; return this; }
            public Builder currentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; return this; }
            public Builder playerOrder(List<String> playerOrder) { this.playerOrder = playerOrder; return this; }
            public Builder hands(Map<String, List<Card>> hands) { this.hands = hands; return this; }
            public Builder bids(Map<String, Integer> bids) { this.bids = bids; return this; }
            public Builder tricksWon(Map<String, Integer> tricksWon) { this.tricksWon = tricksWon; return this; }
            public Builder roundScores(List<Map<String, Double>> roundScores) { this.roundScores = roundScores; return this; }
            public Builder totalScores(Map<String, Double> totalScores) { this.totalScores = totalScores; return this; }
            public Builder currentTrick(List<PlayedCard> currentTrick) { this.currentTrick = currentTrick; return this; }
            public Builder leadSuit(String leadSuit) { this.leadSuit = leadSuit; return this; }
            public Builder trickNumber(int trickNumber) { this.trickNumber = trickNumber; return this; }
            public Builder lastTrick(List<PlayedCard> lastTrick) { this.lastTrick = lastTrick; return this; }
            public Builder lastTrickWinner(String lastTrickWinner) { this.lastTrickWinner = lastTrickWinner; return this; }

            public Details build() {
                return new Details(phase, currentRound, totalRounds, winCondition, pointThreshold,
                        dealerId, starterPlayerId,
                        currentPlayerId, playerOrder, hands, bids, tricksWon, roundScores,
                        totalScores, currentTrick, leadSuit, trickNumber, lastTrick, lastTrickWinner);
            }
        }

        public String getPhase() { return phase; }
        public void setPhase(String phase) { this.phase = phase; }
        public int getCurrentRound() { return currentRound; }
        public void setCurrentRound(int currentRound) { this.currentRound = currentRound; }
        public int getTotalRounds() { return totalRounds; }
        public void setTotalRounds(int totalRounds) { this.totalRounds = totalRounds; }
        public String getWinCondition() { return winCondition; }
        public void setWinCondition(String winCondition) { this.winCondition = winCondition; }
        public int getPointThreshold() { return pointThreshold; }
        public void setPointThreshold(int pointThreshold) { this.pointThreshold = pointThreshold; }
        public String getDealerId() { return dealerId; }
        public void setDealerId(String dealerId) { this.dealerId = dealerId; }
        public String getStarterPlayerId() { return starterPlayerId; }
        public void setStarterPlayerId(String starterPlayerId) { this.starterPlayerId = starterPlayerId; }
        public String getCurrentPlayerId() { return currentPlayerId; }
        public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }
        public List<String> getPlayerOrder() { return playerOrder; }
        public void setPlayerOrder(List<String> playerOrder) { this.playerOrder = playerOrder; }
        public Map<String, List<Card>> getHands() { return hands; }
        public void setHands(Map<String, List<Card>> hands) { this.hands = hands; }
        public Map<String, Integer> getBids() { return bids; }
        public void setBids(Map<String, Integer> bids) { this.bids = bids; }
        public Map<String, Integer> getTricksWon() { return tricksWon; }
        public void setTricksWon(Map<String, Integer> tricksWon) { this.tricksWon = tricksWon; }
        public List<Map<String, Double>> getRoundScores() { return roundScores; }
        public void setRoundScores(List<Map<String, Double>> roundScores) { this.roundScores = roundScores; }
        public Map<String, Double> getTotalScores() { return totalScores; }
        public void setTotalScores(Map<String, Double> totalScores) { this.totalScores = totalScores; }
        public List<PlayedCard> getCurrentTrick() { return currentTrick; }
        public void setCurrentTrick(List<PlayedCard> currentTrick) { this.currentTrick = currentTrick; }
        public String getLeadSuit() { return leadSuit; }
        public void setLeadSuit(String leadSuit) { this.leadSuit = leadSuit; }
        public int getTrickNumber() { return trickNumber; }
        public void setTrickNumber(int trickNumber) { this.trickNumber = trickNumber; }
        public List<PlayedCard> getLastTrick() { return lastTrick; }
        public void setLastTrick(List<PlayedCard> lastTrick) { this.lastTrick = lastTrick; }
        public String getLastTrickWinner() { return lastTrickWinner; }
        public void setLastTrickWinner(String lastTrickWinner) { this.lastTrickWinner = lastTrickWinner; }
    }

    public static Builder builder() {
        return new Builder();
    }

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
        public CallBridgeState build() {
            return new CallBridgeState(gameId, status, players, winner, sequence, updatedAt, details);
        }
    }

    @Override
    public String getGameType() { return "CALL_BRIDGE"; }

    @Override
    public String getGameId() { return gameId; }
    public void setGameId(String gameId) { this.gameId = gameId; }

    @Override
    public GameStatus getStatus() { return status; }
    public void setStatus(GameStatus status) { this.status = status; }

    @Override
    public List<String> getPlayers() { return players; }
    public void setPlayers(List<String> players) { this.players = players; }

    @Override
    public String getWinner() { return winner; }
    public void setWinner(String winner) { this.winner = winner; }

    @Override
    public int getSequence() { return sequence; }
    public void setSequence(int sequence) { this.sequence = sequence; }

    @Override
    public long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public Details getDetails() { return details; }
    public void setDetails(Details details) { this.details = details; }

    @Override
    public Map<String, Object> toSummary() {
        Map<String, Object> map = new HashMap<>();
        map.put("gameId", gameId);
        map.put("gameType", getGameType());
        map.put("status", status);
        map.put("winner", winner);
        map.put("sequence", sequence);
        if (details != null) {
            map.put("phase", details.getPhase());
            map.put("currentRound", details.getCurrentRound());
            map.put("totalRounds", details.getTotalRounds());
            map.put("winCondition", details.getWinCondition());
            map.put("pointThreshold", details.getPointThreshold());
            map.put("currentPlayerId", details.getCurrentPlayerId());
            map.put("bids", details.getBids());
            map.put("tricksWon", details.getTricksWon());
            map.put("totalScores", details.getTotalScores());
            map.put("currentTrick", details.getCurrentTrick());
            map.put("trickNumber", details.getTrickNumber());
            map.put("lastTrickWinner", details.getLastTrickWinner());
        }
        return map;
    }
}
