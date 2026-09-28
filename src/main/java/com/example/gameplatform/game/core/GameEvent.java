package com.example.gameplatform.game.core;

import java.util.Map;

public class GameEvent {
    private String eventType;
    private String gameId;
    private String playerId;
    private Map<String, Object> payload;
    private long timestamp;

    public GameEvent() {}

    public GameEvent(String eventType, String gameId, String playerId, Map<String, Object> payload, long timestamp) {
        this.eventType = eventType;
        this.gameId = gameId;
        this.playerId = playerId;
        this.payload = payload != null ? payload : Map.of();
        this.timestamp = timestamp;
    }

    public static GameEvent of(String eventType, String gameId, String playerId, Map<String, Object> payload) {
        return new GameEvent(eventType, gameId, playerId, payload, System.currentTimeMillis());
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String eventType;
        private String gameId;
        private String playerId;
        private Map<String, Object> payload = Map.of();
        private long timestamp = System.currentTimeMillis();

        public Builder eventType(String eventType) { this.eventType = eventType; return this; }
        public Builder gameId(String gameId) { this.gameId = gameId; return this; }
        public Builder playerId(String playerId) { this.playerId = playerId; return this; }
        public Builder payload(Map<String, Object> payload) { this.payload = payload; return this; }
        public Builder timestamp(long timestamp) { this.timestamp = timestamp; return this; }
        public GameEvent build() {
            return new GameEvent(eventType, gameId, playerId, payload, timestamp);
        }
    }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getGameId() { return gameId; }
    public void setGameId(String gameId) { this.gameId = gameId; }
    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }
    public Map<String, Object> getPayload() { return payload; }
    public void setPayload(Map<String, Object> payload) { this.payload = payload; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
