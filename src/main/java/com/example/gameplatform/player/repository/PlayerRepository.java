package com.example.gameplatform.player.repository;

import com.example.gameplatform.player.model.Player;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class PlayerRepository {
    private final Map<String, Player> players = new ConcurrentHashMap<>();

    public Player save(Player player) {
        players.put(player.getId(), player);
        return player;
    }

    public Optional<Player> findById(String playerId) {
        return Optional.ofNullable(players.get(playerId));
    }

    public boolean existsById(String playerId) {
        return players.containsKey(playerId);
    }

    public boolean existsByUsernameIgnoreCase(String username) {
        if (username == null) return false;
        return players.values().stream()
                .anyMatch(p -> p.getUsername() != null && p.getUsername().equalsIgnoreCase(username.trim()));
    }

    public void deleteById(String playerId) {
        players.remove(playerId);
    }

    public Collection<Player> findAll() {
        return Collections.unmodifiableCollection(players.values());
    }

    public int count() {
        return players.size();
    }
}
