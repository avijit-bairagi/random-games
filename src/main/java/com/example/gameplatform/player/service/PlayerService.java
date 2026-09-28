package com.example.gameplatform.player.service;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.common.exception.GamePlatformException;
import com.example.gameplatform.player.model.Player;
import com.example.gameplatform.player.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;

@Service
public class PlayerService {

    private static final Logger log = LoggerFactory.getLogger(PlayerService.class);
    private final PlayerRepository playerRepository;

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    public Player registerPlayer(String username) {
        String cleanUsername = (username != null && !username.trim().isEmpty())
                ? username.trim()
                : "Player-" + UUID.randomUUID().toString().substring(0, 5);

        String playerId = "p-" + UUID.randomUUID().toString().substring(0, 8);
        Player player = Player.create(playerId, cleanUsername);
        playerRepository.save(player);
        log.info("Registered new player: id={}, username={}", playerId, cleanUsername);
        return player;
    }

    public Player getPlayer(String playerId) {
        return playerRepository.findById(playerId)
                .orElseThrow(() -> new GamePlatformException(ErrorCodes.PLAYER_NOT_FOUND, "Player not found: " + playerId));
    }

    public Player updateLastActive(String playerId) {
        Player player = getPlayer(playerId);
        player.setLastActiveAt(Instant.now());
        player.setConnected(true);
        return playerRepository.save(player);
    }

    public void setPlayerConnected(String playerId, boolean connected) {
        playerRepository.findById(playerId).ifPresent(p -> {
            p.setConnected(connected);
            p.setLastActiveAt(Instant.now());
            playerRepository.save(p);
        });
    }

    public Collection<Player> getAllPlayers() {
        return playerRepository.findAll();
    }
}
