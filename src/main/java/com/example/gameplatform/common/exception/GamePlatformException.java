package com.example.gameplatform.common.exception;

public class GamePlatformException extends RuntimeException {
    private final String code;

    public GamePlatformException(String code, String message) {
        super(message);
        this.code = code;
    }

    public GamePlatformException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
