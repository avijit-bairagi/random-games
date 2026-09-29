package com.example.gameplatform.integration;

import com.example.gameplatform.common.exception.GamePlatformException;
import com.example.gameplatform.game.core.GameResult;
import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import com.example.gameplatform.game.snake.SnakeState;
import com.example.gameplatform.player.model.Player;
import com.example.gameplatform.player.service.PlayerService;
import com.example.gameplatform.room.dto.CreateRoomRequest;
import com.example.gameplatform.room.dto.RoomResponse;
import com.example.gameplatform.room.model.GameRoom;
import com.example.gameplatform.room.model.RoomStatus;
import com.example.gameplatform.room.service.RoomService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PlatformIntegrationTest {

    @Autowired
    private PlayerService playerService;

    @Autowired
    private RoomService roomService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("shouldCreatePlayerAndRoomLifecycle")
    void shouldCreatePlayerAndRoomLifecycle() {
        Player host = playerService.registerPlayer("HostUser");
        Player guest = playerService.registerPlayer("GuestUser");

        assertNotNull(host.getId());
        assertNotNull(guest.getId());

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Test TicTacToe Room")
                .gameType("TIC_TAC_TOE")
                .hostPlayerId(host.getId())
                .maxPlayers(2)
                .build();

        GameRoom room = roomService.createRoom(request);
        assertNotNull(room.getRoomId());
        assertEquals(RoomStatus.WAITING, room.getStatus());

        // Guest joins room
        GameRoom joined = roomService.joinRoom(room.getRoomId(), guest.getId(), false);
        assertEquals(RoomStatus.READY, joined.getStatus());
        assertEquals(2, joined.getPlayerIds().size());

        // Start game
        roomService.startGame(room.getRoomId(), host.getId());
        GameRoom startedRoom = roomService.getRoom(room.getRoomId());
        assertEquals(RoomStatus.IN_PROGRESS, startedRoom.getStatus());
        assertNotNull(startedRoom.getCurrentGameState());

        // Restart game
        GameState<?> restartedState = roomService.restartGame(room.getRoomId(), host.getId());
        assertNotNull(restartedState);
        GameRoom restartedRoom = roomService.getRoom(room.getRoomId());
        assertEquals(RoomStatus.IN_PROGRESS, restartedRoom.getStatus());

        // Leave room
        roomService.leaveRoom(room.getRoomId(), guest.getId());
        GameRoom afterLeave = roomService.getRoom(room.getRoomId());
        assertEquals(1, afterLeave.getPlayerIds().size());
        assertEquals(RoomStatus.FINISHED, afterLeave.getStatus());
    }

    @Test
    @DisplayName("shouldDeleteRoomWhenCreatorLeaves")
    void shouldDeleteRoomWhenCreatorLeaves() {
        Player host = playerService.registerPlayer("HostCreator");
        Player guest = playerService.registerPlayer("GuestPlayer");

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Creator Room")
                .gameType("TIC_TAC_TOE")
                .hostPlayerId(host.getId())
                .maxPlayers(2)
                .build();

        GameRoom room = roomService.createRoom(request);
        roomService.joinRoom(room.getRoomId(), guest.getId(), false);

        // Host leaves -> room should be deleted
        roomService.leaveRoom(room.getRoomId(), host.getId());

        assertThrows(GamePlatformException.class, () -> roomService.getRoom(room.getRoomId()));
    }

    @Test
    @DisplayName("shouldKeepRoomAvailableWhenNonCreatorEntersAndExits")
    void shouldKeepRoomAvailableWhenNonCreatorEntersAndExits() {
        Player host = playerService.registerPlayer("HostWaiting");
        Player guest = playerService.registerPlayer("GuestVisitor");

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Waiting Room")
                .gameType("TIC_TAC_TOE")
                .hostPlayerId(host.getId())
                .maxPlayers(2)
                .build();

        GameRoom room = roomService.createRoom(request);
        assertEquals(RoomStatus.WAITING, room.getStatus());

        // Guest joins
        roomService.joinRoom(room.getRoomId(), guest.getId(), false);
        GameRoom readyRoom = roomService.getRoom(room.getRoomId());
        assertEquals(RoomStatus.READY, readyRoom.getStatus());

        // Guest leaves before game started
        roomService.leaveRoom(room.getRoomId(), guest.getId());

        // Room is still available and status reverted to WAITING
        GameRoom availableRoom = roomService.getRoom(room.getRoomId());
        assertNotNull(availableRoom);
        assertEquals(RoomStatus.WAITING, availableRoom.getStatus());
        assertEquals(1, availableRoom.getPlayerIds().size());

        List<GameRoom> avail = roomService.getAvailableRooms("TIC_TAC_TOE");
        assertTrue(avail.stream().anyMatch(r -> r.getRoomId().equals(room.getRoomId())));
    }

    @Test
    @DisplayName("shouldStopRunningGameWhenParticipantLeaves")
    void shouldStopRunningGameWhenParticipantLeaves() {
        Player host = playerService.registerPlayer("MatchHost");
        Player guest = playerService.registerPlayer("MatchGuest");

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Match Room")
                .gameType("TIC_TAC_TOE")
                .hostPlayerId(host.getId())
                .maxPlayers(2)
                .build();

        GameRoom room = roomService.createRoom(request);
        roomService.joinRoom(room.getRoomId(), guest.getId(), false);
        roomService.startGame(room.getRoomId(), host.getId());

        GameRoom runningRoom = roomService.getRoom(room.getRoomId());
        assertEquals(RoomStatus.IN_PROGRESS, runningRoom.getStatus());

        // Guest leaves running game -> game stops immediately
        roomService.leaveRoom(room.getRoomId(), guest.getId());

        GameRoom stoppedRoom = roomService.getRoom(room.getRoomId());
        assertEquals(RoomStatus.FINISHED, stoppedRoom.getStatus());
        assertEquals(GameStatus.FINISHED, stoppedRoom.getCurrentGameState().getStatus());
        assertEquals(host.getId(), stoppedRoom.getCurrentGameState().getWinner());

        // Room is still available in available rooms list
        List<GameRoom> available = roomService.getAvailableRooms("TIC_TAC_TOE");
        assertTrue(available.stream().anyMatch(r -> r.getRoomId().equals(room.getRoomId())));

        // Guest can rejoin the room
        GameRoom rejoinedRoom = roomService.joinRoom(room.getRoomId(), guest.getId(), false);
        assertEquals(RoomStatus.READY, rejoinedRoom.getStatus());
        assertEquals(2, rejoinedRoom.getPlayerIds().size());

        // Host can start a new match
        GameState<?> newMatch = roomService.startGame(room.getRoomId(), host.getId());
        assertNotNull(newMatch);
        assertEquals(RoomStatus.IN_PROGRESS, roomService.getRoom(room.getRoomId()).getStatus());

        // Now host leaves -> room is deleted completely
        roomService.leaveRoom(room.getRoomId(), host.getId());
        assertFalse(roomService.getAvailableRooms("TIC_TAC_TOE").stream().anyMatch(r -> r.getRoomId().equals(room.getRoomId())));
    }

    @Test
    @DisplayName("shouldPlaySnakeAndLadderLifecycleWithThreePlayers")
    void shouldPlaySnakeAndLadderLifecycleWithThreePlayers() {
        Player p1 = playerService.registerPlayer("SnakePlayer1");
        Player p2 = playerService.registerPlayer("SnakePlayer2");
        Player p3 = playerService.registerPlayer("SnakePlayer3");

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Snake and Ladder 3P Room")
                .gameType("SNAKE")
                .hostPlayerId(p1.getId())
                .maxPlayers(3)
                .build();

        GameRoom room = roomService.createRoom(request);
        roomService.joinRoom(room.getRoomId(), p2.getId(), false);
        roomService.joinRoom(room.getRoomId(), p3.getId(), false);

        GameRoom readyRoom = roomService.getRoom(room.getRoomId());
        assertEquals(3, readyRoom.getPlayerIds().size());

        // Start Snake and Ladder game with 3 players
        GameState<?> startedState = roomService.startGame(room.getRoomId(), p1.getId());
        assertNotNull(startedState);
        assertTrue(startedState instanceof SnakeState);
        SnakeState sState = (SnakeState) startedState;
        assertEquals(3, sState.getDetails().getTurnOrder().size());
        String activePlayerId = sState.getDetails().getCurrentPlayerId();
        assertNotNull(activePlayerId);
        assertTrue(List.of(p1.getId(), p2.getId(), p3.getId()).contains(activePlayerId));

        // Active player rolls dice
        GameResult rollResult = roomService.processGameAction(room.getRoomId(), activePlayerId, "req-1", Map.of(
                "action", "ROLL_DICE",
                "diceValue", 4 // Lands on ladder 4 -> climbs to 14
        ));

        assertTrue(rollResult.isSuccessful());
        SnakeState updatedState = (SnakeState) rollResult.getNewState();
        assertEquals(14, updatedState.getDetails().getPlayers().get(activePlayerId).getPosition());
    }

    @Test
    @DisplayName("shouldEnforcePlayerLimitsForLudoAndSnake")
    void shouldEnforcePlayerLimitsForLudoAndSnake() {
        Player p1 = playerService.registerPlayer("LudoP1");
        Player p2 = playerService.registerPlayer("LudoP2");
        Player p3 = playerService.registerPlayer("LudoP3");

        CreateRoomRequest ludoRequest = CreateRoomRequest.builder()
                .name("Ludo 3P Attempt")
                .gameType("LUDO")
                .hostPlayerId(p1.getId())
                .maxPlayers(4)
                .build();

        GameRoom ludoRoom = roomService.createRoom(ludoRequest);
        roomService.joinRoom(ludoRoom.getRoomId(), p2.getId(), false);
        roomService.joinRoom(ludoRoom.getRoomId(), p3.getId(), false);

        // 3 players is invalid for Ludo -> starting game fails
        assertThrows(GamePlatformException.class, () -> roomService.startGame(ludoRoom.getRoomId(), p1.getId()));
    }

    @Test
    @DisplayName("shouldAllowOnlyCreatorToRestartGame")
    void shouldAllowOnlyCreatorToRestartGame() {
        Player host = playerService.registerPlayer("RestartHost");
        Player guest = playerService.registerPlayer("RestartGuest");

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Restart Test Room")
                .gameType("TIC_TAC_TOE")
                .hostPlayerId(host.getId())
                .maxPlayers(2)
                .build();

        GameRoom room = roomService.createRoom(request);
        roomService.joinRoom(room.getRoomId(), guest.getId(), false);
        roomService.startGame(room.getRoomId(), host.getId());

        // Non-host attempts restart -> throws exception
        GamePlatformException ex = assertThrows(GamePlatformException.class,
                () -> roomService.restartGame(room.getRoomId(), guest.getId()));
        assertEquals("NOT_ROOM_HOST", ex.getCode());

        // Host attempts restart -> succeeds
        GameState<?> restartedState = roomService.restartGame(room.getRoomId(), host.getId());
        assertNotNull(restartedState);
        assertEquals(RoomStatus.IN_PROGRESS, roomService.getRoom(room.getRoomId()).getStatus());
    }

    @Test
    @DisplayName("shouldHandleSpectatorModeCorrectly")
    void shouldHandleSpectatorModeCorrectly() {
        Player host = playerService.registerPlayer("SpecHost");
        Player guest = playerService.registerPlayer("SpecGuest");
        Player spectator = playerService.registerPlayer("SpecViewer");

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Spectator Test Room")
                .gameType("TIC_TAC_TOE")
                .hostPlayerId(host.getId())
                .maxPlayers(2)
                .spectatorAllowed(true)
                .build();

        GameRoom room = roomService.createRoom(request);
        roomService.joinRoom(room.getRoomId(), guest.getId(), false);
        roomService.joinRoom(room.getRoomId(), spectator.getId(), true);

        GameRoom currentRoom = roomService.getRoom(room.getRoomId());
        assertEquals(2, currentRoom.getPlayerIds().size());
        assertEquals(1, currentRoom.getSpectatorIds().size());
        assertTrue(currentRoom.containsSpectator(spectator.getId()));
        assertFalse(currentRoom.containsPlayer(spectator.getId()));

        RoomResponse response = RoomResponse.from(currentRoom);
        assertEquals(2, response.getCurrentPlayersCount());
        assertEquals(1, response.getSpectatorCount());

        // Start game with 2 active players
        GameState<?> started = roomService.startGame(room.getRoomId(), host.getId());
        assertNotNull(started);
        assertEquals(2, started.getPlayers().size());

        // Spectator attempting game action is rejected
        GamePlatformException ex = assertThrows(GamePlatformException.class,
                () -> roomService.processGameAction(room.getRoomId(), spectator.getId(), "req-spec", Map.of(
                        "action", "PLACE_MARK",
                        "row", 0,
                        "column", 0
                )));
        assertEquals("PLAYER_NOT_IN_GAME", ex.getCode());

        // Spectator leaves room -> match remains IN_PROGRESS and player count unaffected
        roomService.leaveRoom(room.getRoomId(), spectator.getId());
        GameRoom afterLeave = roomService.getRoom(room.getRoomId());
        assertEquals(0, afterLeave.getSpectatorIds().size());
        assertEquals(2, afterLeave.getPlayerIds().size());
        assertEquals(RoomStatus.IN_PROGRESS, afterLeave.getStatus());
    }

    @Test
    @DisplayName("shouldGenerateCoolNameWhenUsernameNotProvidedAndDeduplicateDuplicates")
    void shouldGenerateCoolNameWhenUsernameNotProvidedAndDeduplicateDuplicates() {
        // Register player without username -> gets a cool gamer name
        Player p1 = playerService.registerPlayer(null);
        assertNotNull(p1.getUsername());
        assertFalse(p1.getUsername().trim().isEmpty());
        assertTrue(PlayerService.COOL_NAMES.contains(p1.getUsername()) || p1.getUsername().matches(".+\\s\\d+"));

        Player p2 = playerService.registerPlayer("   ");
        assertNotNull(p2.getUsername());
        assertFalse(p2.getUsername().trim().isEmpty());

        // Duplicate username -> appends 1, 2, ...
        Player custom1 = playerService.registerPlayer("ApexHero");
        assertEquals("ApexHero", custom1.getUsername());

        Player custom2 = playerService.registerPlayer("ApexHero");
        assertEquals("ApexHero 1", custom2.getUsername());

        Player custom3 = playerService.registerPlayer("ApexHero");
        assertEquals("ApexHero 2", custom3.getUsername());
    }

    @Test
    @DisplayName("shouldIncludePlayerAndSpectatorNamesInRoomResponse")
    void shouldIncludePlayerAndSpectatorNamesInRoomResponse() {
        Player host = playerService.registerPlayer("AlphaHost");
        Player player = playerService.registerPlayer("BetaPlayer");
        Player spectator = playerService.registerPlayer("GammaViewer");

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Naming Test Room")
                .gameType("TIC_TAC_TOE")
                .hostPlayerId(host.getId())
                .maxPlayers(2)
                .spectatorAllowed(true)
                .build();

        GameRoom room = roomService.createRoom(request);
        roomService.joinRoom(room.getRoomId(), player.getId(), false);
        roomService.joinRoom(room.getRoomId(), spectator.getId(), true);

        GameRoom currentRoom = roomService.getRoom(room.getRoomId());
        RoomResponse response = RoomResponse.from(currentRoom);

        assertEquals("AlphaHost", response.getHostUsername());
        assertNotNull(response.getPlayerNames());
        assertEquals("AlphaHost", response.getPlayerNames().get(host.getId()));
        assertEquals("BetaPlayer", response.getPlayerNames().get(player.getId()));

        assertNotNull(response.getSpectatorNames());
        assertEquals("GammaViewer", response.getSpectatorNames().get(spectator.getId()));
    }

    @Test
    @DisplayName("shouldServeFaviconStaticResource")
    void shouldServeFaviconStaticResource() {
        ResponseEntity<byte[]> response = restTemplate.getForEntity("/favicon.ico", byte[].class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().length > 0);
    }
}
