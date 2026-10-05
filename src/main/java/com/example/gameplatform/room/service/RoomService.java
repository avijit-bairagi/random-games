package com.example.gameplatform.room.service;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.common.exception.GamePlatformException;
import com.example.gameplatform.common.metrics.PlatformMetrics;
import com.example.gameplatform.game.core.GameAction;
import com.example.gameplatform.game.core.GameConfiguration;
import com.example.gameplatform.game.core.GameEngine;
import com.example.gameplatform.game.core.GameEngineRegistry;
import com.example.gameplatform.game.core.GameResult;
import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import com.example.gameplatform.player.model.Player;
import com.example.gameplatform.player.service.PlayerService;
import com.example.gameplatform.room.dto.CreateRoomRequest;
import com.example.gameplatform.room.dto.RoomResponse;
import com.example.gameplatform.room.model.GameRoom;
import com.example.gameplatform.room.model.RoomStatus;
import com.example.gameplatform.room.repository.RoomRepository;
import com.example.gameplatform.websocket.SessionManager;
import com.example.gameplatform.websocket.model.MessageTypes;
import com.example.gameplatform.websocket.model.OutboundMessage;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);

    private final RoomRepository roomRepository;
    private final PlayerService playerService;
    private final GameEngineRegistry engineRegistry;
    private final SessionManager sessionManager;
    private final PlatformMetrics metrics;

    private final ScheduledExecutorService disconnectScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "disconnect-timeout-worker");
        t.setDaemon(true);
        return t;
    });

    private final Map<String, ScheduledFuture<?>> disconnectTasks = new ConcurrentHashMap<>();

    @Value("${game.platform.disconnect-timeout-seconds:30}")
    private long disconnectTimeoutSeconds;

    public RoomService(RoomRepository roomRepository,
                       PlayerService playerService,
                       GameEngineRegistry engineRegistry,
                       SessionManager sessionManager,
                       PlatformMetrics metrics) {
        this.roomRepository = roomRepository;
        this.playerService = playerService;
        this.engineRegistry = engineRegistry;
        this.sessionManager = sessionManager;
        this.metrics = metrics;
    }

    public GameRoom createRoom(CreateRoomRequest request) {
        String gameType = request.getGameType().toUpperCase();
        GameEngine<?, ?, ?> engine = engineRegistry.get(gameType)
                .orElseThrow(() -> new GamePlatformException(ErrorCodes.GAME_NOT_FOUND, "Unsupported game type: " + gameType));

        Player host = playerService.getPlayer(request.getHostPlayerId());

        String roomId = "room-" + UUID.randomUUID().toString().substring(0, 8);
        int minPlayers = engine.minPlayers();
        int maxPlayers = request.getMaxPlayers() != null ? request.getMaxPlayers() : engine.maxPlayers();
        if ("LUDO".equalsIgnoreCase(gameType)) {
            if (maxPlayers != 2 && maxPlayers != 4) {
                maxPlayers = 4;
            }
        } else {
            if (maxPlayers < minPlayers || maxPlayers > engine.maxPlayers()) {
                maxPlayers = engine.maxPlayers();
            }
        }

        boolean isPrivate = Boolean.TRUE.equals(request.getPrivateRoom());
        String secretCode = isPrivate ? generateSecretCode() : null;

        GameRoom room = GameRoom.builder()
                .roomId(roomId)
                .name(request.getName())
                .gameType(gameType)
                .hostPlayerId(host.getId())
                .minPlayers(minPlayers)
                .maxPlayers(maxPlayers)
                .spectatorAllowed(request.getSpectatorAllowed() != null ? request.getSpectatorAllowed() : engine.isSpectatorAllowed())
                .lateJoinAllowed(request.getLateJoinAllowed() != null ? request.getLateJoinAllowed() : engine.isLateJoinAllowed())
                .privateRoom(isPrivate)
                .secretCode(secretCode)
                .status(RoomStatus.WAITING)
                .createdAt(Instant.now())
                .build();

        if (request.getConfiguration() != null) {
            room.getConfiguration().putAll(request.getConfiguration());
        }

        room.getPlayerIds().add(host.getId());
        room.getPlayerUsernames().put(host.getId(), host.getUsername());
        if (room.getPlayerIds().size() >= room.getMinPlayers()) {
            room.setStatus(RoomStatus.READY);
        }

        roomRepository.save(room);
        sessionManager.subscribeRoom(roomId, host.getId());
        metrics.incrementGamesCreated();

        log.info("Created room {} for game {} by host {}", roomId, gameType, host.getId());
        return room;
    }

    public GameRoom getRoom(String roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new GamePlatformException(ErrorCodes.ROOM_NOT_FOUND, "Room not found: " + roomId));
    }

    public GameRoom joinRoom(String roomId, String playerId, boolean asSpectator) {
        GameRoom room = getRoom(roomId);
        Player player = playerService.getPlayer(playerId);

        room.getRoomLock().lock();
        try {
            ScheduledFuture<?> pendingTask = disconnectTasks.remove(playerId);
            if (pendingTask != null) {
                pendingTask.cancel(false);
            }

            if (asSpectator) {
                if (!room.isSpectatorAllowed()) {
                    throw new GamePlatformException(ErrorCodes.INVALID_ACTION, "Spectating is not allowed in this room");
                }
                if (!room.containsSpectator(playerId) && !room.containsPlayer(playerId)) {
                    room.getSpectatorIds().add(playerId);
                    room.getSpectatorUsernames().put(playerId, player.getUsername());
                }
            } else {
                if (room.containsPlayer(playerId)) {
                    // Already in room - reconnecting or rejoining
                    room.getPlayerUsernames().put(playerId, player.getUsername());
                    sessionManager.subscribeRoom(roomId, playerId);
                    notifyPlayerReconnected(room, player);
                    return room;
                }

                // If moving from spectator to active player, remove from spectatorIds
                room.getSpectatorIds().remove(playerId);
                room.getSpectatorUsernames().remove(playerId);

                if (room.getStatus() == RoomStatus.IN_PROGRESS && !room.isLateJoinAllowed()) {
                    throw new GamePlatformException(ErrorCodes.GAME_ALREADY_STARTED, "Game in progress. Late join not allowed");
                }

                if (room.getStatus() == RoomStatus.CANCELLED) {
                    throw new GamePlatformException(ErrorCodes.ROOM_NOT_FOUND, "Game room is closed");
                }

                if (room.isFull()) {
                    throw new GamePlatformException(ErrorCodes.ROOM_FULL, "Room is full");
                }

                room.getPlayerIds().add(playerId);
                room.getPlayerUsernames().put(playerId, player.getUsername());
                if (room.getStatus() == RoomStatus.WAITING || room.getStatus() == RoomStatus.FINISHED || room.getStatus() == RoomStatus.READY) {
                    if ("LUDO".equalsIgnoreCase(room.getGameType())) {
                        if (room.getPlayerIds().size() == 2 || room.getPlayerIds().size() == 4) {
                            room.setStatus(RoomStatus.READY);
                        } else {
                            room.setStatus(RoomStatus.WAITING);
                        }
                    } else if (room.getPlayerIds().size() >= room.getMinPlayers()) {
                        room.setStatus(RoomStatus.READY);
                    } else {
                        room.setStatus(RoomStatus.WAITING);
                    }
                }
            }

            roomRepository.save(room);
            sessionManager.subscribeRoom(roomId, playerId);

            // Broadcast player joined
            OutboundMessage msg = OutboundMessage.builder()
                    .type(MessageTypes.PLAYER_JOINED)
                    .roomId(roomId)
                    .playerId(playerId)
                    .payload(Map.of(
                            "player", player,
                            "asSpectator", asSpectator,
                            "room", RoomResponse.from(room)
                    ))
                    .build();
            sessionManager.sendToRoom(roomId, msg);

            log.info("Player {} joined room {} (asSpectator={})", playerId, roomId, asSpectator);
            return room;
        } finally {
            room.getRoomLock().unlock();
        }
    }

    public void leaveRoom(String roomId, String playerId) {
        GameRoom room = getRoom(roomId);
        Player player = playerService.getPlayer(playerId);

        ScheduledFuture<?> pendingTask = disconnectTasks.remove(playerId);
        if (pendingTask != null) {
            pendingTask.cancel(false);
        }

        room.getRoomLock().lock();
        try {
            boolean isCreator = playerId.equals(room.getHostPlayerId());
            boolean removedPlayer = room.getPlayerIds().remove(playerId);
            boolean removedSpectator = room.getSpectatorIds().remove(playerId);
            if (removedPlayer) {
                room.getPlayerUsernames().remove(playerId);
            }
            if (removedSpectator) {
                room.getSpectatorUsernames().remove(playerId);
            }
            sessionManager.unsubscribeRoom(roomId, playerId);

            if (!removedPlayer && !removedSpectator) {
                return;
            }

            log.info("Player {} left room {}", playerId, roomId);

            // 1. If the creator leaves or all players left, delete the room
            if (isCreator || room.getPlayerIds().isEmpty()) {
                room.setStatus(RoomStatus.CANCELLED);
                roomRepository.deleteById(roomId);

                OutboundMessage closedMsg = OutboundMessage.builder()
                        .type(MessageTypes.ROOM_CLOSED)
                        .roomId(roomId)
                        .playerId(playerId)
                        .payload(Map.of(
                                "roomId", roomId,
                                "message", isCreator ? "Room closed because the creator left the room." : "Room closed because all players left."
                        ))
                        .build();
                sessionManager.sendToRoom(roomId, closedMsg);
                log.info("Room {} closed and deleted (creator left: {})", roomId, isCreator);
                return;
            }

            // 2. If game is in progress and an active player left: stop the game immediately and notify all others
            if (room.getStatus() == RoomStatus.IN_PROGRESS && removedPlayer) {
                GameEngine engine = engineRegistry.get(room.getGameType()).orElse(null);
                GameState<?> finalState = room.getCurrentGameState();
                if (engine != null && finalState != null) {
                    GameResult result = engine.onPlayerDisconnect(finalState, player);
                    if (result != null && result.getNewState() != null) {
                        finalState = result.getNewState();
                    }
                }
                room.setCurrentGameState(finalState);
                room.setStatus(RoomStatus.FINISHED);
                room.setFinishedAt(Instant.now());
                metrics.incrementGamesCompleted();
                roomRepository.save(room);

                OutboundMessage leftMsg = OutboundMessage.builder()
                        .type(MessageTypes.PLAYER_LEFT)
                        .roomId(roomId)
                        .playerId(playerId)
                        .payload(Map.of(
                                "playerId", playerId,
                                "player", player,
                                "room", RoomResponse.from(room),
                                "message", player.getUsername() + " left the match. Game stopped."
                        ))
                        .build();
                sessionManager.sendToRoom(roomId, leftMsg);

                if (room.getCurrentGameState() != null) {
                    OutboundMessage finishMsg = OutboundMessage.builder()
                            .type(MessageTypes.GAME_FINISHED)
                            .roomId(roomId)
                            .gameId(room.getCurrentGameState().getGameId())
                            .sequence(room.getCurrentGameState().getSequence())
                            .payload(Map.of(
                                    "gameState", room.getCurrentGameState(),
                                    "room", RoomResponse.from(room),
                                    "reason", player.getUsername() + " left the match. Game stopped."
                            ))
                            .build();
                    sessionManager.sendToRoom(roomId, finishMsg);
                }
                return;
            }

            // 3. Non-creator left in WAITING/READY/FINISHED state: room remains available
            if (room.getStatus() == RoomStatus.READY) {
                if ("LUDO".equalsIgnoreCase(room.getGameType())) {
                    if (room.getPlayerIds().size() != 2 && room.getPlayerIds().size() != 4) {
                        room.setStatus(RoomStatus.WAITING);
                    }
                } else if (room.getPlayerIds().size() < room.getMinPlayers()) {
                    room.setStatus(RoomStatus.WAITING);
                }
            }
            roomRepository.save(room);

            OutboundMessage msg = OutboundMessage.builder()
                    .type(MessageTypes.PLAYER_LEFT)
                    .roomId(roomId)
                    .playerId(playerId)
                    .payload(Map.of(
                            "playerId", playerId,
                            "player", player,
                            "room", RoomResponse.from(room)
                    ))
                    .build();
            sessionManager.sendToRoom(roomId, msg);
        } finally {
            room.getRoomLock().unlock();
        }
    }

    public GameState<?> startGame(String roomId, String requesterId) {
        GameRoom room = getRoom(roomId);
        room.getRoomLock().lock();
        try {
            if (!room.getHostPlayerId().equals(requesterId)) {
                throw new GamePlatformException(ErrorCodes.NOT_ROOM_HOST, "Only the room host can start the game");
            }
            if (room.getPlayerIds().size() < room.getMinPlayers()) {
                throw new GamePlatformException(ErrorCodes.NOT_ENOUGH_PLAYERS, "Not enough players to start. Minimum: " + room.getMinPlayers());
            }

            GameEngine engine = engineRegistry.get(room.getGameType())
                    .orElseThrow(() -> new GamePlatformException(ErrorCodes.GAME_NOT_FOUND, "Game engine not found"));

            List<Player> players = room.getPlayerIds().stream()
                    .map(playerService::getPlayer)
                    .collect(Collectors.toList());

            GameConfiguration config = engine.parseConfiguration(room.getConfiguration());
            String gameId = "game-" + UUID.randomUUID().toString().substring(0, 8);
            GameState<?> gameState;
            try {
                gameState = engine.createGame(gameId, players, config);
            } catch (IllegalArgumentException ex) {
                throw new GamePlatformException(ErrorCodes.NOT_ENOUGH_PLAYERS, ex.getMessage());
            }

            room.setCurrentGameState(gameState);
            room.setStatus(RoomStatus.IN_PROGRESS);
            room.setStartedAt(Instant.now());
            room.setFinishedAt(null);
            roomRepository.save(room);

            // Broadcast GAME_STARTED
            OutboundMessage startedMsg = OutboundMessage.builder()
                    .type(MessageTypes.GAME_STARTED)
                    .roomId(roomId)
                    .gameId(gameId)
                    .payload(Map.of(
                            "room", RoomResponse.from(room),
                            "gameState", gameState
                    ))
                    .build();
            sessionManager.sendToRoom(roomId, startedMsg);

            log.info("Game started in room {} (gameId={}, gameType={})", roomId, gameId, room.getGameType());
            return gameState;
        } finally {
            room.getRoomLock().unlock();
        }
    }

    public GameState<?> restartGame(String roomId, String requesterId) {
        GameRoom room = getRoom(roomId);
        room.getRoomLock().lock();
        try {
            if (!room.getHostPlayerId().equals(requesterId)) {
                throw new GamePlatformException(ErrorCodes.NOT_ROOM_HOST, "Only the room host can restart the game");
            }
            if (room.getPlayerIds().size() < room.getMinPlayers()) {
                throw new GamePlatformException(ErrorCodes.NOT_ENOUGH_PLAYERS, "Not enough players to start. Minimum: " + room.getMinPlayers());
            }

            GameEngine engine = engineRegistry.get(room.getGameType())
                    .orElseThrow(() -> new GamePlatformException(ErrorCodes.GAME_NOT_FOUND, "Game engine not found"));

            List<Player> players = room.getPlayerIds().stream()
                    .map(playerService::getPlayer)
                    .collect(Collectors.toList());

            GameConfiguration config = engine.parseConfiguration(room.getConfiguration());
            String gameId = "game-" + UUID.randomUUID().toString().substring(0, 8);
            GameState<?> gameState;
            try {
                gameState = engine.createGame(gameId, players, config);
            } catch (IllegalArgumentException ex) {
                throw new GamePlatformException(ErrorCodes.NOT_ENOUGH_PLAYERS, ex.getMessage());
            }

            room.setCurrentGameState(gameState);
            room.setStatus(RoomStatus.IN_PROGRESS);
            room.setStartedAt(Instant.now());
            room.setFinishedAt(null);
            roomRepository.save(room);

            // Broadcast GAME_STARTED
            OutboundMessage startedMsg = OutboundMessage.builder()
                    .type(MessageTypes.GAME_STARTED)
                    .roomId(roomId)
                    .gameId(gameId)
                    .payload(Map.of(
                            "room", RoomResponse.from(room),
                            "gameState", gameState
                    ))
                    .build();
            sessionManager.sendToRoom(roomId, startedMsg);

            log.info("Game restarted in room {} (gameId={}, gameType={}) by player {}", roomId, gameId, room.getGameType(), requesterId);
            return gameState;
        } finally {
            room.getRoomLock().unlock();
        }
    }

    public GameResult processGameAction(String roomId, String playerId, String requestId, Map<String, Object> rawAction) {
        GameRoom room = getRoom(roomId);
        Player player = playerService.getPlayer(playerId);

        // Per-room locking guarantees deterministic, serialized action processing
        room.getRoomLock().lock();
        try {
            if (room.getStatus() != RoomStatus.IN_PROGRESS || room.getCurrentGameState() == null) {
                metrics.incrementInvalidActions();
                throw new GamePlatformException(ErrorCodes.GAME_NOT_STARTED, "Game is not in progress");
            }

            if (!room.containsPlayer(playerId)) {
                metrics.incrementInvalidActions();
                throw new GamePlatformException(ErrorCodes.PLAYER_NOT_IN_GAME, "Player is not a participant in this game");
            }

            GameEngine engine = engineRegistry.get(room.getGameType())
                    .orElseThrow(() -> new GamePlatformException(ErrorCodes.GAME_NOT_FOUND, "Game engine not found"));

            GameAction action = engine.parseAction(rawAction);
            GameResult result = engine.processAction(room.getCurrentGameState(), player, action);

            if (!result.isSuccessful()) {
                metrics.incrementInvalidActions();
                OutboundMessage errorMsg = OutboundMessage.builder()
                        .type(MessageTypes.GAME_ERROR)
                        .roomId(roomId)
                        .requestId(requestId)
                        .code(result.getErrorCode())
                        .message(result.getErrorMessage())
                        .build();
                sessionManager.sendToPlayer(playerId, errorMsg);
                return result;
            }

            // Update room game state
            room.setCurrentGameState(result.getNewState());

            // Check if game finished
            if (result.getNewState().getStatus() == GameStatus.FINISHED || result.getNewState().getStatus() == GameStatus.DRAW) {
                room.setStatus(RoomStatus.FINISHED);
                room.setFinishedAt(Instant.now());
                metrics.incrementGamesCompleted();
                if (room.getStartedAt() != null) {
                    metrics.recordGameDuration(Instant.now().toEpochMilli() - room.getStartedAt().toEpochMilli());
                }
            }

            roomRepository.save(room);

            // Broadcast GAME_STATE_UPDATED
            OutboundMessage stateMsg = OutboundMessage.builder()
                    .type(result.getNewState().getStatus() == GameStatus.FINISHED || result.getNewState().getStatus() == GameStatus.DRAW 
                            ? MessageTypes.GAME_FINISHED 
                            : MessageTypes.GAME_STATE_UPDATED)
                    .roomId(roomId)
                    .gameId(result.getNewState().getGameId())
                    .sequence(result.getNewState().getSequence())
                    .payload(Map.of(
                            "gameState", result.getNewState(),
                            "events", result.getEvents() != null ? result.getEvents() : List.of()
                    ))
                    .build();
            sessionManager.sendToRoom(roomId, stateMsg);

            return result;
        } finally {
            room.getRoomLock().unlock();
        }
    }

    public void handlePlayerDisconnect(String playerId) {
        playerService.setPlayerConnected(playerId, false);
        metrics.incrementDisconnects();

        roomRepository.findByPlayerId(playerId).ifPresent(room -> {
            room.getRoomLock().lock();
            try {
                OutboundMessage msg = OutboundMessage.builder()
                        .type(MessageTypes.PLAYER_DISCONNECTED)
                        .roomId(room.getRoomId())
                        .playerId(playerId)
                        .payload(Map.of(
                                "playerId", playerId,
                                "room", RoomResponse.from(room)
                        ))
                        .build();
                sessionManager.sendToRoom(room.getRoomId(), msg);
            } finally {
                room.getRoomLock().unlock();
            }

            // Schedule disconnect timeout to handle forfeit if an active player does not reconnect
            if (room.containsPlayer(playerId)) {
                ScheduledFuture<?> existing = disconnectTasks.remove(playerId);
                if (existing != null) {
                    existing.cancel(false);
                }

                ScheduledFuture<?> task = disconnectScheduler.schedule(() -> {
                    disconnectTasks.remove(playerId);
                    executeDisconnectForfeit(room.getRoomId(), playerId);
                }, disconnectTimeoutSeconds, TimeUnit.SECONDS);

                disconnectTasks.put(playerId, task);
            }
        });
    }

    private void executeDisconnectForfeit(String roomId, String playerId) {
        roomRepository.findById(roomId).ifPresent(room -> {
            room.getRoomLock().lock();
            try {
                Player player = playerService.getPlayer(playerId);
                if (player.isConnected()) {
                    // Player already reconnected
                    return;
                }

                if (room.getStatus() == RoomStatus.IN_PROGRESS && room.getCurrentGameState() != null) {
                    GameEngine engine = engineRegistry.get(room.getGameType()).orElse(null);
                    if (engine != null) {
                        GameResult res = engine.onPlayerDisconnect(room.getCurrentGameState(), player);
                        if (res != null && res.getNewState() != null) {
                            room.setCurrentGameState(res.getNewState());
                            if (res.getNewState().getStatus() == GameStatus.FINISHED || res.getNewState().getStatus() == GameStatus.DRAW) {
                                room.setStatus(RoomStatus.FINISHED);
                                room.setFinishedAt(Instant.now());
                                metrics.incrementGamesCompleted();
                            }
                            roomRepository.save(room);

                            OutboundMessage stateMsg = OutboundMessage.builder()
                                    .type(MessageTypes.GAME_FINISHED)
                                    .roomId(roomId)
                                    .gameId(res.getNewState().getGameId())
                                    .sequence(res.getNewState().getSequence())
                                    .payload(Map.of(
                                            "gameState", res.getNewState(),
                                            "events", res.getEvents() != null ? res.getEvents() : List.of()
                                    ))
                                    .build();
                            sessionManager.sendToRoom(roomId, stateMsg);
                        }
                    }
                }
            } finally {
                room.getRoomLock().unlock();
            }
        });
    }

    public void notifyPlayerReconnected(GameRoom room, Player player) {
        ScheduledFuture<?> task = disconnectTasks.remove(player.getId());
        if (task != null) {
            task.cancel(false);
        }

        metrics.incrementReconnects();
        playerService.setPlayerConnected(player.getId(), true);

        if (room.getStatus() == RoomStatus.IN_PROGRESS && room.getCurrentGameState() != null) {
            GameEngine engine = engineRegistry.get(room.getGameType()).orElse(null);
            if (engine != null) {
                GameResult res = engine.onPlayerReconnect(room.getCurrentGameState(), player);
                if (res != null && res.getNewState() != null) {
                    room.setCurrentGameState(res.getNewState());
                    roomRepository.save(room);
                }
            }
        }

        OutboundMessage msg = OutboundMessage.builder()
                .type(MessageTypes.PLAYER_RECONNECTED)
                .roomId(room.getRoomId())
                .playerId(player.getId())
                .payload(Map.of(
                        "player", player,
                        "room", RoomResponse.from(room)
                ))
                .build();
        sessionManager.sendToRoom(room.getRoomId(), msg);
    }

    @PreDestroy
    public void cleanup() {
        disconnectScheduler.shutdown();
    }

    public GameRoom joinRoomByCode(String secretCode, String playerId, boolean asSpectator) {
        GameRoom room = roomRepository.findBySecretCode(secretCode)
                .orElseThrow(() -> new GamePlatformException(ErrorCodes.INVALID_SECRET_CODE, "Invalid or expired room code"));

        if (room.getStatus() == RoomStatus.IN_PROGRESS && !room.isLateJoinAllowed()) {
            throw new GamePlatformException(ErrorCodes.GAME_ALREADY_STARTED, "Game already started. Late join not allowed");
        }
        if (room.getStatus() == RoomStatus.CANCELLED) {
            throw new GamePlatformException(ErrorCodes.INVALID_SECRET_CODE, "Room is no longer available");
        }

        return joinRoom(room.getRoomId(), playerId, asSpectator);
    }

    private String generateSecretCode() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public List<GameRoom> getAvailableRooms(String gameType) {
        return roomRepository.findAvailableRooms(gameType);
    }

    public Collection<GameRoom> getAllRooms() {
        return roomRepository.findAll();
    }
}
