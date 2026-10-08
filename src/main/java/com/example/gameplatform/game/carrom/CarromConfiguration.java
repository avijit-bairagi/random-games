package com.example.gameplatform.game.carrom;

import com.example.gameplatform.game.core.GameConfiguration;

import java.util.HashMap;
import java.util.Map;

public class CarromConfiguration implements GameConfiguration {
    // Number of players: 2 or 4
    private int playerCount;
    // Points needed to win
    private int targetScore;

    public CarromConfiguration() {
        this.playerCount = 2;
        this.targetScore = 29;
    }

    public CarromConfiguration(int playerCount, int targetScore) {
        this.playerCount = (playerCount == 4) ? 4 : 2;
        this.targetScore = targetScore > 0 ? targetScore : 29;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int playerCount = 2;
        private int targetScore = 29;

        public Builder playerCount(int playerCount) { this.playerCount = playerCount; return this; }
        public Builder targetScore(int targetScore) { this.targetScore = targetScore; return this; }
        public CarromConfiguration build() {
            return new CarromConfiguration(playerCount, targetScore);
        }
    }

    @Override
    public Map<String, Object> getCustomOptions() {
        Map<String, Object> opts = new HashMap<>();
        opts.put("playerCount", playerCount);
        opts.put("targetScore", targetScore);
        return opts;
    }

    public int getPlayerCount() { return playerCount; }
    public void setPlayerCount(int playerCount) { this.playerCount = playerCount; }
    public int getTargetScore() { return targetScore; }
    public void setTargetScore(int targetScore) { this.targetScore = targetScore; }
}
