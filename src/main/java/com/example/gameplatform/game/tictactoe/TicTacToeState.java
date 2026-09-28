package com.example.gameplatform.game.tictactoe;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TicTacToeState implements GameState<TicTacToeState.Details> {

    private String gameId;
    private GameStatus status;
    private List<String> players;
    private String winner;
    private int sequence;
    private long updatedAt;
    private Details details;

    public TicTacToeState() {}

    public TicTacToeState(String gameId, GameStatus status, List<String> players, String winner,
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
        private String[][] board; // 3x3 array containing "", "X", "O"
        private String currentPlayerId;
        private Map<String, String> playerMarks; // playerId -> "X" or "O"
        private String playerX;
        private String playerO;
        private int movesCount;
        private List<int[]> winningLine; // e.g. [[0,0],[0,1],[0,2]]

        public Details() {}

        public Details(String[][] board, String currentPlayerId, Map<String, String> playerMarks,
                       String playerX, String playerO, int movesCount, List<int[]> winningLine) {
            this.board = board;
            this.currentPlayerId = currentPlayerId;
            this.playerMarks = playerMarks;
            this.playerX = playerX;
            this.playerO = playerO;
            this.movesCount = movesCount;
            this.winningLine = winningLine;
        }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String[][] board;
            private String currentPlayerId;
            private Map<String, String> playerMarks;
            private String playerX;
            private String playerO;
            private int movesCount;
            private List<int[]> winningLine;

            public Builder board(String[][] board) { this.board = board; return this; }
            public Builder currentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; return this; }
            public Builder playerMarks(Map<String, String> playerMarks) { this.playerMarks = playerMarks; return this; }
            public Builder playerX(String playerX) { this.playerX = playerX; return this; }
            public Builder playerO(String playerO) { this.playerO = playerO; return this; }
            public Builder movesCount(int movesCount) { this.movesCount = movesCount; return this; }
            public Builder winningLine(List<int[]> winningLine) { this.winningLine = winningLine; return this; }
            public Details build() {
                return new Details(board, currentPlayerId, playerMarks, playerX, playerO, movesCount, winningLine);
            }
        }

        public String[][] getBoard() { return board; }
        public void setBoard(String[][] board) { this.board = board; }
        public String getCurrentPlayerId() { return currentPlayerId; }
        public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }
        public Map<String, String> getPlayerMarks() { return playerMarks; }
        public void setPlayerMarks(Map<String, String> playerMarks) { this.playerMarks = playerMarks; }
        public String getPlayerX() { return playerX; }
        public void setPlayerX(String playerX) { this.playerX = playerX; }
        public String getPlayerO() { return playerO; }
        public void setPlayerO(String playerO) { this.playerO = playerO; }
        public int getMovesCount() { return movesCount; }
        public void setMovesCount(int movesCount) { this.movesCount = movesCount; }
        public List<int[]> getWinningLine() { return winningLine; }
        public void setWinningLine(List<int[]> winningLine) { this.winningLine = winningLine; }
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
        public TicTacToeState build() {
            return new TicTacToeState(gameId, status, players, winner, sequence, updatedAt, details);
        }
    }

    @Override
    public String getGameType() { return "TIC_TAC_TOE"; }
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
            map.put("playerMarks", details.getPlayerMarks());
            map.put("board", details.getBoard());
            map.put("winningLine", details.getWinningLine());
        }
        return map;
    }
}
