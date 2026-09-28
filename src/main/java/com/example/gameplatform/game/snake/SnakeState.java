package com.example.gameplatform.game.snake;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SnakeState implements GameState<SnakeState.Details> {

    private String gameId;
    private GameStatus status;
    private List<String> players;
    private String winner;
    private int sequence;
    private long updatedAt;
    private Details details;

    public SnakeState() {}

    public SnakeState(String gameId, GameStatus status, List<String> players, String winner, int sequence, long updatedAt, Details details) {
        this.gameId = gameId;
        this.status = status;
        this.players = players;
        this.winner = winner;
        this.sequence = sequence;
        this.updatedAt = updatedAt;
        this.details = details;
    }

    public static class SnakePlayerData {
        private String playerId;
        private String username;
        private String color;
        private int position; // 0 = start, 1..100 on board
        private int rank;
        private Integer lastRoll;
        private boolean active;

        public SnakePlayerData() {}

        public SnakePlayerData(String playerId, String username, String color, int position, int rank, Integer lastRoll, boolean active) {
            this.playerId = playerId;
            this.username = username;
            this.color = color;
            this.position = position;
            this.rank = rank;
            this.lastRoll = lastRoll;
            this.active = active;
        }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String playerId;
            private String username;
            private String color;
            private int position = 0;
            private int rank = 0;
            private Integer lastRoll;
            private boolean active = true;

            public Builder playerId(String playerId) { this.playerId = playerId; return this; }
            public Builder username(String username) { this.username = username; return this; }
            public Builder color(String color) { this.color = color; return this; }
            public Builder position(int position) { this.position = position; return this; }
            public Builder rank(int rank) { this.rank = rank; return this; }
            public Builder lastRoll(Integer lastRoll) { this.lastRoll = lastRoll; return this; }
            public Builder active(boolean active) { this.active = active; return this; }
            public SnakePlayerData build() {
                return new SnakePlayerData(playerId, username, color, position, rank, lastRoll, active);
            }
        }

        public String getPlayerId() { return playerId; }
        public void setPlayerId(String playerId) { this.playerId = playerId; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public int getPosition() { return position; }
        public void setPosition(int position) { this.position = position; }
        public int getRank() { return rank; }
        public void setRank(int rank) { this.rank = rank; }
        public Integer getLastRoll() { return lastRoll; }
        public void setLastRoll(Integer lastRoll) { this.lastRoll = lastRoll; }
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
    }

    public static class Details {
        private int boardSize = 100;
        private String currentPlayerId;
        private String currentColor;
        private Integer lastDiceRoll;
        private List<String> turnOrder;
        private Map<String, SnakePlayerData> players = new HashMap<>();
        private Map<Integer, Integer> snakes = new HashMap<>();
        private Map<Integer, Integer> ladders = new HashMap<>();
        private int consecutiveSixes;
        private String lastActionMessage;

        public Details() {}

        public Details(int boardSize, String currentPlayerId, String currentColor, Integer lastDiceRoll,
                       List<String> turnOrder, Map<String, SnakePlayerData> players,
                       Map<Integer, Integer> snakes, Map<Integer, Integer> ladders,
                       int consecutiveSixes, String lastActionMessage) {
            this.boardSize = boardSize;
            this.currentPlayerId = currentPlayerId;
            this.currentColor = currentColor;
            this.lastDiceRoll = lastDiceRoll;
            this.turnOrder = turnOrder;
            this.players = players;
            this.snakes = snakes;
            this.ladders = ladders;
            this.consecutiveSixes = consecutiveSixes;
            this.lastActionMessage = lastActionMessage;
        }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private int boardSize = 100;
            private String currentPlayerId;
            private String currentColor;
            private Integer lastDiceRoll;
            private List<String> turnOrder = List.of();
            private Map<String, SnakePlayerData> players = new HashMap<>();
            private Map<Integer, Integer> snakes = new HashMap<>();
            private Map<Integer, Integer> ladders = new HashMap<>();
            private int consecutiveSixes = 0;
            private String lastActionMessage;

            public Builder boardSize(int boardSize) { this.boardSize = boardSize; return this; }
            public Builder currentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; return this; }
            public Builder currentColor(String currentColor) { this.currentColor = currentColor; return this; }
            public Builder lastDiceRoll(Integer lastDiceRoll) { this.lastDiceRoll = lastDiceRoll; return this; }
            public Builder turnOrder(List<String> turnOrder) { this.turnOrder = turnOrder; return this; }
            public Builder players(Map<String, SnakePlayerData> players) { this.players = players; return this; }
            public Builder snakes(Map<Integer, Integer> snakes) { this.snakes = snakes; return this; }
            public Builder ladders(Map<Integer, Integer> ladders) { this.ladders = ladders; return this; }
            public Builder consecutiveSixes(int consecutiveSixes) { this.consecutiveSixes = consecutiveSixes; return this; }
            public Builder lastActionMessage(String lastActionMessage) { this.lastActionMessage = lastActionMessage; return this; }
            public Details build() {
                return new Details(boardSize, currentPlayerId, currentColor, lastDiceRoll, turnOrder, players, snakes, ladders, consecutiveSixes, lastActionMessage);
            }
        }

        public int getBoardSize() { return boardSize; }
        public void setBoardSize(int boardSize) { this.boardSize = boardSize; }
        public String getCurrentPlayerId() { return currentPlayerId; }
        public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }
        public String getCurrentColor() { return currentColor; }
        public void setCurrentColor(String currentColor) { this.currentColor = currentColor; }
        public Integer getLastDiceRoll() { return lastDiceRoll; }
        public void setLastDiceRoll(Integer lastDiceRoll) { this.lastDiceRoll = lastDiceRoll; }
        public List<String> getTurnOrder() { return turnOrder; }
        public void setTurnOrder(List<String> turnOrder) { this.turnOrder = turnOrder; }
        public Map<String, SnakePlayerData> getPlayers() { return players; }
        public void setPlayers(Map<String, SnakePlayerData> players) { this.players = players; }
        public Map<Integer, Integer> getSnakes() { return snakes; }
        public void setSnakes(Map<Integer, Integer> snakes) { this.snakes = snakes; }
        public Map<Integer, Integer> getLadders() { return ladders; }
        public void setLadders(Map<Integer, Integer> ladders) { this.ladders = ladders; }
        public int getConsecutiveSixes() { return consecutiveSixes; }
        public void setConsecutiveSixes(int consecutiveSixes) { this.consecutiveSixes = consecutiveSixes; }
        public String getLastActionMessage() { return lastActionMessage; }
        public void setLastActionMessage(String lastActionMessage) { this.lastActionMessage = lastActionMessage; }
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String gameId;
        private GameStatus status = GameStatus.IN_PROGRESS;
        private List<String> players = List.of();
        private String winner;
        private int sequence = 0;
        private long updatedAt = System.currentTimeMillis();
        private Details details;

        public Builder gameId(String gameId) { this.gameId = gameId; return this; }
        public Builder status(GameStatus status) { this.status = status; return this; }
        public Builder players(List<String> players) { this.players = players; return this; }
        public Builder winner(String winner) { this.winner = winner; return this; }
        public Builder sequence(int sequence) { this.sequence = sequence; return this; }
        public Builder updatedAt(long updatedAt) { this.updatedAt = updatedAt; return this; }
        public Builder details(Details details) { this.details = details; return this; }
        public SnakeState build() {
            return new SnakeState(gameId, status, players, winner, sequence, updatedAt, details);
        }
    }

    @Override
    public String getGameId() { return gameId; }
    @Override
    public String getGameType() { return "SNAKE"; }
    @Override
    public GameStatus getStatus() { return status; }
    @Override
    public List<String> getPlayers() { return players; }
    @Override
    public String getWinner() { return winner; }
    @Override
    public int getSequence() { return sequence; }
    @Override
    public long getUpdatedAt() { return updatedAt; }
    @Override
    public Details getDetails() { return details; }

    public void setGameId(String gameId) { this.gameId = gameId; }
    public void setStatus(GameStatus status) { this.status = status; }
    public void setPlayers(List<String> players) { this.players = players; }
    public void setWinner(String winner) { this.winner = winner; }
    public void setSequence(int sequence) { this.sequence = sequence; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }
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
            map.put("currentPlayerId", details.getCurrentPlayerId());
            map.put("lastDiceRoll", details.getLastDiceRoll());
            map.put("players", details.getPlayers());
            map.put("boardSize", details.getBoardSize());
        }
        return map;
    }
}
