package com.example.gameplatform.game.carrom;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CarromState implements GameState<CarromState.Details> {

    private String gameId;
    private GameStatus status;
    private List<String> players;
    private String winner;
    private int sequence;
    private long updatedAt;
    private Details details;

    public CarromState() {}

    public CarromState(String gameId, GameStatus status, List<String> players, String winner,
                       int sequence, long updatedAt, Details details) {
        this.gameId = gameId;
        this.status = status;
        this.players = players;
        this.winner = winner;
        this.sequence = sequence;
        this.updatedAt = updatedAt;
        this.details = details;
    }

    // ---- Piece representation ----
    public static class Piece {
        // type: "BLACK", "WHITE", "RED" (queen)
        private String type;
        // normalized position [0,1] on the board
        private double x;
        private double y;
        // pocketed flag
        private boolean pocketed;

        public Piece() {}

        public Piece(String type, double x, double y, boolean pocketed) {
            this.type = type;
            this.x = x;
            this.y = y;
            this.pocketed = pocketed;
        }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public double getX() { return x; }
        public void setX(double x) { this.x = x; }
        public double getY() { return y; }
        public void setY(double y) { this.y = y; }
        public boolean isPocketed() { return pocketed; }
        public void setPocketed(boolean pocketed) { this.pocketed = pocketed; }
    }

    // ---- Game details ----
    public static class Details {
        private List<Piece> pieces;
        private String currentPlayerId;
        // playerId -> score
        private Map<String, Integer> scores;
        // playerId -> color assignment ("BLACK" or "WHITE")
        private Map<String, String> playerColors;
        // For 4-player: team assignments (playerId -> teamId)
        private Map<String, String> teams;
        private boolean queenPocketed;
        private boolean queenCovered;
        // Last strike result info for animation
        private LastStrike lastStrike;
        private int targetScore;
        private boolean extraTurn;

        public Details() {}

        public Details(List<Piece> pieces, String currentPlayerId, Map<String, Integer> scores,
                       Map<String, String> playerColors, Map<String, String> teams,
                       boolean queenPocketed, boolean queenCovered, LastStrike lastStrike,
                       int targetScore, boolean extraTurn) {
            this.pieces = pieces;
            this.currentPlayerId = currentPlayerId;
            this.scores = scores;
            this.playerColors = playerColors;
            this.teams = teams;
            this.queenPocketed = queenPocketed;
            this.queenCovered = queenCovered;
            this.lastStrike = lastStrike;
            this.targetScore = targetScore;
            this.extraTurn = extraTurn;
        }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private List<Piece> pieces;
            private String currentPlayerId;
            private Map<String, Integer> scores;
            private Map<String, String> playerColors;
            private Map<String, String> teams;
            private boolean queenPocketed;
            private boolean queenCovered;
            private LastStrike lastStrike;
            private int targetScore = 29;
            private boolean extraTurn;

            public Builder pieces(List<Piece> pieces) { this.pieces = pieces; return this; }
            public Builder currentPlayerId(String id) { this.currentPlayerId = id; return this; }
            public Builder scores(Map<String, Integer> scores) { this.scores = scores; return this; }
            public Builder playerColors(Map<String, String> playerColors) { this.playerColors = playerColors; return this; }
            public Builder teams(Map<String, String> teams) { this.teams = teams; return this; }
            public Builder queenPocketed(boolean queenPocketed) { this.queenPocketed = queenPocketed; return this; }
            public Builder queenCovered(boolean queenCovered) { this.queenCovered = queenCovered; return this; }
            public Builder lastStrike(LastStrike lastStrike) { this.lastStrike = lastStrike; return this; }
            public Builder targetScore(int targetScore) { this.targetScore = targetScore; return this; }
            public Builder extraTurn(boolean extraTurn) { this.extraTurn = extraTurn; return this; }

            public Details build() {
                return new Details(pieces, currentPlayerId, scores, playerColors, teams,
                        queenPocketed, queenCovered, lastStrike, targetScore, extraTurn);
            }
        }

        public List<Piece> getPieces() { return pieces; }
        public void setPieces(List<Piece> pieces) { this.pieces = pieces; }
        public String getCurrentPlayerId() { return currentPlayerId; }
        public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }
        public Map<String, Integer> getScores() { return scores; }
        public void setScores(Map<String, Integer> scores) { this.scores = scores; }
        public Map<String, String> getPlayerColors() { return playerColors; }
        public void setPlayerColors(Map<String, String> playerColors) { this.playerColors = playerColors; }
        public Map<String, String> getTeams() { return teams; }
        public void setTeams(Map<String, String> teams) { this.teams = teams; }
        public boolean isQueenPocketed() { return queenPocketed; }
        public void setQueenPocketed(boolean queenPocketed) { this.queenPocketed = queenPocketed; }
        public boolean isQueenCovered() { return queenCovered; }
        public void setQueenCovered(boolean queenCovered) { this.queenCovered = queenCovered; }
        public LastStrike getLastStrike() { return lastStrike; }
        public void setLastStrike(LastStrike lastStrike) { this.lastStrike = lastStrike; }
        public int getTargetScore() { return targetScore; }
        public void setTargetScore(int targetScore) { this.targetScore = targetScore; }
        public boolean isExtraTurn() { return extraTurn; }
        public void setExtraTurn(boolean extraTurn) { this.extraTurn = extraTurn; }
    }

    // ---- Last strike result for client animation ----
    public static class LastStrike {
        private String playerId;
        private double strikerX;
        private double angle;
        private double power;
        private List<String> pocketedTypes;
        private boolean pocketedQueen;
        private boolean pocketedStriker;
        private int pointsScored;

        public LastStrike() {}

        public LastStrike(String playerId, double strikerX, double angle, double power,
                          List<String> pocketedTypes, boolean pocketedQueen,
                          boolean pocketedStriker, int pointsScored) {
            this.playerId = playerId;
            this.strikerX = strikerX;
            this.angle = angle;
            this.power = power;
            this.pocketedTypes = pocketedTypes;
            this.pocketedQueen = pocketedQueen;
            this.pocketedStriker = pocketedStriker;
            this.pointsScored = pointsScored;
        }

        public String getPlayerId() { return playerId; }
        public void setPlayerId(String playerId) { this.playerId = playerId; }
        public double getStrikerX() { return strikerX; }
        public void setStrikerX(double strikerX) { this.strikerX = strikerX; }
        public double getAngle() { return angle; }
        public void setAngle(double angle) { this.angle = angle; }
        public double getPower() { return power; }
        public void setPower(double power) { this.power = power; }
        public List<String> getPocketedTypes() { return pocketedTypes; }
        public void setPocketedTypes(List<String> pocketedTypes) { this.pocketedTypes = pocketedTypes; }
        public boolean isPocketedQueen() { return pocketedQueen; }
        public void setPocketedQueen(boolean pocketedQueen) { this.pocketedQueen = pocketedQueen; }
        public boolean isPocketedStriker() { return pocketedStriker; }
        public void setPocketedStriker(boolean pocketedStriker) { this.pocketedStriker = pocketedStriker; }
        public int getPointsScored() { return pointsScored; }
        public void setPointsScored(int pointsScored) { this.pointsScored = pointsScored; }
    }

    // ---- Builder ----
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

        public CarromState build() {
            return new CarromState(gameId, status, players, winner, sequence, updatedAt, details);
        }
    }

    @Override public String getGameType() { return "CARROM"; }
    @Override public String getGameId() { return gameId; }
    public void setGameId(String gameId) { this.gameId = gameId; }
    @Override public GameStatus getStatus() { return status; }
    public void setStatus(GameStatus status) { this.status = status; }
    @Override public List<String> getPlayers() { return players; }
    public void setPlayers(List<String> players) { this.players = players; }
    @Override public String getWinner() { return winner; }
    public void setWinner(String winner) { this.winner = winner; }
    @Override public int getSequence() { return sequence; }
    public void setSequence(int sequence) { this.sequence = sequence; }
    @Override public long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }
    @Override public Details getDetails() { return details; }
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
            map.put("scores", details.getScores());
            map.put("playerColors", details.getPlayerColors());
            map.put("teams", details.getTeams());
            map.put("queenPocketed", details.isQueenPocketed());
            map.put("queenCovered", details.isQueenCovered());
            map.put("targetScore", details.getTargetScore());
            map.put("extraTurn", details.isExtraTurn());
            // Serialize pieces
            List<Map<String, Object>> pieceList = new ArrayList<>();
            if (details.getPieces() != null) {
                for (Piece p : details.getPieces()) {
                    Map<String, Object> pm = new HashMap<>();
                    pm.put("type", p.getType());
                    pm.put("x", p.getX());
                    pm.put("y", p.getY());
                    pm.put("pocketed", p.isPocketed());
                    pieceList.add(pm);
                }
            }
            map.put("pieces", pieceList);
            // Serialize lastStrike
            if (details.getLastStrike() != null) {
                LastStrike ls = details.getLastStrike();
                Map<String, Object> lsMap = new HashMap<>();
                lsMap.put("playerId", ls.getPlayerId());
                lsMap.put("strikerX", ls.getStrikerX());
                lsMap.put("angle", ls.getAngle());
                lsMap.put("power", ls.getPower());
                lsMap.put("pocketedTypes", ls.getPocketedTypes());
                lsMap.put("pocketedQueen", ls.isPocketedQueen());
                lsMap.put("pocketedStriker", ls.isPocketedStriker());
                lsMap.put("pointsScored", ls.getPointsScored());
                map.put("lastStrike", lsMap);
            }
        }
        return map;
    }
}
