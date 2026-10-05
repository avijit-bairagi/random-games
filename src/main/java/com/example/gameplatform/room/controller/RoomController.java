package com.example.gameplatform.room.controller;

import com.example.gameplatform.room.dto.CreateRoomRequest;
import com.example.gameplatform.room.dto.RoomResponse;
import com.example.gameplatform.room.model.GameRoom;
import com.example.gameplatform.room.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/games")
@Tag(name = "Rooms & Games", description = "Room lifecycle and lobby management operations")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    public static class JoinRoomRequest {
        private String playerId;
        private boolean asSpectator;

        public JoinRoomRequest() {}
        public JoinRoomRequest(String playerId, boolean asSpectator) {
            this.playerId = playerId;
            this.asSpectator = asSpectator;
        }

        public String getPlayerId() { return playerId; }
        public void setPlayerId(String playerId) { this.playerId = playerId; }
        public boolean isAsSpectator() { return asSpectator; }
        public void setAsSpectator(boolean asSpectator) { this.asSpectator = asSpectator; }
    }

    public static class JoinByCodeRequest {
        private String secretCode;
        private String playerId;
        private boolean asSpectator;

        public JoinByCodeRequest() {}

        public String getSecretCode() { return secretCode; }
        public void setSecretCode(String secretCode) { this.secretCode = secretCode; }
        public String getPlayerId() { return playerId; }
        public void setPlayerId(String playerId) { this.playerId = playerId; }
        public boolean isAsSpectator() { return asSpectator; }
        public void setAsSpectator(boolean asSpectator) { this.asSpectator = asSpectator; }
    }

    @PostMapping("/rooms")
    @Operation(summary = "Create a new game room")
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        GameRoom room = roomService.createRoom(request);
        return ResponseEntity.ok(RoomResponse.from(room, room.isPrivateRoom()));
    }

    @PostMapping("/{gameType}/rooms")
    @Operation(summary = "Create a new game room for specific game type")
    public ResponseEntity<RoomResponse> createGameTypeRoom(@PathVariable String gameType,
                                                          @Valid @RequestBody CreateRoomRequest request) {
        request.setGameType(gameType);
        GameRoom room = roomService.createRoom(request);
        return ResponseEntity.ok(RoomResponse.from(room, room.isPrivateRoom()));
    }

    @GetMapping("/rooms")
    @Operation(summary = "List all game rooms (optional gameType filter)")
    public ResponseEntity<List<RoomResponse>> getRooms(@RequestParam(required = false) String gameType) {
        List<RoomResponse> rooms = roomService.getAvailableRooms(gameType).stream()
                .map(RoomResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{gameType}/rooms")
    @Operation(summary = "List available game rooms for specific game type")
    public ResponseEntity<List<RoomResponse>> getRoomsByGameType(@PathVariable String gameType) {
        List<RoomResponse> rooms = roomService.getAvailableRooms(gameType).stream()
                .map(RoomResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/rooms/{roomId}")
    @Operation(summary = "Get room details and current status")
    public ResponseEntity<RoomResponse> getRoom(@PathVariable String roomId) {
        GameRoom room = roomService.getRoom(roomId);
        return ResponseEntity.ok(RoomResponse.from(room));
    }

    @PostMapping("/rooms/{roomId}/join")
    @Operation(summary = "Join a game room")
    public ResponseEntity<RoomResponse> joinRoom(@PathVariable String roomId,
                                                 @RequestBody JoinRoomRequest request) {
        GameRoom room = roomService.joinRoom(roomId, request.getPlayerId(), request.isAsSpectator());
        return ResponseEntity.ok(RoomResponse.from(room));
    }

    @PostMapping("/rooms/join-by-code")
    @Operation(summary = "Join a private game room using a secret code")
    public ResponseEntity<RoomResponse> joinRoomByCode(@RequestBody JoinByCodeRequest request) {
        GameRoom room = roomService.joinRoomByCode(request.getSecretCode(), request.getPlayerId(), request.isAsSpectator());
        return ResponseEntity.ok(RoomResponse.from(room));
    }

    @DeleteMapping("/rooms/{roomId}/players/{playerId}")
    @Operation(summary = "Leave a game room")
    public ResponseEntity<Void> leaveRoom(@PathVariable String roomId,
                                          @PathVariable String playerId) {
        roomService.leaveRoom(roomId, playerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rooms/{roomId}/start")
    @Operation(summary = "Start game in room (host only)")
    public ResponseEntity<RoomResponse> startGame(@PathVariable String roomId,
                                                  @RequestParam String playerId) {
        roomService.startGame(roomId, playerId);
        GameRoom room = roomService.getRoom(roomId);
        return ResponseEntity.ok(RoomResponse.from(room));
    }

    @PostMapping("/rooms/{roomId}/restart")
    @Operation(summary = "Restart individual game in room")
    public ResponseEntity<RoomResponse> restartGame(@PathVariable String roomId,
                                                    @RequestParam String playerId) {
        roomService.restartGame(roomId, playerId);
        GameRoom room = roomService.getRoom(roomId);
        return ResponseEntity.ok(RoomResponse.from(room));
    }
}
