package com.example.gameplatform.room.dto;

import com.example.gameplatform.room.model.GameRoom;
import com.example.gameplatform.room.model.RoomStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class RoomResponse {
    private String roomId;
    private String name;
    private String gameType;
    private String hostPlayerId;
    private int minPlayers;
    private int maxPlayers;
    private int currentPlayersCount;
    private boolean spectatorAllowed;
    private boolean lateJoinAllowed;
    private RoomStatus status;
    private Instant createdAt;
    private Instant startedAt;
    private List<String> playerIds;
    private List<String> spectatorIds;
    private Map<String, Object> configuration;
    private Object gameStateSummary;

    public RoomResponse() {}

    public RoomResponse(String roomId, String name, String gameType, String hostPlayerId, int minPlayers,
                        int maxPlayers, int currentPlayersCount, boolean spectatorAllowed, boolean lateJoinAllowed,
                        RoomStatus status, Instant createdAt, Instant startedAt, List<String> playerIds,
                        List<String> spectatorIds, Map<String, Object> configuration, Object gameStateSummary) {
        this.roomId = roomId;
        this.name = name;
        this.gameType = gameType;
        this.hostPlayerId = hostPlayerId;
        this.minPlayers = minPlayers;
        this.maxPlayers = maxPlayers;
        this.currentPlayersCount = currentPlayersCount;
        this.spectatorAllowed = spectatorAllowed;
        this.lateJoinAllowed = lateJoinAllowed;
        this.status = status;
        this.createdAt = createdAt;
        this.startedAt = startedAt;
        this.playerIds = playerIds;
        this.spectatorIds = spectatorIds;
        this.configuration = configuration;
        this.gameStateSummary = gameStateSummary;
    }

    public static RoomResponse from(GameRoom room) {
        return builder()
                .roomId(room.getRoomId())
                .name(room.getName())
                .gameType(room.getGameType())
                .hostPlayerId(room.getHostPlayerId())
                .minPlayers(room.getMinPlayers())
                .maxPlayers(room.getMaxPlayers())
                .currentPlayersCount(room.getPlayerIds().size())
                .spectatorAllowed(room.isSpectatorAllowed())
                .lateJoinAllowed(room.isLateJoinAllowed())
                .status(room.getStatus())
                .createdAt(room.getCreatedAt())
                .startedAt(room.getStartedAt())
                .playerIds(List.copyOf(room.getPlayerIds()))
                .spectatorIds(List.copyOf(room.getSpectatorIds()))
                .configuration(room.getConfiguration())
                .gameStateSummary(room.getCurrentGameState() != null ? room.getCurrentGameState().toSummary() : null)
                .build();
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String roomId;
        private String name;
        private String gameType;
        private String hostPlayerId;
        private int minPlayers;
        private int maxPlayers;
        private int currentPlayersCount;
        private boolean spectatorAllowed;
        private boolean lateJoinAllowed;
        private RoomStatus status;
        private Instant createdAt;
        private Instant startedAt;
        private List<String> playerIds = List.of();
        private List<String> spectatorIds = List.of();
        private Map<String, Object> configuration = Map.of();
        private Object gameStateSummary;

        public Builder roomId(String roomId) { this.roomId = roomId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder gameType(String gameType) { this.gameType = gameType; return this; }
        public Builder hostPlayerId(String hostPlayerId) { this.hostPlayerId = hostPlayerId; return this; }
        public Builder minPlayers(int minPlayers) { this.minPlayers = minPlayers; return this; }
        public Builder maxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; return this; }
        public Builder currentPlayersCount(int currentPlayersCount) { this.currentPlayersCount = currentPlayersCount; return this; }
        public Builder spectatorAllowed(boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; return this; }
        public Builder lateJoinAllowed(boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; return this; }
        public Builder status(RoomStatus status) { this.status = status; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder startedAt(Instant startedAt) { this.startedAt = startedAt; return this; }
        public Builder playerIds(List<String> playerIds) { this.playerIds = playerIds; return this; }
        public Builder spectatorIds(List<String> spectatorIds) { this.spectatorIds = spectatorIds; return this; }
        public Builder configuration(Map<String, Object> configuration) { this.configuration = configuration; return this; }
        public Builder gameStateSummary(Object gameStateSummary) { this.gameStateSummary = gameStateSummary; return this; }

        public RoomResponse build() {
            return new RoomResponse(roomId, name, gameType, hostPlayerId, minPlayers, maxPlayers,
                    currentPlayersCount, spectatorAllowed, lateJoinAllowed, status, createdAt, startedAt,
                    playerIds, spectatorIds, configuration, gameStateSummary);
        }
    }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getGameType() { return gameType; }
    public void setGameType(String gameType) { this.gameType = gameType; }
    public String getHostPlayerId() { return hostPlayerId; }
    public void setHostPlayerId(String hostPlayerId) { this.hostPlayerId = hostPlayerId; }
    public int getMinPlayers() { return minPlayers; }
    public void setMinPlayers(int minPlayers) { this.minPlayers = minPlayers; }
    public int getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; }
    public int getCurrentPlayersCount() { return currentPlayersCount; }
    public void setCurrentPlayersCount(int currentPlayersCount) { this.currentPlayersCount = currentPlayersCount; }
    public boolean isSpectatorAllowed() { return spectatorAllowed; }
    public void setSpectatorAllowed(boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; }
    public boolean isLateJoinAllowed() { return lateJoinAllowed; }
    public void setLateJoinAllowed(boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; }
    public RoomStatus getStatus() { return status; }
    public void setStatus(RoomStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public List<String> getPlayerIds() { return playerIds; }
    public void setPlayerIds(List<String> playerIds) { this.playerIds = playerIds; }
    public List<String> getSpectatorIds() { return spectatorIds; }
    public void setSpectatorIds(List<String> spectatorIds) { this.spectatorIds = spectatorIds; }
    public Map<String, Object> getConfiguration() { return configuration; }
    public void setConfiguration(Map<String, Object> configuration) { this.configuration = configuration; }
    public Object getGameStateSummary() { return gameStateSummary; }
    public void setGameStateSummary(Object gameStateSummary) { this.gameStateSummary = gameStateSummary; }
}
