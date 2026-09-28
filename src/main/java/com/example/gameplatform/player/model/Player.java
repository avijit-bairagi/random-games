package com.example.gameplatform.player.model;

import java.time.Instant;

public class Player {
    private String id;
    private String username;
    private Instant createdAt;
    private Instant lastActiveAt;
    private boolean connected = true;

    public Player() {}

    public Player(String id, String username, Instant createdAt, Instant lastActiveAt, boolean connected) {
        this.id = id;
        this.username = username;
        this.createdAt = createdAt;
        this.lastActiveAt = lastActiveAt;
        this.connected = connected;
    }

    public static Player create(String id, String username) {
        Instant now = Instant.now();
        return new Player(id, username, now, now, true);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String username;
        private Instant createdAt;
        private Instant lastActiveAt;
        private boolean connected = true;

        public Builder id(String id) { this.id = id; return this; }
        public Builder username(String username) { this.username = username; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder lastActiveAt(Instant lastActiveAt) { this.lastActiveAt = lastActiveAt; return this; }
        public Builder connected(boolean connected) { this.connected = connected; return this; }
        public Player build() {
            return new Player(id, username, createdAt, lastActiveAt, connected);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(Instant lastActiveAt) { this.lastActiveAt = lastActiveAt; }
    public boolean isConnected() { return connected; }
    public void setConnected(boolean connected) { this.connected = connected; }
}
