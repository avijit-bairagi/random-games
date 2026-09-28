package com.example.gameplatform.game.core;

import java.util.List;

public class GameResult {
    private boolean successful;
    private String errorCode;
    private String errorMessage;
    private GameState<?> newState;
    private List<GameEvent> events;

    public GameResult() {}

    public GameResult(boolean successful, String errorCode, String errorMessage, GameState<?> newState, List<GameEvent> events) {
        this.successful = successful;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.newState = newState;
        this.events = events != null ? events : List.of();
    }

    public static GameResult success(GameState<?> newState, List<GameEvent> events) {
        return new GameResult(true, null, null, newState, events != null ? events : List.of());
    }

    public static GameResult success(GameState<?> newState) {
        return success(newState, List.of());
    }

    public static GameResult failure(String errorCode, String errorMessage) {
        return new GameResult(false, errorCode, errorMessage, null, List.of());
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private boolean successful;
        private String errorCode;
        private String errorMessage;
        private GameState<?> newState;
        private List<GameEvent> events = List.of();

        public Builder successful(boolean successful) { this.successful = successful; return this; }
        public Builder errorCode(String errorCode) { this.errorCode = errorCode; return this; }
        public Builder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public Builder newState(GameState<?> newState) { this.newState = newState; return this; }
        public Builder events(List<GameEvent> events) { this.events = events; return this; }
        public GameResult build() {
            return new GameResult(successful, errorCode, errorMessage, newState, events);
        }
    }

    public boolean isSuccessful() { return successful; }
    public void setSuccessful(boolean successful) { this.successful = successful; }
    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public GameState<?> getNewState() { return newState; }
    public void setNewState(GameState<?> newState) { this.newState = newState; }
    public List<GameEvent> getEvents() { return events; }
    public void setEvents(List<GameEvent> events) { this.events = events; }
}
