package com.example.gameplatform.common.exception;

public final class ErrorCodes {
    private ErrorCodes() {}

    public static final String PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND";
    public static final String ROOM_NOT_FOUND = "ROOM_NOT_FOUND";
    public static final String ROOM_FULL = "ROOM_FULL";
    public static final String GAME_NOT_FOUND = "GAME_NOT_FOUND";
    public static final String GAME_NOT_STARTED = "GAME_NOT_STARTED";
    public static final String GAME_ALREADY_STARTED = "GAME_ALREADY_STARTED";
    public static final String GAME_ALREADY_FINISHED = "GAME_ALREADY_FINISHED";
    public static final String INVALID_ACTION = "INVALID_ACTION";
    public static final String NOT_YOUR_TURN = "NOT_YOUR_TURN";
    public static final String INVALID_MOVE = "INVALID_MOVE";
    public static final String PLAYER_NOT_IN_GAME = "PLAYER_NOT_IN_GAME";
    public static final String PLAYER_ALREADY_IN_ROOM = "PLAYER_ALREADY_IN_ROOM";
    public static final String NOT_ENOUGH_PLAYERS = "NOT_ENOUGH_PLAYERS";
    public static final String NOT_ROOM_HOST = "NOT_ROOM_HOST";
    public static final String INVALID_MESSAGE_FORMAT = "INVALID_MESSAGE_FORMAT";
    public static final String RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED";
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";
    public static final String INVALID_SECRET_CODE = "INVALID_SECRET_CODE";
}
