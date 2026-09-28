package com.example.gameplatform.game.ludo;

import com.example.gameplatform.game.core.GameConfiguration;

import java.util.HashMap;
import java.util.Map;

public class LudoConfiguration implements GameConfiguration {
    private int piecesPerPlayer = 4;

    public LudoConfiguration() {}

    public LudoConfiguration(int piecesPerPlayer) {
        this.piecesPerPlayer = piecesPerPlayer > 0 ? piecesPerPlayer : 4;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int piecesPerPlayer = 4;

        public Builder piecesPerPlayer(int piecesPerPlayer) { this.piecesPerPlayer = piecesPerPlayer; return this; }
        public LudoConfiguration build() {
            return new LudoConfiguration(piecesPerPlayer);
        }
    }

    @Override
    public Map<String, Object> getCustomOptions() {
        Map<String, Object> map = new HashMap<>();
        map.put("piecesPerPlayer", piecesPerPlayer);
        return map;
    }

    public int getPiecesPerPlayer() { return piecesPerPlayer; }
    public void setPiecesPerPlayer(int piecesPerPlayer) { this.piecesPerPlayer = piecesPerPlayer; }
}
