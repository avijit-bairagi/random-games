package com.example.gameplatform.game.twentynine;

import com.example.gameplatform.game.core.GameConfiguration;

import java.util.HashMap;
import java.util.Map;

public class TwentyNineConfiguration implements GameConfiguration {
    /** Number of game points needed to win the match (default 6) */
    private int targetGamePoints;

    public TwentyNineConfiguration() {
        this.targetGamePoints = 6;
    }

    public TwentyNineConfiguration(int targetGamePoints) {
        this.targetGamePoints = targetGamePoints > 0 ? targetGamePoints : 6;
    }

    public int getTargetGamePoints() { return targetGamePoints; }
    public void setTargetGamePoints(int targetGamePoints) { this.targetGamePoints = targetGamePoints; }

    @Override
    public Map<String, Object> getCustomOptions() {
        Map<String, Object> options = new HashMap<>();
        options.put("targetGamePoints", targetGamePoints);
        return options;
    }
}
