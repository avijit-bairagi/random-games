package com.example.gameplatform.websocket;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.common.exception.GamePlatformException;
import com.example.gameplatform.player.model.Player;
import com.example.gameplatform.player.service.PlayerService;
import com.example.gameplatform.room.service.RoomService;
import com.example.gameplatform.websocket.model.InboundMessage;
import com.example.gameplatform.websocket.model.MessageTypes;
import com.example.gameplatform.websocket.model.OutboundMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Map;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocketHandler.class);

    private final SessionManager sessionManager;
    private final PlayerService playerService;
    private final RoomService roomService;
    private final ObjectMapper objectMapper;

    public GameWebSocketHandler(SessionManager sessionManager,
                                PlayerService playerService,
                                RoomService roomService,
                                ObjectMapper objectMapper) {
        this.sessionManager = sessionManager;
        this.playerService = playerService;
        this.roomService = roomService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        String playerId = extractQueryParam(uri, "playerId");

        if (playerId != null && !playerId.isBlank()) {
            try {
                Player player = playerService.getPlayer(playerId);
                sessionManager.registerSession(playerId, session);
                playerService.setPlayerConnected(playerId, true);

                String roomId = extractQueryParam(uri, "roomId");
                if (roomId != null && !roomId.isBlank()) {
                    sessionManager.subscribeRoom(roomId, playerId);
                }

                OutboundMessage welcome = OutboundMessage.builder()
                        .type(MessageTypes.PONG)
                        .playerId(playerId)
                        .message("Connected to Game Platform")
                        .build();
                sessionManager.sendToPlayer(playerId, welcome);
                log.info("WebSocket connected: session={}, player={}", session.getId(), playerId);
                return;
            } catch (Exception ex) {
                log.warn("Connection with unknown playerId: {}", playerId);
            }
        }

        // If no valid playerId param provided, register session under session.getId()
        sessionManager.registerSession(session.getId(), session);
        log.info("Anonymous WebSocket connected: session={}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) {
        String payload = textMessage.getPayload();
        InboundMessage msg;
        try {
            msg = objectMapper.readValue(payload, InboundMessage.class);
        } catch (Exception e) {
            log.warn("Invalid JSON payload from session {}: {}", session.getId(), e.getMessage());
            sendRawError(session, null, ErrorCodes.INVALID_MESSAGE_FORMAT, "Invalid JSON format: " + e.getMessage());
            return;
        }

        String playerId = msg.getPlayerId();
        if (playerId == null || playerId.isBlank()) {
            playerId = sessionManager.getPlayerId(session);
        }

        if (playerId == null || playerId.isBlank()) {
            sendRawError(session, msg.getRequestId(), ErrorCodes.PLAYER_NOT_FOUND, "Player ID is required");
            return;
        }

        // Rate limit check: max 30 actions per second per player
        if (!sessionManager.checkRateLimit(playerId, 30)) {
            sendRawError(session, msg.getRequestId(), ErrorCodes.RATE_LIMIT_EXCEEDED, "Action rate limit exceeded");
            return;
        }

        playerService.updateLastActive(playerId);

        try {
            switch (msg.getType()) {
                case MessageTypes.PING -> {
                    OutboundMessage pong = OutboundMessage.builder()
                            .type(MessageTypes.PONG)
                            .requestId(msg.getRequestId())
                            .build();
                    sessionManager.sendToPlayer(playerId, pong);
                }
                case MessageTypes.JOIN_ROOM -> {
                    boolean asSpectator = msg.getPayload() != null && Boolean.TRUE.equals(msg.getPayload().get("asSpectator"));
                    roomService.joinRoom(msg.getRoomId(), playerId, asSpectator);
                }
                case MessageTypes.LEAVE_ROOM -> {
                    roomService.leaveRoom(msg.getRoomId(), playerId);
                }
                case MessageTypes.START_GAME -> {
                    roomService.startGame(msg.getRoomId(), playerId);
                }
                case MessageTypes.GAME_ACTION -> {
                    if (msg.getRoomId() == null || msg.getPayload() == null) {
                        sendRawError(session, msg.getRequestId(), ErrorCodes.INVALID_ACTION, "RoomId and payload are required for game action");
                        return;
                    }
                    roomService.processGameAction(msg.getRoomId(), playerId, msg.getRequestId(), msg.getPayload());
                }
                case MessageTypes.RESTART_GAME -> {
                    roomService.restartGame(msg.getRoomId(), playerId);
                }
                default -> {
                    sendRawError(session, msg.getRequestId(), ErrorCodes.INVALID_ACTION, "Unsupported message type: " + msg.getType());
                }
            }
        } catch (GamePlatformException ex) {
            log.debug("Game action error for player {}: {}", playerId, ex.getMessage());
            OutboundMessage err = OutboundMessage.builder()
                    .type(MessageTypes.GAME_ERROR)
                    .roomId(msg.getRoomId())
                    .requestId(msg.getRequestId())
                    .code(ex.getCode())
                    .message(ex.getMessage())
                    .build();
            sessionManager.sendToPlayer(playerId, err);
        } catch (Exception ex) {
            log.error("Unexpected error handling websocket message: {}", ex.getMessage(), ex);
            OutboundMessage err = OutboundMessage.builder()
                    .type(MessageTypes.GAME_ERROR)
                    .roomId(msg.getRoomId())
                    .requestId(msg.getRequestId())
                    .code(ErrorCodes.INTERNAL_ERROR)
                    .message(ex.getMessage())
                    .build();
            sessionManager.sendToPlayer(playerId, err);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String playerId = sessionManager.getPlayerId(session);
        sessionManager.unregisterSession(session);

        if (playerId != null) {
            log.info("WebSocket closed for player {}: status={}", playerId, status);
            roomService.handlePlayerDisconnect(playerId);
        }
    }

    private void sendRawError(WebSocketSession session, String requestId, String code, String message) {
        try {
            OutboundMessage err = OutboundMessage.builder()
                    .type(MessageTypes.GAME_ERROR)
                    .requestId(requestId)
                    .code(code)
                    .message(message)
                    .build();
            String json = objectMapper.writeValueAsString(err);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (Exception ignored) {}
    }

    private String extractQueryParam(URI uri, String key) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }
        String query = uri.getQuery();
        for (String param : query.split("&")) {
            String[] pair = param.split("=");
            if (pair.length == 2 && pair[0].equalsIgnoreCase(key)) {
                return pair[1];
            }
        }
        return null;
    }
}
