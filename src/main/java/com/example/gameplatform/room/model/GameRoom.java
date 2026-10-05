package com.example.gameplatform.room.model;

import com.example.gameplatform.game.core.GameState;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

public class GameRoom {
    private String roomId;
    private String name;
    private String gameType;
    private String hostPlayerId;
    private int minPlayers;
    private int maxPlayers;
    private boolean spectatorAllowed;
    private boolean lateJoinAllowed;
    private boolean privateRoom;
    private String secretCode;
    private RoomStatus status;
    private Instant createdAt;
    private Instant startedAt;
    private Instant finishedAt;

    private List<String> playerIds = Collections.synchronizedList(new ArrayList<>());
    private List<String> spectatorIds = Collections.synchronizedList(new ArrayList<>());
    private Map<String, String> playerUsernames = new ConcurrentHashMap<>();
    private Map<String, String> spectatorUsernames = new ConcurrentHashMap<>();
    private Map<String, Object> configuration = new ConcurrentHashMap<>();

    private volatile GameState<?> currentGameState;
    private final transient ReentrantLock roomLock = new ReentrantLock();

    public GameRoom() {}

    public GameRoom(String roomId, String name, String gameType, String hostPlayerId, int minPlayers, int maxPlayers,
                    boolean spectatorAllowed, boolean lateJoinAllowed, boolean privateRoom, String secretCode,
                    RoomStatus status, Instant createdAt,
                    Instant startedAt, Instant finishedAt, List<String> playerIds, List<String> spectatorIds,
                    Map<String, String> playerUsernames, Map<String, String> spectatorUsernames,
                    Map<String, Object> configuration, GameState<?> currentGameState) {
        this.roomId = roomId;
        this.name = name;
        this.gameType = gameType;
        this.hostPlayerId = hostPlayerId;
        this.minPlayers = minPlayers;
        this.maxPlayers = maxPlayers;
        this.spectatorAllowed = spectatorAllowed;
        this.lateJoinAllowed = lateJoinAllowed;
        this.privateRoom = privateRoom;
        this.secretCode = secretCode;
        this.status = status;
        this.createdAt = createdAt;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        if (playerIds != null) this.playerIds = Collections.synchronizedList(new ArrayList<>(playerIds));
        if (spectatorIds != null) this.spectatorIds = Collections.synchronizedList(new ArrayList<>(spectatorIds));
        if (playerUsernames != null) this.playerUsernames.putAll(playerUsernames);
        if (spectatorUsernames != null) this.spectatorUsernames.putAll(spectatorUsernames);
        if (configuration != null) this.configuration.putAll(configuration);
        this.currentGameState = currentGameState;
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
        private boolean spectatorAllowed;
        private boolean lateJoinAllowed;
        private boolean privateRoom;
        private String secretCode;
        private RoomStatus status;
        private Instant createdAt;
        private Instant startedAt;
        private Instant finishedAt;
        private List<String> playerIds = new ArrayList<>();
        private List<String> spectatorIds = new ArrayList<>();
        private Map<String, String> playerUsernames = new ConcurrentHashMap<>();
        private Map<String, String> spectatorUsernames = new ConcurrentHashMap<>();
        private Map<String, Object> configuration = new ConcurrentHashMap<>();
        private GameState<?> currentGameState;

        public Builder roomId(String roomId) { this.roomId = roomId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder gameType(String gameType) { this.gameType = gameType; return this; }
        public Builder hostPlayerId(String hostPlayerId) { this.hostPlayerId = hostPlayerId; return this; }
        public Builder minPlayers(int minPlayers) { this.minPlayers = minPlayers; return this; }
        public Builder maxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; return this; }
        public Builder spectatorAllowed(boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; return this; }
        public Builder lateJoinAllowed(boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; return this; }
        public Builder privateRoom(boolean privateRoom) { this.privateRoom = privateRoom; return this; }
        public Builder secretCode(String secretCode) { this.secretCode = secretCode; return this; }
        public Builder status(RoomStatus status) { this.status = status; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder startedAt(Instant startedAt) { this.startedAt = startedAt; return this; }
        public Builder finishedAt(Instant finishedAt) { this.finishedAt = finishedAt; return this; }
        public Builder playerIds(List<String> playerIds) { this.playerIds = playerIds; return this; }
        public Builder spectatorIds(List<String> spectatorIds) { this.spectatorIds = spectatorIds; return this; }
        public Builder playerUsernames(Map<String, String> playerUsernames) { this.playerUsernames = playerUsernames; return this; }
        public Builder spectatorUsernames(Map<String, String> spectatorUsernames) { this.spectatorUsernames = spectatorUsernames; return this; }
        public Builder configuration(Map<String, Object> configuration) { this.configuration = configuration; return this; }
        public Builder currentGameState(GameState<?> currentGameState) { this.currentGameState = currentGameState; return this; }

        public GameRoom build() {
            return new GameRoom(roomId, name, gameType, hostPlayerId, minPlayers, maxPlayers,
                    spectatorAllowed, lateJoinAllowed, privateRoom, secretCode, status, createdAt, startedAt, finishedAt,
                    playerIds, spectatorIds, playerUsernames, spectatorUsernames, configuration, currentGameState);
        }
    }

    public boolean isFull() { return playerIds.size() >= maxPlayers; }
    public boolean hasEnoughPlayers() { return playerIds.size() >= minPlayers; }
    public boolean containsPlayer(String playerId) { return playerIds.contains(playerId); }
    public boolean containsSpectator(String spectatorId) { return spectatorIds.contains(spectatorId); }

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
    public Instant getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Instant finishedAt) { this.finishedAt = finishedAt; }
    public List<String> getPlayerIds() { return playerIds; }
    public void setPlayerIds(List<String> playerIds) { this.playerIds = playerIds; }
    public List<String> getSpectatorIds() { return spectatorIds; }
    public void setSpectatorIds(List<String> spectatorIds) { this.spectatorIds = spectatorIds; }
    public Map<String, String> getPlayerUsernames() { return playerUsernames; }
    public void setPlayerUsernames(Map<String, String> playerUsernames) { this.playerUsernames = playerUsernames; }
    public Map<String, String> getSpectatorUsernames() { return spectatorUsernames; }
    public void setSpectatorUsernames(Map<String, String> spectatorUsernames) { this.spectatorUsernames = spectatorUsernames; }
    public Map<String, Object> getConfiguration() { return configuration; }
    public void setConfiguration(Map<String, Object> configuration) { this.configuration = configuration; }
    public GameState<?> getCurrentGameState() { return currentGameState; }
    public void setCurrentGameState(GameState<?> currentGameState) { this.currentGameState = currentGameState; }
    public ReentrantLock getRoomLock() { return roomLock; }
}
