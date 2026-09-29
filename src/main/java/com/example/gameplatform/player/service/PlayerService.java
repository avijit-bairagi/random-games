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
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
public class PlayerService {

    private static final Logger log = LoggerFactory.getLogger(PlayerService.class);
    private final PlayerRepository playerRepository;
    private final Random random = new Random();

    public static final List<String> COOL_NAMES = List.of(
            "ShadowNinja", "CosmicDragon", "ThunderFalcon", "PixelKnight", "MysticWizard",
            "CyberSamurai", "NeonViper", "BlazePhoenix", "StarHunter", "FrostTiger",
            "QuantumGhost", "VortexStriker", "TurboRacer", "ApexLegend", "IronGolem",
            "SolarFlare", "PhantomRogue", "EchoTitan", "HyperFalcon", "NovaKnight",
            "ShadowHunter", "StormBreaker", "LunarFox", "AstroWolf", "VelocityRider",
            "DragonSlayer", "CrimsonHawk", "NightCrawler", "ZenithMaster", "AlphaWolf"
    );

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    public synchronized Player registerPlayer(String username) {
        String baseName;
        if (username != null && !username.trim().isEmpty()) {
            baseName = username.trim();
        } else {
            baseName = COOL_NAMES.get(random.nextInt(COOL_NAMES.size()));
        }

        String finalUsername = baseName;
        if (playerRepository.existsByUsernameIgnoreCase(finalUsername)) {
            int index = 1;
            while (playerRepository.existsByUsernameIgnoreCase(baseName + " " + index)) {
                index++;
            }
            finalUsername = baseName + " " + index;
        }

        String playerId = "p-" + UUID.randomUUID().toString().substring(0, 8);
        Player player = Player.create(playerId, finalUsername);
        playerRepository.save(player);
        log.info("Registered new player: id={}, username={}", playerId, finalUsername);
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
