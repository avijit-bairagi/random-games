package com.example.gameplatform.websocket.model;

public final class MessageTypes {
    private MessageTypes() {}

    // Client -> Server
    public static final String GAME_ACTION = "GAME_ACTION";
    public static final String JOIN_ROOM = "JOIN_ROOM";
    public static final String LEAVE_ROOM = "LEAVE_ROOM";
    public static final String START_GAME = "START_GAME";
    public static final String RESTART_GAME = "RESTART_GAME";
    public static final String PING = "PING";

    // Server -> Client
    public static final String PONG = "PONG";
    public static final String PLAYER_JOINED = "PLAYER_JOINED";
    public static final String PLAYER_LEFT = "PLAYER_LEFT";
    public static final String PLAYER_DISCONNECTED = "PLAYER_DISCONNECTED";
    public static final String PLAYER_RECONNECTED = "PLAYER_RECONNECTED";
    public static final String GAME_CREATED = "GAME_CREATED";
    public static final String GAME_STARTED = "GAME_STARTED";
    public static final String GAME_STATE_UPDATED = "GAME_STATE_UPDATED";
    public static final String GAME_FINISHED = "GAME_FINISHED";
    public static final String GAME_ERROR = "GAME_ERROR";
    public static final String GAME_CANCELLED = "GAME_CANCELLED";
    public static final String ROOM_CLOSED = "ROOM_CLOSED";
    public static final String ROOM_UPDATED = "ROOM_UPDATED";
}
