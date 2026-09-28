package com.example.gameplatform.game.controller;

import com.example.gameplatform.game.core.GameEngine;
import com.example.gameplatform.game.core.GameEngineRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/games")
@Tag(name = "Game Types", description = "Supported game engine metadata")
public class GameInfoController {

    private final GameEngineRegistry engineRegistry;

    public GameInfoController(GameEngineRegistry engineRegistry) {
        this.engineRegistry = engineRegistry;
    }

    public static class GameTypeInfo {
        private String gameType;
        private String displayName;
        private int minPlayers;
        private int maxPlayers;
        private boolean spectatorAllowed;
        private boolean lateJoinAllowed;

        public GameTypeInfo() {}

        public GameTypeInfo(String gameType, String displayName, int minPlayers, int maxPlayers,
                            boolean spectatorAllowed, boolean lateJoinAllowed) {
            this.gameType = gameType;
            this.displayName = displayName;
            this.minPlayers = minPlayers;
            this.maxPlayers = maxPlayers;
            this.spectatorAllowed = spectatorAllowed;
            this.lateJoinAllowed = lateJoinAllowed;
        }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String gameType;
            private String displayName;
            private int minPlayers;
            private int maxPlayers;
            private boolean spectatorAllowed;
            private boolean lateJoinAllowed;

            public Builder gameType(String gameType) { this.gameType = gameType; return this; }
            public Builder displayName(String displayName) { this.displayName = displayName; return this; }
            public Builder minPlayers(int minPlayers) { this.minPlayers = minPlayers; return this; }
            public Builder maxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; return this; }
            public Builder spectatorAllowed(boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; return this; }
            public Builder lateJoinAllowed(boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; return this; }
            public GameTypeInfo build() {
                return new GameTypeInfo(gameType, displayName, minPlayers, maxPlayers, spectatorAllowed, lateJoinAllowed);
            }
        }

        public String getGameType() { return gameType; }
        public void setGameType(String gameType) { this.gameType = gameType; }
        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }
        public int getMinPlayers() { return minPlayers; }
        public void setMinPlayers(int minPlayers) { this.minPlayers = minPlayers; }
        public int getMaxPlayers() { return maxPlayers; }
        public void setMaxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; }
        public boolean isSpectatorAllowed() { return spectatorAllowed; }
        public void setSpectatorAllowed(boolean spectatorAllowed) { this.spectatorAllowed = spectatorAllowed; }
        public boolean isLateJoinAllowed() { return lateJoinAllowed; }
        public void setLateJoinAllowed(boolean lateJoinAllowed) { this.lateJoinAllowed = lateJoinAllowed; }
    }

    @GetMapping
    @Operation(summary = "List all supported game types")
    public ResponseEntity<List<GameTypeInfo>> getSupportedGames() {
        List<GameTypeInfo> games = engineRegistry.getAllEngines().stream()
                .map(this::toInfo)
                .collect(Collectors.toList());
        return ResponseEntity.ok(games);
    }

    private GameTypeInfo toInfo(GameEngine<?, ?, ?> engine) {
        return GameTypeInfo.builder()
                .gameType(engine.gameType())
                .displayName(engine.displayName())
                .minPlayers(engine.minPlayers())
                .maxPlayers(engine.maxPlayers())
                .spectatorAllowed(engine.isSpectatorAllowed())
                .lateJoinAllowed(engine.isLateJoinAllowed())
                .build();
    }
}
