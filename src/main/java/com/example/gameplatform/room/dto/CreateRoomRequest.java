package com.example.gameplatform.room.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public class CreateRoomRequest {
    @NotBlank(message = "Room name is required")
    private String name;

    @NotBlank(message = "Game type is required")
    private String gameType;

    @NotBlank(message = "Host player ID is required")
    private String hostPlayerId;

    private Integer maxPlayers;
    private Boolean spectatorAllowed;
    private Boolean lateJoinAllowed;
    private Map<String, Object> configuration;

    public CreateRoomRequest() {}

    public CreateRoomRequest(String name, String gameType, String hostPlayerId, Integer maxPlayers,
                             Boolean spectatorAllowed, Boolean lateJoinAllowed, Map<String, Object> configuration) {
        this.name = name;
        this.gameType = gameType;
        this.hostPlayerId = hostPlayerId;
        this.maxPlayers = maxPlayers;
        this.spectatorAllowed = spectatorAllowed;
        this.lateJoinAllowed = lateJoinAllowed;
        this.configuration = configuration;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String name;
        private String gameType;
        private String hostPlayerId;
        private Integer maxPlayers;
        private Boolean spectatorAllowed;
        private Boolean lateJoinAllowed;
        private Map<String, Object> configuration;

        public Builder name(String name) { this.name = name; return this; }
        public Builder gameType(String gameType) { this.gameType = gameType; return this; }
        public Builder hostPlayerId(String hostPlayerId) { this.hostPlayerId = hostPlayerId; return this; }
        public Builder maxPlayers(Integer maxPlayers) { this.maxPlayers = maxPlayers; return this; }
        public Builder spectatorAllowed(Boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; return this; }
        public Builder lateJoinAllowed(Boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; return this; }
        public Builder configuration(Map<String, Object> configuration) { this.configuration = configuration; return this; }
        public CreateRoomRequest build() {
            return new CreateRoomRequest(name, gameType, hostPlayerId, maxPlayers, spectatorAllowed, lateJoinAllowed, configuration);
        }
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getGameType() { return gameType; }
    public void setGameType(String gameType) { this.gameType = gameType; }
    public String getHostPlayerId() { return hostPlayerId; }
    public void setHostPlayerId(String hostPlayerId) { this.hostPlayerId = hostPlayerId; }
    public Integer getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(Integer maxPlayers) { this.maxPlayers = maxPlayers; }
    public Boolean getSpectatorAllowed() { return spectatorAllowed; }
    public void setSpectatorAllowed(Boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; }
    public Boolean getLateJoinAllowed() { return lateJoinAllowed; }
    public void setLateJoinAllowed(Boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; }
    public Map<String, Object> getConfiguration() { return configuration; }
    public void setConfiguration(Map<String, Object> configuration) { this.configuration = configuration; }
}
