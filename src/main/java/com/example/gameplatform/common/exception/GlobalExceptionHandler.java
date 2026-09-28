package com.example.gameplatform.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(GamePlatformException.class)
    public ResponseEntity<ErrorResponse> handleGamePlatformException(GamePlatformException ex, HttpServletRequest request) {
        log.warn("Platform error: code={}, message={}", ex.getCode(), ex.getMessage());
        HttpStatus status = switch (ex.getCode()) {
            case ErrorCodes.PLAYER_NOT_FOUND, ErrorCodes.ROOM_NOT_FOUND, ErrorCodes.GAME_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ErrorCodes.ROOM_FULL, ErrorCodes.GAME_ALREADY_STARTED, ErrorCodes.NOT_ENOUGH_PLAYERS, ErrorCodes.NOT_ROOM_HOST -> HttpStatus.BAD_REQUEST;
            case ErrorCodes.INVALID_ACTION, ErrorCodes.NOT_YOUR_TURN, ErrorCodes.INVALID_MOVE -> HttpStatus.UNPROCESSABLE_ENTITY;
            default -> HttpStatus.BAD_REQUEST;
        };

        ErrorResponse response = ErrorResponse.builder()
                .code(ex.getCode())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(status).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining(", "));

        ErrorResponse response = ErrorResponse.builder()
                .code(ErrorCodes.INVALID_ACTION)
                .message(msg)
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception processing request {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        ErrorResponse response = ErrorResponse.builder()
                .code(ErrorCodes.INTERNAL_ERROR)
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
