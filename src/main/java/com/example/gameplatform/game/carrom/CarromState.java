package com.example.gameplatform.game.carrom;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Full game state for a Carrom session.
 *
 * <p>Board coordinate system: origin (0, 0) is the board centre.
 * The board extends from {@code -HALF_BOARD} to {@code +HALF_BOARD} on both axes.
 * Player 1's baseline is at {@code y = +HALF_BOARD}; Player 2's at {@code y = -HALF_BOARD}.
 */
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
        this.gameId    = gameId;
        this.status    = status;
        this.players   = players;
        this.winner    = winner;
        this.sequence  = sequence;
        this.updatedAt = updatedAt;
        this.details   = details;
    }

    public static Builder builder() { return new Builder(); }

    // ---- GameState interface ----

    @Override public String getGameType() { return "CARROM"; }
    @Override public String getGameId() { return gameId; }
    @Override public GameStatus getStatus() { return status; }
    @Override public List<String> getPlayers() { return players; }
    @Override public String getWinner() { return winner; }
    @Override public int getSequence() { return sequence; }
    @Override public long getUpdatedAt() { return updatedAt; }
    @Override public Details getDetails() { return details; }

    @Override
    public Map<String, Object> toSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("gameId",   gameId);
        summary.put("gameType", "CARROM");
        summary.put("status",   status);
        summary.put("winner",   winner != null ? winner : "");
        summary.put("sequence", sequence);

        if (details != null) {
            Map<String, Object> det = new LinkedHashMap<>();
            det.put("currentPlayerId",  details.getCurrentPlayerId());
            det.put("player1Id",        details.getPlayer1Id());
            det.put("player2Id",        details.getPlayer2Id());
            det.put("player1Color",     details.getPlayer1Color());
            det.put("player2Color",     details.getPlayer2Color());
            det.put("coins",            details.getCoins());
            det.put("player1Pocketed",  details.getPlayer1Pocketed());
            det.put("player2Pocketed",  details.getPlayer2Pocketed());
            det.put("queenPocketed",    details.isQueenPocketed());
            det.put("queenCoveredBy",   details.getQueenCoveredBy() != null ? details.getQueenCoveredBy() : "");
            det.put("lastStrike",       details.getLastStrike());
            det.put("turnNumber",       details.getTurnNumber());
            det.put("consecutiveFouls", details.getConsecutiveFouls());
            det.put("dueToReturnQueen", details.isDueToReturnQueen());
            summary.put("details", det);
        }
        return summary;
    }

    // ---- Setters ----

    public void setGameId(String gameId) { this.gameId = gameId; }
    public void setStatus(GameStatus status) { this.status = status; }
    public void setPlayers(List<String> players) { this.players = players; }
    public void setWinner(String winner) { this.winner = winner; }
    public void setSequence(int sequence) { this.sequence = sequence; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }
    public void setDetails(Details details) { this.details = details; }

    // ============================== BUILDER ==============================

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

    // ============================== DETAILS ==============================

    /**
     * Game-specific board details sent to clients.
     */
    public static class Details {

        // ---- Board ----

        /** All coins currently on the board (not yet pocketed). */
        private List<Coin> coins;

        // ---- Players ----

        private String currentPlayerId;
        private String player1Id;
        private String player2Id;

        /** "BLACK" or "WHITE" assigned to player 1. */
        private String player1Color;

        /** Opposite colour for player 2. */
        private String player2Color;

        // ---- Scoring ----

        /** Number of own-coloured coins player 1 has pocketed. */
        private int player1Pocketed;

        /** Number of own-coloured coins player 2 has pocketed. */
        private int player2Pocketed;

        /** True once the queen has been pocketed by any player. */
        private boolean queenPocketed;

        /**
         * Player ID who pocketed the queen and has to "cover" her by pocketing
         * one of their own coins on the next successful strike.
         * Null if queen is already covered or not yet pocketed.
         */
        private String queenCoveredBy;

        // ---- Turn tracking ----

        private int turnNumber;

        /** Consecutive fouls in the current player's streak (3 → penalty). */
        private int consecutiveFouls;

        /**
         * If true, the current player must return the queen coin
         * to the board (queen was pocketed last turn but not covered).
         */
        private boolean dueToReturnQueen;

        // ---- Last strike result (for animation / UI) ----

        private StrikeResult lastStrike;

        // ---- Constructors ----

        public Details() {}

        // ---- Builder ----

        public static Builder builder() { return new Builder(); }

        // ---- Getters / Setters ----

        public List<Coin> getCoins() { return coins; }
        public void setCoins(List<Coin> coins) { this.coins = coins; }

        public String getCurrentPlayerId() { return currentPlayerId; }
        public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }

        public String getPlayer1Id() { return player1Id; }
        public void setPlayer1Id(String player1Id) { this.player1Id = player1Id; }

        public String getPlayer2Id() { return player2Id; }
        public void setPlayer2Id(String player2Id) { this.player2Id = player2Id; }

        public String getPlayer1Color() { return player1Color; }
        public void setPlayer1Color(String player1Color) { this.player1Color = player1Color; }

        public String getPlayer2Color() { return player2Color; }
        public void setPlayer2Color(String player2Color) { this.player2Color = player2Color; }

        public int getPlayer1Pocketed() { return player1Pocketed; }
        public void setPlayer1Pocketed(int player1Pocketed) { this.player1Pocketed = player1Pocketed; }

        public int getPlayer2Pocketed() { return player2Pocketed; }
        public void setPlayer2Pocketed(int player2Pocketed) { this.player2Pocketed = player2Pocketed; }

        public boolean isQueenPocketed() { return queenPocketed; }
        public void setQueenPocketed(boolean queenPocketed) { this.queenPocketed = queenPocketed; }

        public String getQueenCoveredBy() { return queenCoveredBy; }
        public void setQueenCoveredBy(String queenCoveredBy) { this.queenCoveredBy = queenCoveredBy; }

        public int getTurnNumber() { return turnNumber; }
        public void setTurnNumber(int turnNumber) { this.turnNumber = turnNumber; }

        public int getConsecutiveFouls() { return consecutiveFouls; }
        public void setConsecutiveFouls(int consecutiveFouls) { this.consecutiveFouls = consecutiveFouls; }

        public boolean isDueToReturnQueen() { return dueToReturnQueen; }
        public void setDueToReturnQueen(boolean dueToReturnQueen) { this.dueToReturnQueen = dueToReturnQueen; }

        public StrikeResult getLastStrike() { return lastStrike; }
        public void setLastStrike(StrikeResult lastStrike) { this.lastStrike = lastStrike; }

        // ---- Details.Builder ----

        public static class Builder {
            private List<Coin> coins = new ArrayList<>();
            private String currentPlayerId;
            private String player1Id;
            private String player2Id;
            private String player1Color;
            private String player2Color;
            private int player1Pocketed;
            private int player2Pocketed;
            private boolean queenPocketed;
            private String queenCoveredBy;
            private int turnNumber;
            private int consecutiveFouls;
            private boolean dueToReturnQueen;
            private StrikeResult lastStrike;

            public Builder coins(List<Coin> coins) { this.coins = coins; return this; }
            public Builder currentPlayerId(String id) { this.currentPlayerId = id; return this; }
            public Builder player1Id(String id) { this.player1Id = id; return this; }
            public Builder player2Id(String id) { this.player2Id = id; return this; }
            public Builder player1Color(String c) { this.player1Color = c; return this; }
            public Builder player2Color(String c) { this.player2Color = c; return this; }
            public Builder player1Pocketed(int n) { this.player1Pocketed = n; return this; }
            public Builder player2Pocketed(int n) { this.player2Pocketed = n; return this; }
            public Builder queenPocketed(boolean b) { this.queenPocketed = b; return this; }
            public Builder queenCoveredBy(String id) { this.queenCoveredBy = id; return this; }
            public Builder turnNumber(int n) { this.turnNumber = n; return this; }
            public Builder consecutiveFouls(int n) { this.consecutiveFouls = n; return this; }
            public Builder dueToReturnQueen(boolean b) { this.dueToReturnQueen = b; return this; }
            public Builder lastStrike(StrikeResult r) { this.lastStrike = r; return this; }

            public Details build() {
                Details d = new Details();
                d.coins              = coins;
                d.currentPlayerId    = currentPlayerId;
                d.player1Id          = player1Id;
                d.player2Id          = player2Id;
                d.player1Color       = player1Color;
                d.player2Color       = player2Color;
                d.player1Pocketed    = player1Pocketed;
                d.player2Pocketed    = player2Pocketed;
                d.queenPocketed      = queenPocketed;
                d.queenCoveredBy     = queenCoveredBy;
                d.turnNumber         = turnNumber;
                d.consecutiveFouls   = consecutiveFouls;
                d.dueToReturnQueen   = dueToReturnQueen;
                d.lastStrike         = lastStrike;
                return d;
            }
        }
    }

    // ============================== COIN ==============================

    /**
     * Represents a single coin (puck) on the board.
     */
    public static class Coin {

        /** Unique identifier for this coin instance (e.g. "B1"–"B9", "W1"–"W9", "Q"). */
        private String id;

        /**
         * Coin type: {@code "BLACK"}, {@code "WHITE"}, or {@code "QUEEN"}.
         */
        private String type;

        /** X position on the board, range [-HALF_BOARD, HALF_BOARD]. */
        private double x;

        /** Y position on the board, range [-HALF_BOARD, HALF_BOARD]. */
        private double y;

        public Coin() {}

        public Coin(String id, String type, double x, double y) {
            this.id   = id;
            this.type = type;
            this.x    = x;
            this.y    = y;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public double getX() { return x; }
        public void setX(double x) { this.x = x; }

        public double getY() { return y; }
        public void setY(double y) { this.y = y; }
    }

    // ============================== STRIKE RESULT ==============================

    /**
     * Summary of what happened during a strike (sent to clients for animation).
     */
    public static class StrikeResult {

        private String playerId;

        /** Coins pocketed during this strike (by id). */
        private List<String> pocketedCoinIds;

        /** Was the striker itself pocketed? */
        private boolean strikerPocketed;

        /** Was the queen pocketed this turn? */
        private boolean queenPocketed;

        /** Was a foul committed? */
        private boolean foul;

        /** Human-readable foul/event message. */
        private String message;

        // Snapshot of coin positions AFTER the strike (for smooth client animation).
        private List<Coin> coinsAfter;

        public StrikeResult() {}

        public StrikeResult(String playerId, List<String> pocketedCoinIds,
                            boolean strikerPocketed, boolean queenPocketed,
                            boolean foul, String message, List<Coin> coinsAfter) {
            this.playerId        = playerId;
            this.pocketedCoinIds = pocketedCoinIds;
            this.strikerPocketed = strikerPocketed;
            this.queenPocketed   = queenPocketed;
            this.foul            = foul;
            this.message         = message;
            this.coinsAfter      = coinsAfter;
        }

        public static Builder builder() { return new Builder(); }

        public String getPlayerId() { return playerId; }
        public void setPlayerId(String playerId) { this.playerId = playerId; }

        public List<String> getPocketedCoinIds() { return pocketedCoinIds; }
        public void setPocketedCoinIds(List<String> ids) { this.pocketedCoinIds = ids; }

        public boolean isStrikerPocketed() { return strikerPocketed; }
        public void setStrikerPocketed(boolean strikerPocketed) { this.strikerPocketed = strikerPocketed; }

        public boolean isQueenPocketed() { return queenPocketed; }
        public void setQueenPocketed(boolean queenPocketed) { this.queenPocketed = queenPocketed; }

        public boolean isFoul() { return foul; }
        public void setFoul(boolean foul) { this.foul = foul; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public List<Coin> getCoinsAfter() { return coinsAfter; }
        public void setCoinsAfter(List<Coin> coinsAfter) { this.coinsAfter = coinsAfter; }

        public static class Builder {
            private String playerId;
            private List<String> pocketedCoinIds = new ArrayList<>();
            private boolean strikerPocketed;
            private boolean queenPocketed;
            private boolean foul;
            private String message = "";
            private List<Coin> coinsAfter = new ArrayList<>();

            public Builder playerId(String id) { this.playerId = id; return this; }
            public Builder pocketedCoinIds(List<String> ids) { this.pocketedCoinIds = ids; return this; }
            public Builder strikerPocketed(boolean b) { this.strikerPocketed = b; return this; }
            public Builder queenPocketed(boolean b) { this.queenPocketed = b; return this; }
            public Builder foul(boolean b) { this.foul = b; return this; }
            public Builder message(String m) { this.message = m; return this; }
            public Builder coinsAfter(List<Coin> c) { this.coinsAfter = c; return this; }

            public StrikeResult build() {
                return new StrikeResult(playerId, pocketedCoinIds,
                        strikerPocketed, queenPocketed, foul, message, coinsAfter);
            }
        }
    }
}
