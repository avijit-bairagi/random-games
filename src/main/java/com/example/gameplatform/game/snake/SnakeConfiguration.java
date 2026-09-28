package com.example.gameplatform.game.snake;

import com.example.gameplatform.game.core.GameConfiguration;

import java.util.HashMap;
import java.util.Map;

public class SnakeConfiguration implements GameConfiguration {
    private int boardSize = 100;

    public SnakeConfiguration() {}

    public SnakeConfiguration(int boardSize) {
        this.boardSize = boardSize > 0 ? boardSize : 100;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int boardSize = 100;

        public Builder boardSize(int boardSize) { this.boardSize = boardSize; return this; }
        public SnakeConfiguration build() {
            return new SnakeConfiguration(boardSize);
        }
    }

    @Override
    public Map<String, Object> getCustomOptions() {
        Map<String, Object> map = new HashMap<>();
        map.put("boardSize", boardSize);
        return map;
    }

    public int getBoardSize() { return boardSize; }
    public void setBoardSize(int boardSize) { this.boardSize = boardSize; }
}
