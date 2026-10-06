package com.example.gameplatform.room;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.common.exception.GamePlatformException;
import com.example.gameplatform.player.model.Player;
import com.example.gameplatform.player.service.PlayerService;
import com.example.gameplatform.room.dto.CreateRoomRequest;
import com.example.gameplatform.room.model.GameRoom;
import com.example.gameplatform.room.model.RoomStatus;
import com.example.gameplatform.room.repository.RoomRepository;
import com.example.gameplatform.room.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.lang.reflect.Field;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class RoomExpiryAndCapacityTest {

    @Autowired
    private PlayerService playerService;

    @Autowired
    private RoomService roomService;

    @Autowired
    private RoomRepository roomRepository;

    @BeforeEach
    void clearRooms() throws Exception {
        // Clear all rooms between tests via reflection
        Field roomsField = RoomRepository.class.getDeclaredField("rooms");
        roomsField.setAccessible(true);
        ((Map<?, ?>) roomsField.get(roomRepository)).clear();
    }

    private CreateRoomRequest buildRequest(String hostId) {
        return CreateRoomRequest.builder()
                .name("Test Room")
                .gameType("TIC_TAC_TOE")
                .hostPlayerId(hostId)
                .maxPlayers(2)
                .build();
    }

    @Test
    @DisplayName("Room expiry task is scheduled on creation and cancelled on game start")
    void roomExpiryTaskScheduledAndCancelledOnStart() throws Exception {
        Player host = playerService.registerPlayer("ExpiryHost_" + System.nanoTime());
        Player guest = playerService.registerPlayer("ExpiryGuest_" + System.nanoTime());

        GameRoom room = roomService.createRoom(buildRequest(host.getId()));
        String roomId = room.getRoomId();

        // Verify expiry task is scheduled
        Field expiryTasksField = RoomService.class.getDeclaredField("roomExpiryTasks");
        expiryTasksField.setAccessible(true);
        @SuppressWarnings("unchecked")
        Map<String, ScheduledFuture<?>> expiryTasks = (Map<String, ScheduledFuture<?>>) expiryTasksField.get(roomService);

        assertTrue(expiryTasks.containsKey(roomId), "Expiry task should be scheduled after room creation");
        assertFalse(expiryTasks.get(roomId).isCancelled(), "Expiry task should not be cancelled yet");

        // Join and start game
        roomService.joinRoom(roomId, guest.getId(), false);
        roomService.startGame(roomId, host.getId());

        // Verify expiry task is cancelled after game starts
        assertFalse(expiryTasks.containsKey(roomId), "Expiry task should be removed after game starts");
    }

    @Test
    @DisplayName("Room capacity limit: cannot create more than 50 active rooms")
    void roomCapacityLimitEnforced() {
        int limit = 50;
        Player host = playerService.registerPlayer("CapacityHost_" + System.nanoTime());

        // Create 50 rooms
        for (int i = 0; i < limit; i++) {
            roomService.createRoom(CreateRoomRequest.builder()
                    .name("Room " + i)
                    .gameType("TIC_TAC_TOE")
                    .hostPlayerId(host.getId())
                    .maxPlayers(2)
                    .build());
        }

        assertEquals(limit, roomRepository.countActiveRooms(), "Should have exactly 50 active rooms");

        // 51st room should fail
        GamePlatformException ex = assertThrows(GamePlatformException.class, () ->
                roomService.createRoom(buildRequest(host.getId())));

        assertEquals(ErrorCodes.ROOM_LIMIT_EXCEEDED, ex.getCode());
    }

    @Test
    @DisplayName("Finished rooms do not count toward the active room limit")
    void finishedRoomsDoNotCountTowardLimit() {
        Player host = playerService.registerPlayer("FinishedHost_" + System.nanoTime());
        Player guest = playerService.registerPlayer("FinishedGuest_" + System.nanoTime());

        // Create and finish one room
        GameRoom room = roomService.createRoom(buildRequest(host.getId()));
        roomService.joinRoom(room.getRoomId(), guest.getId(), false);
        roomService.startGame(room.getRoomId(), host.getId());
        // Manually mark as FINISHED to simulate game end
        room.setStatus(RoomStatus.FINISHED);

        long activeCount = roomRepository.countActiveRooms();
        assertEquals(0, activeCount, "Finished rooms should not count as active");
    }
}
