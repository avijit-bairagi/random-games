package com.example.gameplatform.game.carrom;

import com.example.gameplatform.game.core.GameConfiguration;
import java.util.Map;

/**
 * Configuration for a Carrom game session.
 */
public class CarromConfiguration implements GameConfiguration {

    /**
     * Maximum number of turns per player before the game is declared a draw.
     * Defaults to 50.
     */
    private int maxTurns;

    public CarromConfiguration() {
        this.maxTurns = 50;
    }

    public CarromConfiguration(int maxTurns) {
        this.maxTurns = maxTurns;
    }

    public static Builder builder() { return new Builder(); }

    @Override
    public Map<String, Object> getCustomOptions() {
        return Map.of("maxTurns", maxTurns);
    }

    public int getMaxTurns() { return maxTurns; }
    public void setMaxTurns(int maxTurns) { this.maxTurns = maxTurns; }

    // ---- Builder ----

    public static class Builder {
        private int maxTurns = 50;

        public Builder maxTurns(int maxTurns) { this.maxTurns = maxTurns; return this; }

        public CarromConfiguration build() {
            return new CarromConfiguration(maxTurns);
        }
    }
}
