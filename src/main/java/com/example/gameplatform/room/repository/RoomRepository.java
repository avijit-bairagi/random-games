package com.example.gameplatform.room.repository;

import com.example.gameplatform.room.model.GameRoom;
import com.example.gameplatform.room.model.RoomStatus;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class RoomRepository {
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();

    public GameRoom save(GameRoom room) {
        rooms.put(room.getRoomId(), room);
        return room;
    }

    public Optional<GameRoom> findById(String roomId) {
        return Optional.ofNullable(rooms.get(roomId));
    }

    public boolean existsById(String roomId) {
        return rooms.containsKey(roomId);
    }

    public void deleteById(String roomId) {
        rooms.remove(roomId);
    }

    public Collection<GameRoom> findAll() {
        return Collections.unmodifiableCollection(rooms.values());
    }

    public List<GameRoom> findByGameType(String gameType) {
        return rooms.values().stream()
                .filter(r -> r.getGameType().equalsIgnoreCase(gameType))
                .collect(Collectors.toList());
    }

    public List<GameRoom> findAvailableRooms(String gameType) {
        return rooms.values().stream()
                .filter(r -> (gameType == null || r.getGameType().equalsIgnoreCase(gameType)))
                .filter(r -> r.getStatus() != RoomStatus.CANCELLED)
                .filter(r -> !r.isPrivateRoom())
                .collect(Collectors.toList());
    }

    public Optional<GameRoom> findBySecretCode(String secretCode) {
        return rooms.values().stream()
                .filter(r -> secretCode != null && secretCode.equals(r.getSecretCode()))
                .findFirst();
    }

    public Optional<GameRoom> findByPlayerId(String playerId) {
        return rooms.values().stream()
                .filter(r -> r.containsPlayer(playerId) || r.containsSpectator(playerId))
                .findFirst();
    }

    public int count() {
        return rooms.size();
    }

    public long countActiveRooms() {
        return rooms.values().stream()
                .filter(r -> r.getStatus() != RoomStatus.CANCELLED && r.getStatus() != RoomStatus.FINISHED)
                .count();
    }
}
