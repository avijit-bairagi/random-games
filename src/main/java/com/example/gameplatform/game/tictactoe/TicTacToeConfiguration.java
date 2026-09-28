package com.example.gameplatform.game.tictactoe;

import com.example.gameplatform.game.core.GameConfiguration;

import java.util.HashMap;
import java.util.Map;

public class TicTacToeConfiguration implements GameConfiguration {
    private int boardSize = 3;

    public TicTacToeConfiguration() {}

    public TicTacToeConfiguration(int boardSize) {
        this.boardSize = boardSize > 0 ? boardSize : 3;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int boardSize = 3;

        public Builder boardSize(int boardSize) { this.boardSize = boardSize; return this; }
        public TicTacToeConfiguration build() {
            return new TicTacToeConfiguration(boardSize);
        }
    }

    @Override
    public Map<String, Object> getCustomOptions() {
        Map<String, Object> opts = new HashMap<>();
        opts.put("boardSize", boardSize);
        return opts;
    }

    public int getBoardSize() { return boardSize; }
    public void setBoardSize(int boardSize) { this.boardSize = boardSize; }
}
