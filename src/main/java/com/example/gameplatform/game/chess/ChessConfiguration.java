package com.example.gameplatform.game.chess;

import com.example.gameplatform.game.core.GameConfiguration;
import java.util.Map;

public class ChessConfiguration implements GameConfiguration {
    private int timeLimitMinutes;

    public ChessConfiguration() {}

    public ChessConfiguration(int timeLimitMinutes) {
        this.timeLimitMinutes = timeLimitMinutes;
    }

    public static Builder builder() {
        return new Builder();
    }

    @Override
    public Map<String, Object> getCustomOptions() {
        return Map.of("timeLimitMinutes", timeLimitMinutes);
    }

    public int getTimeLimitMinutes() { return timeLimitMinutes; }
    public void setTimeLimitMinutes(int timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }

    public static class Builder {
        private int timeLimitMinutes = 10;

        public Builder timeLimitMinutes(int timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; return this; }

        public ChessConfiguration build() {
            return new ChessConfiguration(timeLimitMinutes);
        }
    }
}
