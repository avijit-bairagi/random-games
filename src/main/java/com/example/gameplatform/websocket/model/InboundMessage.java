package com.example.gameplatform.websocket.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class InboundMessage {
    private String type;
    private String roomId;
    private String gameId;
    private String playerId;
    private String requestId;
    private Map<String, Object> payload;

    public InboundMessage() {}

    public InboundMessage(String type, String roomId, String gameId, String playerId, String requestId, Map<String, Object> payload) {
        this.type = type;
        this.roomId = roomId;
        this.gameId = gameId;
        this.playerId = playerId;
        this.requestId = requestId;
        this.payload = payload;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String type;
        private String roomId;
        private String gameId;
        private String playerId;
        private String requestId;
        private Map<String, Object> payload;

        public Builder type(String type) { this.type = type; return this; }
        public Builder roomId(String roomId) { this.roomId = roomId; return this; }
        public Builder gameId(String gameId) { this.gameId = gameId; return this; }
        public Builder playerId(String playerId) { this.playerId = playerId; return this; }
        public Builder requestId(String requestId) { this.requestId = requestId; return this; }
        public Builder payload(Map<String, Object> payload) { this.payload = payload; return this; }
        public InboundMessage build() {
            return new InboundMessage(type, roomId, gameId, playerId, requestId, payload);
        }
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getGameId() { return gameId; }
    public void setGameId(String gameId) { this.gameId = gameId; }
    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public Map<String, Object> getPayload() { return payload; }
    public void setPayload(Map<String, Object> payload) { this.payload = payload; }
}
