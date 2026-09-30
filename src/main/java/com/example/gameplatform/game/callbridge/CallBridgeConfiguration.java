package com.example.gameplatform.game.callbridge;

import com.example.gameplatform.game.core.GameConfiguration;

import java.util.HashMap;
import java.util.Map;

public class CallBridgeConfiguration implements GameConfiguration {
    public static final String WIN_CONDITION_ROUNDS = "ROUNDS";
    public static final String WIN_CONDITION_POINTS = "POINTS";

    private int totalRounds = 5;
    private String winCondition = WIN_CONDITION_ROUNDS;
    private int pointThreshold = 50;

    public CallBridgeConfiguration() {}

    public CallBridgeConfiguration(int totalRounds) {
        this.totalRounds = totalRounds > 0 ? totalRounds : 5;
        this.winCondition = WIN_CONDITION_ROUNDS;
        this.pointThreshold = 50;
    }

    public CallBridgeConfiguration(int totalRounds, String winCondition, int pointThreshold) {
        this.totalRounds = totalRounds > 0 ? totalRounds : 5;
        this.winCondition = winCondition != null ? winCondition : WIN_CONDITION_ROUNDS;
        this.pointThreshold = pointThreshold > 0 ? pointThreshold : 50;
    }

    public int getTotalRounds() { return totalRounds; }
    public void setTotalRounds(int totalRounds) { this.totalRounds = totalRounds > 0 ? totalRounds : 5; }

    public String getWinCondition() { return winCondition; }
    public void setWinCondition(String winCondition) { this.winCondition = winCondition; }

    public int getPointThreshold() { return pointThreshold; }
    public void setPointThreshold(int pointThreshold) { this.pointThreshold = pointThreshold > 0 ? pointThreshold : 50; }

    @Override
    public Map<String, Object> getCustomOptions() {
        Map<String, Object> options = new HashMap<>();
        options.put("totalRounds", totalRounds);
        options.put("winCondition", winCondition);
        options.put("pointThreshold", pointThreshold);
        return options;
    }
}
