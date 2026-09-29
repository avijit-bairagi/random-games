package com.example.gameplatform.game.chess;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import java.util.List;
import java.util.Map;

public class ChessState implements GameState<ChessState.Details> {
    private String gameId;
    private GameStatus status;
    private List<String> players;
    private String winner;
    private int sequence;
    private long updatedAt;
    private Details details;

    public ChessState() {}

    public ChessState(String gameId, GameStatus status, List<String> players, String winner,
                      int sequence, long updatedAt, Details details) {
        this.gameId = gameId;
        this.status = status;
        this.players = players;
        this.winner = winner;
        this.sequence = sequence;
        this.updatedAt = updatedAt;
        this.details = details;
    }

    public static Builder builder() {
        return new Builder();
    }

    @Override public String getGameType() { return "CHESS"; }
    @Override public String getGameId() { return gameId; }
    @Override public GameStatus getStatus() { return status; }
    @Override public List<String> getPlayers() { return players; }
    @Override public String getWinner() { return winner; }
    @Override public int getSequence() { return sequence; }
    @Override public long getUpdatedAt() { return updatedAt; }
    @Override public Details getDetails() { return details; }

    @Override
    public Map<String, Object> toSummary() {
        return Map.of(
            "gameId", gameId,
            "status", status,
            "winner", winner != null ? winner : "",
            "currentPlayerId", details != null ? details.getCurrentPlayerId() : ""
        );
    }

    public void setGameId(String gameId) { this.gameId = gameId; }
    public void setStatus(GameStatus status) { this.status = status; }
    public void setPlayers(List<String> players) { this.players = players; }
    public void setWinner(String winner) { this.winner = winner; }
    public void setSequence(int sequence) { this.sequence = sequence; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }
    public void setDetails(Details details) { this.details = details; }

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

        public ChessState build() {
            return new ChessState(gameId, status, players, winner, sequence, updatedAt, details);
        }
    }

    public static class Details {
        private String fen;
        private String currentPlayerId;
        private String whitePlayerId;
        private String blackPlayerId;
        private List<String> moveHistory;
        private boolean isCheck;
        private boolean isCheckmate;
        private boolean isDraw;
        private String drawReason;

        public Details() {}

        public Details(String fen, String currentPlayerId, String whitePlayerId, String blackPlayerId,
                       List<String> moveHistory, boolean isCheck, boolean isCheckmate,
                       boolean isDraw, String drawReason) {
            this.fen = fen;
            this.currentPlayerId = currentPlayerId;
            this.whitePlayerId = whitePlayerId;
            this.blackPlayerId = blackPlayerId;
            this.moveHistory = moveHistory;
            this.isCheck = isCheck;
            this.isCheckmate = isCheckmate;
            this.isDraw = isDraw;
            this.drawReason = drawReason;
        }

        public static Builder builder() {
            return new Builder();
        }

        public String getFen() { return fen; }
        public void setFen(String fen) { this.fen = fen; }
        public String getCurrentPlayerId() { return currentPlayerId; }
        public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }
        public String getWhitePlayerId() { return whitePlayerId; }
        public void setWhitePlayerId(String whitePlayerId) { this.whitePlayerId = whitePlayerId; }
        public String getBlackPlayerId() { return blackPlayerId; }
        public void setBlackPlayerId(String blackPlayerId) { this.blackPlayerId = blackPlayerId; }
        public List<String> getMoveHistory() { return moveHistory; }
        public void setMoveHistory(List<String> moveHistory) { this.moveHistory = moveHistory; }
        public boolean isCheck() { return isCheck; }
        public void setCheck(boolean check) { isCheck = check; }
        public boolean isCheckmate() { return isCheckmate; }
        public void setCheckmate(boolean checkmate) { isCheckmate = checkmate; }
        public boolean isDraw() { return isDraw; }
        public void setDraw(boolean draw) { isDraw = draw; }
        public String getDrawReason() { return drawReason; }
        public void setDrawReason(String drawReason) { this.drawReason = drawReason; }

        public static class Builder {
            private String fen;
            private String currentPlayerId;
            private String whitePlayerId;
            private String blackPlayerId;
            private List<String> moveHistory;
            private boolean isCheck;
            private boolean isCheckmate;
            private boolean isDraw;
            private String drawReason;

            public Builder fen(String fen) { this.fen = fen; return this; }
            public Builder currentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; return this; }
            public Builder whitePlayerId(String whitePlayerId) { this.whitePlayerId = whitePlayerId; return this; }
            public Builder blackPlayerId(String blackPlayerId) { this.blackPlayerId = blackPlayerId; return this; }
            public Builder moveHistory(List<String> moveHistory) { this.moveHistory = moveHistory; return this; }
            public Builder isCheck(boolean isCheck) { this.isCheck = isCheck; return this; }
            public Builder isCheckmate(boolean isCheckmate) { this.isCheckmate = isCheckmate; return this; }
            public Builder isDraw(boolean isDraw) { this.isDraw = isDraw; return this; }
            public Builder drawReason(String drawReason) { this.drawReason = drawReason; return this; }

            public Details build() {
                return new Details(fen, currentPlayerId, whitePlayerId, blackPlayerId,
                        moveHistory, isCheck, isCheckmate, isDraw, drawReason);
            }
        }
    }
}
