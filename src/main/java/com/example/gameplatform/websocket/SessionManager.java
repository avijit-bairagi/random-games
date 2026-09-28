package com.example.gameplatform.websocket;

import com.example.gameplatform.websocket.model.OutboundMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SessionManager {

    private static final Logger log = LoggerFactory.getLogger(SessionManager.class);

    private final ObjectMapper objectMapper;

    // playerId -> WebSocketSession
    private final Map<String, WebSocketSession> playerSessions = new ConcurrentHashMap<>();

    // sessionId -> playerId
    private final Map<String, String> sessionToPlayer = new ConcurrentHashMap<>();

    // roomId -> Set of playerIds
    private final Map<String, Set<String>> roomSubscribers = new ConcurrentHashMap<>();

    // Rate limiting tracking: playerId -> lastActionTime / count
    private final Map<String, long[]> rateLimitTracker = new ConcurrentHashMap<>();

    public SessionManager(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void registerSession(String playerId, WebSocketSession session) {
        playerSessions.put(playerId, session);
        sessionToPlayer.put(session.getId(), playerId);
        log.info("Registered session {} for player {}", session.getId(), playerId);
    }

    public void unregisterSession(WebSocketSession session) {
        String playerId = sessionToPlayer.remove(session.getId());
        if (playerId != null) {
            playerSessions.remove(playerId);
            rateLimitTracker.remove(playerId);
            log.info("Unregistered session {} for player {}", session.getId(), playerId);
        }
    }

    public String getPlayerId(WebSocketSession session) {
        return sessionToPlayer.get(session.getId());
    }

    public WebSocketSession getSession(String playerId) {
        return playerSessions.get(playerId);
    }

    public boolean isConnected(String playerId) {
        WebSocketSession session = playerSessions.get(playerId);
        return session != null && session.isOpen();
    }

    public void subscribeRoom(String roomId, String playerId) {
        roomSubscribers.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(playerId);
        log.debug("Player {} subscribed to room {}", playerId, roomId);
    }

    public void unsubscribeRoom(String roomId, String playerId) {
        Set<String> players = roomSubscribers.get(roomId);
        if (players != null) {
            players.remove(playerId);
            if (players.isEmpty()) {
                roomSubscribers.remove(roomId);
            }
        }
        log.debug("Player {} unsubscribed from room {}", playerId, roomId);
    }

    public void sendToPlayer(String playerId, OutboundMessage message) {
        WebSocketSession session = playerSessions.get(playerId);
        if (session != null && session.isOpen()) {
            sendMessage(session, message);
        }
    }

    public void sendToRoom(String roomId, OutboundMessage message) {
        Set<String> subscribers = roomSubscribers.getOrDefault(roomId, Collections.emptySet());
        for (String playerId : subscribers) {
            sendToPlayer(playerId, message);
        }
    }

    public void sendToRoomExcept(String roomId, String excludedPlayerId, OutboundMessage message) {
        Set<String> subscribers = roomSubscribers.getOrDefault(roomId, Collections.emptySet());
        for (String playerId : subscribers) {
            if (!playerId.equals(excludedPlayerId)) {
                sendToPlayer(playerId, message);
            }
        }
    }

    public boolean checkRateLimit(String playerId, int maxRequestsPerSec) {
        long now = System.currentTimeMillis();
        long[] record = rateLimitTracker.computeIfAbsent(playerId, k -> new long[]{now, 0});
        synchronized (record) {
            if (now - record[0] > 1000) {
                record[0] = now;
                record[1] = 1;
                return true;
            } else {
                record[1]++;
                return record[1] <= maxRequestsPerSec;
            }
        }
    }

    private void sendMessage(WebSocketSession session, OutboundMessage message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (IOException e) {
            log.error("Failed to send message to session {}: {}", session.getId(), e.getMessage());
        }
    }

    public int getActiveConnectionCount() {
        return playerSessions.size();
    }

    public Set<String> getRoomSubscribers(String roomId) {
        return Collections.unmodifiableSet(roomSubscribers.getOrDefault(roomId, Collections.emptySet()));
    }
}
