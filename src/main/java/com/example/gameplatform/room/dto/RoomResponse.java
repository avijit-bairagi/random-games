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
    private String hostUsername;
    private int minPlayers;
    private int maxPlayers;
    private int currentPlayersCount;
    private int spectatorCount;
    private boolean spectatorAllowed;
    private boolean lateJoinAllowed;
    private boolean privateRoom;
    private String secretCode;
    private RoomStatus status;
    private Instant createdAt;
    private Instant startedAt;
    private List<String> playerIds;
    private List<String> spectatorIds;
    private Map<String, String> playerNames;
    private Map<String, String> spectatorNames;
    private Map<String, Object> configuration;
    private Object gameStateSummary;

    public RoomResponse() {}

    public RoomResponse(String roomId, String name, String gameType, String hostPlayerId, String hostUsername, int minPlayers,
                        int maxPlayers, int currentPlayersCount, int spectatorCount, boolean spectatorAllowed, boolean lateJoinAllowed,
                        boolean privateRoom, String secretCode,
                        RoomStatus status, Instant createdAt, Instant startedAt, List<String> playerIds,
                        List<String> spectatorIds, Map<String, String> playerNames, Map<String, String> spectatorNames,
                        Map<String, Object> configuration, Object gameStateSummary) {
        this.roomId = roomId;
        this.name = name;
        this.gameType = gameType;
        this.hostPlayerId = hostPlayerId;
        this.hostUsername = hostUsername;
        this.minPlayers = minPlayers;
        this.maxPlayers = maxPlayers;
        this.currentPlayersCount = currentPlayersCount;
        this.spectatorCount = spectatorCount;
        this.spectatorAllowed = spectatorAllowed;
        this.lateJoinAllowed = lateJoinAllowed;
        this.privateRoom = privateRoom;
        this.secretCode = secretCode;
        this.status = status;
        this.createdAt = createdAt;
        this.startedAt = startedAt;
        this.playerIds = playerIds;
        this.spectatorIds = spectatorIds;
        this.playerNames = playerNames;
        this.spectatorNames = spectatorNames;
        this.configuration = configuration;
        this.gameStateSummary = gameStateSummary;
    }

    public static RoomResponse from(GameRoom room) {
        return from(room, true);
    }

    public static RoomResponse from(GameRoom room, boolean includeSecretCode) {
        String hostName = room.getPlayerUsernames().getOrDefault(room.getHostPlayerId(), room.getHostPlayerId());
        return builder()
                .roomId(room.getRoomId())
                .name(room.getName())
                .gameType(room.getGameType())
                .hostPlayerId(room.getHostPlayerId())
                .hostUsername(hostName)
                .minPlayers(room.getMinPlayers())
                .maxPlayers(room.getMaxPlayers())
                .currentPlayersCount(room.getPlayerIds().size())
                .spectatorCount(room.getSpectatorIds().size())
                .spectatorAllowed(room.isSpectatorAllowed())
                .lateJoinAllowed(room.isLateJoinAllowed())
                .privateRoom(room.isPrivateRoom())
                .secretCode(includeSecretCode ? room.getSecretCode() : null)
                .status(room.getStatus())
                .createdAt(room.getCreatedAt())
                .startedAt(room.getStartedAt())
                .playerIds(List.copyOf(room.getPlayerIds()))
                .spectatorIds(List.copyOf(room.getSpectatorIds()))
                .playerNames(Map.copyOf(room.getPlayerUsernames()))
                .spectatorNames(Map.copyOf(room.getSpectatorUsernames()))
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
        private String hostUsername;
        private int minPlayers;
        private int maxPlayers;
        private int currentPlayersCount;
        private int spectatorCount;
        private boolean spectatorAllowed;
        private boolean lateJoinAllowed;
        private boolean privateRoom;
        private String secretCode;
        private RoomStatus status;
        private Instant createdAt;
        private Instant startedAt;
        private List<String> playerIds = List.of();
        private List<String> spectatorIds = List.of();
        private Map<String, String> playerNames = Map.of();
        private Map<String, String> spectatorNames = Map.of();
        private Map<String, Object> configuration = Map.of();
        private Object gameStateSummary;

        public Builder roomId(String roomId) { this.roomId = roomId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder gameType(String gameType) { this.gameType = gameType; return this; }
        public Builder hostPlayerId(String hostPlayerId) { this.hostPlayerId = hostPlayerId; return this; }
        public Builder hostUsername(String hostUsername) { this.hostUsername = hostUsername; return this; }
        public Builder minPlayers(int minPlayers) { this.minPlayers = minPlayers; return this; }
        public Builder maxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; return this; }
        public Builder currentPlayersCount(int currentPlayersCount) { this.currentPlayersCount = currentPlayersCount; return this; }
        public Builder spectatorCount(int spectatorCount) { this.spectatorCount = spectatorCount; return this; }
        public Builder spectatorAllowed(boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; return this; }
        public Builder lateJoinAllowed(boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; return this; }
        public Builder privateRoom(boolean privateRoom) { this.privateRoom = privateRoom; return this; }
        public Builder secretCode(String secretCode) { this.secretCode = secretCode; return this; }
        public Builder status(RoomStatus status) { this.status = status; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder startedAt(Instant startedAt) { this.startedAt = startedAt; return this; }
        public Builder playerIds(List<String> playerIds) { this.playerIds = playerIds; return this; }
        public Builder spectatorIds(List<String> spectatorIds) { this.spectatorIds = spectatorIds; return this; }
        public Builder playerNames(Map<String, String> playerNames) { this.playerNames = playerNames; return this; }
        public Builder spectatorNames(Map<String, String> spectatorNames) { this.spectatorNames = spectatorNames; return this; }
        public Builder configuration(Map<String, Object> configuration) { this.configuration = configuration; return this; }
        public Builder gameStateSummary(Object gameStateSummary) { this.gameStateSummary = gameStateSummary; return this; }

        public RoomResponse build() {
            return new RoomResponse(roomId, name, gameType, hostPlayerId, hostUsername, minPlayers, maxPlayers,
                    currentPlayersCount, spectatorCount, spectatorAllowed, lateJoinAllowed, privateRoom, secretCode,
                    status, createdAt, startedAt,
                    playerIds, spectatorIds, playerNames, spectatorNames, configuration, gameStateSummary);
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
    public String getHostUsername() { return hostUsername; }
    public void setHostUsername(String hostUsername) { this.hostUsername = hostUsername; }
    public int getMinPlayers() { return minPlayers; }
    public void setMinPlayers(int minPlayers) { this.minPlayers = minPlayers; }
    public int getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; }
    public int getCurrentPlayersCount() { return currentPlayersCount; }
    public void setCurrentPlayersCount(int currentPlayersCount) { this.currentPlayersCount = currentPlayersCount; }
    public int getSpectatorCount() { return spectatorCount; }
    public void setSpectatorCount(int spectatorCount) { this.spectatorCount = spectatorCount; }
    public boolean isSpectatorAllowed() { return spectatorAllowed; }
    public void setSpectatorAllowed(boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; }
    public boolean isLateJoinAllowed() { return lateJoinAllowed; }
    public void setLateJoinAllowed(boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; }
    public boolean isPrivateRoom() { return privateRoom; }
    public void setPrivateRoom(boolean privateRoom) { this.privateRoom = privateRoom; }
    public String getSecretCode() { return secretCode; }
    public void setSecretCode(String secretCode) { this.secretCode = secretCode; }
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
    public Map<String, String> getPlayerNames() { return playerNames; }
    public void setPlayerNames(Map<String, String> playerNames) { this.playerNames = playerNames; }
    public Map<String, String> getSpectatorNames() { return spectatorNames; }
    public void setSpectatorNames(Map<String, String> spectatorNames) { this.spectatorNames = spectatorNames; }
    public Map<String, Object> getConfiguration() { return configuration; }
    public void setConfiguration(Map<String, Object> configuration) { this.configuration = configuration; }
    public Object getGameStateSummary() { return gameStateSummary; }
    public void setGameStateSummary(Object gameStateSummary) { this.gameStateSummary = gameStateSummary; }
}
