package com.example.gameplatform.websocket.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class OutboundMessage {
    private String type;
    private String roomId;
    private String gameId;
    private String playerId;
    private String requestId;
    private Integer sequence;
    private String code;
    private String message;
    private Object payload;
    private long timestamp = Instant.now().toEpochMilli();

    public OutboundMessage() {}

    public OutboundMessage(String type, String roomId, String gameId, String playerId, String requestId,
                           Integer sequence, String code, String message, Object payload, long timestamp) {
        this.type = type;
        this.roomId = roomId;
        this.gameId = gameId;
        this.playerId = playerId;
        this.requestId = requestId;
        this.sequence = sequence;
        this.code = code;
        this.message = message;
        this.payload = payload;
        this.timestamp = timestamp;
    }

    public static OutboundMessage stateUpdate(String roomId, String gameId, int sequence, Object payload) {
        return builder()
                .type(MessageTypes.GAME_STATE_UPDATED)
                .roomId(roomId)
                .gameId(gameId)
                .sequence(sequence)
                .payload(payload)
                .build();
    }

    public static OutboundMessage error(String roomId, String requestId, String code, String message) {
        return builder()
                .type(MessageTypes.GAME_ERROR)
                .roomId(roomId)
                .requestId(requestId)
                .code(code)
                .message(message)
                .build();
    }

    public static OutboundMessage of(String type, String roomId, Object payload) {
        return builder()
                .type(type)
                .roomId(roomId)
                .payload(payload)
                .build();
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
        private Integer sequence;
        private String code;
        private String message;
        private Object payload;
        private long timestamp = Instant.now().toEpochMilli();

        public Builder type(String type) { this.type = type; return this; }
        public Builder roomId(String roomId) { this.roomId = roomId; return this; }
        public Builder gameId(String gameId) { this.gameId = gameId; return this; }
        public Builder playerId(String playerId) { this.playerId = playerId; return this; }
        public Builder requestId(String requestId) { this.requestId = requestId; return this; }
        public Builder sequence(Integer sequence) { this.sequence = sequence; return this; }
        public Builder code(String code) { this.code = code; return this; }
        public Builder message(String message) { this.message = message; return this; }
        public Builder payload(Object payload) { this.payload = payload; return this; }
        public Builder timestamp(long timestamp) { this.timestamp = timestamp; return this; }

        public OutboundMessage build() {
            return new OutboundMessage(type, roomId, gameId, playerId, requestId, sequence, code, message, payload, timestamp);
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
    public Integer getSequence() { return sequence; }
    public void setSequence(Integer sequence) { this.sequence = sequence; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
