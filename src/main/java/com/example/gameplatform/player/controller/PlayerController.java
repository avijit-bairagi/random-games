package com.example.gameplatform.player.controller;

import com.example.gameplatform.player.model.Player;
import com.example.gameplatform.player.service.PlayerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;

@RestController
@RequestMapping("/api/v1/players")
@Tag(name = "Players", description = "Player management operations")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    public static class CreatePlayerRequest {
        private String username;

        public CreatePlayerRequest() {}
        public CreatePlayerRequest(String username) { this.username = username; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
    }

    @PostMapping
    @Operation(summary = "Register or create a new player session")
    public ResponseEntity<Player> registerPlayer(@RequestBody(required = false) CreatePlayerRequest request) {
        String username = request != null ? request.getUsername() : null;
        Player player = playerService.registerPlayer(username);
        return ResponseEntity.ok(player);
    }

    @GetMapping("/{playerId}")
    @Operation(summary = "Get player details by ID")
    public ResponseEntity<Player> getPlayer(@PathVariable String playerId) {
        return ResponseEntity.ok(playerService.getPlayer(playerId));
    }

    @GetMapping
    @Operation(summary = "List all active players")
    public ResponseEntity<Collection<Player>> getAllPlayers() {
        return ResponseEntity.ok(playerService.getAllPlayers());
    }
}
