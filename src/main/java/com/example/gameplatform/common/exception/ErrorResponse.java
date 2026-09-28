package com.example.gameplatform.common.exception;

import java.time.Instant;

public class ErrorResponse {
    private String code;
    private String message;
    private String path;
    private Instant timestamp = Instant.now();

    public ErrorResponse() {}

    public ErrorResponse(String code, String message, String path, Instant timestamp) {
        this.code = code;
        this.message = message;
        this.path = path;
        this.timestamp = timestamp != null ? timestamp : Instant.now();
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String code;
        private String message;
        private String path;
        private Instant timestamp = Instant.now();

        public Builder code(String code) { this.code = code; return this; }
        public Builder message(String message) { this.message = message; return this; }
        public Builder path(String path) { this.path = path; return this; }
        public Builder timestamp(Instant timestamp) { this.timestamp = timestamp; return this; }
        public ErrorResponse build() {
            return new ErrorResponse(code, message, path, timestamp);
        }
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
