package com.example.gameplatform.game.ludo;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LudoState implements GameState<LudoState.Details> {

    private String gameId;
    private GameStatus status;
    private List<String> players;
    private String winner;
    private int sequence;
    private long updatedAt;
    private Details details;

    public LudoState() {}

    public LudoState(String gameId, GameStatus status, List<String> players, String winner, int sequence, long updatedAt, Details details) {
        this.gameId = gameId;
        this.status = status;
        this.players = players;
        this.winner = winner;
        this.sequence = sequence;
        this.updatedAt = updatedAt;
        this.details = details;
    }

    public enum Color {
        RED, GREEN, YELLOW, BLUE
    }

    public enum TurnPhase {
        ROLLING,
        MOVING
    }

    public static class Piece {
        private int id; // 0..3
        private Color color;
        private int step; // -1 = Yard, 0..50 = Main Track, 51..56 = Home Column, 57 = Goal
        private boolean inYard;
        private boolean finished;

        public Piece() {}

        public Piece(int id, Color color, int step, boolean inYard, boolean finished) {
            this.id = id;
            this.color = color;
            this.step = step;
            this.inYard = inYard;
            this.finished = finished;
        }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private int id;
            private Color color;
            private int step = -1;
            private boolean inYard = true;
            private boolean finished = false;

            public Builder id(int id) { this.id = id; return this; }
            public Builder color(Color color) { this.color = color; return this; }
            public Builder step(int step) { this.step = step; return this; }
            public Builder inYard(boolean inYard) { this.inYard = inYard; return this; }
            public Builder finished(boolean finished) { this.finished = finished; return this; }
            public Piece build() {
                return new Piece(id, color, step, inYard, finished);
            }
        }

        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public Color getColor() { return color; }
        public void setColor(Color color) { this.color = color; }
        public int getStep() { return step; }
        public void setStep(int step) { this.step = step; }
        public boolean isInYard() { return inYard; }
        public void setInYard(boolean inYard) { this.inYard = inYard; }
        public boolean isFinished() { return finished; }
        public void setFinished(boolean finished) { this.finished = finished; }
    }

    public static class PlayerState {
        private String playerId;
        private Color color;
        private int startGlobalIndex;
        private List<Piece> pieces;
        private int piecesFinished;

        public PlayerState() {}

        public PlayerState(String playerId, Color color, int startGlobalIndex, List<Piece> pieces, int piecesFinished) {
            this.playerId = playerId;
            this.color = color;
            this.startGlobalIndex = startGlobalIndex;
            this.pieces = pieces;
            this.piecesFinished = piecesFinished;
        }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String playerId;
            private Color color;
            private int startGlobalIndex;
            private List<Piece> pieces = List.of();
            private int piecesFinished;

            public Builder playerId(String playerId) { this.playerId = playerId; return this; }
            public Builder color(Color color) { this.color = color; return this; }
            public Builder startGlobalIndex(int startGlobalIndex) { this.startGlobalIndex = startGlobalIndex; return this; }
            public Builder pieces(List<Piece> pieces) { this.pieces = pieces; return this; }
            public Builder piecesFinished(int piecesFinished) { this.piecesFinished = piecesFinished; return this; }
            public PlayerState build() {
                return new PlayerState(playerId, color, startGlobalIndex, pieces, piecesFinished);
            }
        }

        public String getPlayerId() { return playerId; }
        public void setPlayerId(String playerId) { this.playerId = playerId; }
        public Color getColor() { return color; }
        public void setColor(Color color) { this.color = color; }
        public int getStartGlobalIndex() { return startGlobalIndex; }
        public void setStartGlobalIndex(int startGlobalIndex) { this.startGlobalIndex = startGlobalIndex; }
        public List<Piece> getPieces() { return pieces; }
        public void setPieces(List<Piece> pieces) { this.pieces = pieces; }
        public int getPiecesFinished() { return piecesFinished; }
        public void setPiecesFinished(int piecesFinished) { this.piecesFinished = piecesFinished; }
    }

    public static class Details {
        private String currentPlayerId;
        private Color currentColor;
        private TurnPhase turnPhase;
        private Integer lastDiceRoll;
        private int consecutiveSixes;
        private List<Integer> movablePieceIndices;
        private Map<String, PlayerState> playerStates;
        private List<String> playerTurnOrder;
        private int currentTurnIndex;

        public Details() {}

        public Details(String currentPlayerId, Color currentColor, TurnPhase turnPhase, Integer lastDiceRoll,
                       int consecutiveSixes, List<Integer> movablePieceIndices, Map<String, PlayerState> playerStates,
                       List<String> playerTurnOrder, int currentTurnIndex) {
            this.currentPlayerId = currentPlayerId;
            this.currentColor = currentColor;
            this.turnPhase = turnPhase;
            this.lastDiceRoll = lastDiceRoll;
            this.consecutiveSixes = consecutiveSixes;
            this.movablePieceIndices = movablePieceIndices;
            this.playerStates = playerStates;
            this.playerTurnOrder = playerTurnOrder;
            this.currentTurnIndex = currentTurnIndex;
        }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String currentPlayerId;
            private Color currentColor;
            private TurnPhase turnPhase;
            private Integer lastDiceRoll;
            private int consecutiveSixes;
            private List<Integer> movablePieceIndices = List.of();
            private Map<String, PlayerState> playerStates = Map.of();
            private List<String> playerTurnOrder = List.of();
            private int currentTurnIndex;

            public Builder currentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; return this; }
            public Builder currentColor(Color currentColor) { this.currentColor = currentColor; return this; }
            public Builder turnPhase(TurnPhase turnPhase) { this.turnPhase = turnPhase; return this; }
            public Builder lastDiceRoll(Integer lastDiceRoll) { this.lastDiceRoll = lastDiceRoll; return this; }
            public Builder consecutiveSixes(int consecutiveSixes) { this.consecutiveSixes = consecutiveSixes; return this; }
            public Builder movablePieceIndices(List<Integer> movablePieceIndices) { this.movablePieceIndices = movablePieceIndices; return this; }
            public Builder playerStates(Map<String, PlayerState> playerStates) { this.playerStates = playerStates; return this; }
            public Builder playerTurnOrder(List<String> playerTurnOrder) { this.playerTurnOrder = playerTurnOrder; return this; }
            public Builder currentTurnIndex(int currentTurnIndex) { this.currentTurnIndex = currentTurnIndex; return this; }
            public Details build() {
                return new Details(currentPlayerId, currentColor, turnPhase, lastDiceRoll, consecutiveSixes,
                        movablePieceIndices, playerStates, playerTurnOrder, currentTurnIndex);
            }
        }

        public String getCurrentPlayerId() { return currentPlayerId; }
        public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }
        public Color getCurrentColor() { return currentColor; }
        public void setCurrentColor(Color currentColor) { this.currentColor = currentColor; }
        public TurnPhase getTurnPhase() { return turnPhase; }
        public void setTurnPhase(TurnPhase turnPhase) { this.turnPhase = turnPhase; }
        public Integer getLastDiceRoll() { return lastDiceRoll; }
        public void setLastDiceRoll(Integer lastDiceRoll) { this.lastDiceRoll = lastDiceRoll; }
        public int getConsecutiveSixes() { return consecutiveSixes; }
        public void setConsecutiveSixes(int consecutiveSixes) { this.consecutiveSixes = consecutiveSixes; }
        public List<Integer> getMovablePieceIndices() { return movablePieceIndices; }
        public void setMovablePieceIndices(List<Integer> movablePieceIndices) { this.movablePieceIndices = movablePieceIndices; }
        public Map<String, PlayerState> getPlayerStates() { return playerStates; }
        public void setPlayerStates(Map<String, PlayerState> playerStates) { this.playerStates = playerStates; }
        public List<String> getPlayerTurnOrder() { return playerTurnOrder; }
        public void setPlayerTurnOrder(List<String> playerTurnOrder) { this.playerTurnOrder = playerTurnOrder; }
        public int getCurrentTurnIndex() { return currentTurnIndex; }
        public void setCurrentTurnIndex(int currentTurnIndex) { this.currentTurnIndex = currentTurnIndex; }
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
        public LudoState build() {
            return new LudoState(gameId, status, players, winner, sequence, updatedAt, details);
        }
    }

    @Override
    public String getGameType() { return "LUDO"; }
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
            map.put("currentPlayerId", details.getCurrentPlayerId());
            map.put("currentColor", details.getCurrentColor());
            map.put("turnPhase", details.getTurnPhase());
            map.put("lastDiceRoll", details.getLastDiceRoll());
            map.put("movablePieceIndices", details.getMovablePieceIndices());
            map.put("playerStates", details.getPlayerStates());
        }
        return map;
    }
}
