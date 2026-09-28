# Developer Guide: How to Add a New Game

This guide outlines how to create and register a new game on the **Multiplayer Random Games Platform** without modifying existing game implementations or core platform mechanics.

---

## 1. Architecture Overview

The platform uses a pluggable, server-authoritative architecture:

```text
GameEngine<S, A, C>
   ├── S : GameState Details (game-specific board, scores, turns)
   ├── A : GameAction (actions sent by clients, e.g. MOVE, ROLL, PLACE_MARK)
   └── C : GameConfiguration (custom rules or board dimensions)
```

Adding a new game requires 4 primary steps:
1. Define the **GameAction** class.
2. Define the **GameConfiguration** class.
3. Define the **GameState** representation.
4. Implement the **GameEngine** interface annotated with `@Component`.

---

## 2. Step-by-Step Implementation

### Step 1: Create Game Action

Create an action class implementing `GameAction`:

```java
package com.example.gameplatform.game.connectfour;

import com.example.gameplatform.game.core.GameAction;

public class ConnectFourAction implements GameAction {
    public static final String DROP_DISC = "DROP_DISC";

    private String actionType;
    private int column;

    public ConnectFourAction() {}
    public ConnectFourAction(String actionType, int column) {
        this.actionType = actionType != null ? actionType : DROP_DISC;
        this.column = column;
    }

    @Override
    public String getActionType() {
        return actionType != null ? actionType : DROP_DISC;
    }

    public int getColumn() { return column; }
    public void setColumn(int column) { this.column = column; }
}
```

---

### Step 2: Create Game Configuration

Create a configuration class implementing `GameConfiguration`:

```java
package com.example.gameplatform.game.connectfour;

import com.example.gameplatform.game.core.GameConfiguration;
import java.util.Map;

public class ConnectFourConfiguration implements GameConfiguration {
    private int rows = 6;
    private int columns = 7;

    public ConnectFourConfiguration() {}
    public ConnectFourConfiguration(int rows, int columns) {
        this.rows = rows;
        this.columns = columns;
    }

    @Override
    public Map<String, Object> getCustomOptions() {
        return Map.of("rows", rows, "columns", columns);
    }

    public int getRows() { return rows; }
    public int getColumns() { return columns; }
}
```

---

### Step 3: Create Game State

Create the game state implementing `GameState<Details>`:

```java
package com.example.gameplatform.game.connectfour;

import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import java.util.*;

public class ConnectFourState implements GameState<ConnectFourState.Details> {
    private String gameId;
    private GameStatus status;
    private List<String> players;
    private String winner;
    private int sequence;
    private long updatedAt;
    private Details details;

    public static class Details {
        private String[][] grid; // 6x7 grid
        private String currentPlayerId;
        private Map<String, String> playerColors; // playerId -> RED/YELLOW

        public Details() {}
        public Details(String[][] grid, String currentPlayerId, Map<String, String> playerColors) {
            this.grid = grid;
            this.currentPlayerId = currentPlayerId;
            this.playerColors = playerColors;
        }

        public String[][] getGrid() { return grid; }
        public String getCurrentPlayerId() { return currentPlayerId; }
        public Map<String, String> getPlayerColors() { return playerColors; }
    }

    @Override
    public String getGameType() { return "CONNECT_FOUR"; }
    @Override
    public String getGameId() { return gameId; }
    @Override
    public GameStatus getStatus() { return status; }
    @Override
    public List<String> getPlayers() { return players; }
    @Override
    public String getWinner() { return winner; }
    @Override
    public int getSequence() { return sequence; }
    @Override
    public long getUpdatedAt() { return updatedAt; }
    @Override
    public Details getDetails() { return details; }

    @Override
    public Map<String, Object> toSummary() {
        return Map.of(
            "gameId", gameId,
            "status", status,
            "winner", winner != null ? winner : "",
            "currentPlayerId", details != null ? details.getCurrentPlayerId() : ""
        );
    }
}
```

---

### Step 4: Implement the GameEngine

Create a Spring `@Component` implementing `GameEngine`:

```java
package com.example.gameplatform.game.connectfour;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.game.core.*;
import com.example.gameplatform.player.model.Player;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.*;

@Component
public class ConnectFourGameEngine implements GameEngine<ConnectFourState.Details, ConnectFourAction, ConnectFourConfiguration> {

    @Override
    public String gameType() { return "CONNECT_FOUR"; }

    @Override
    public String displayName() { return "Connect Four"; }

    @Override
    public int minPlayers() { return 2; }

    @Override
    public int maxPlayers() { return 2; }

    @Override
    public boolean isSpectatorAllowed() { return true; }

    @Override
    public boolean isLateJoinAllowed() { return false; }

    @Override
    public ConnectFourConfiguration defaultConfiguration() {
        return new ConnectFourConfiguration(6, 7);
    }

    @Override
    public GameState<ConnectFourState.Details> createGame(String gameId, List<Player> players, ConnectFourConfiguration config) {
        // Initialize board, assign colors, build and return ConnectFourState
        return null;
    }

    @Override
    public GameResult processAction(GameState<?> state, Player player, ConnectFourAction action) {
        // Validate turn, place disc into lowest available slot in chosen column,
        // check 4-in-a-row win condition, return GameResult.success(...) or GameResult.failure(...)
        return null;
    }

    @Override
    public boolean isValidAction(GameState<?> state, Player player, ConnectFourAction action) {
        // Return true if action conforms to game rules
        return true;
    }

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        // Handle disconnect forfeit or pause
        return GameResult.success(state);
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.success(state);
    }

    @Override
    public ConnectFourAction parseAction(Map<String, Object> rawAction) {
        String actionType = (String) rawAction.getOrDefault("action", "DROP_DISC");
        int column = rawAction.get("column") instanceof Number n ? n.intValue() : 0;
        return new ConnectFourAction(actionType, column);
    }

    @Override
    public ConnectFourConfiguration parseConfiguration(Map<String, Object> rawConfig) {
        return defaultConfiguration();
    }
}
```

---

## 3. Automatic Discovery & Registration

Because `GameEngineRegistry` is injected with `List<GameEngine<?, ?, ?>>` via Spring dependency injection:
* Spring Boot automatically detects the new `@Component` at startup.
* The game type becomes immediately available in `/api/v1/games`.
* Rooms can be created via `POST /api/v1/games/CONNECT_FOUR/rooms`.
* Real-time WebSocket routing works out of the box.
* No changes to other games or platform code are required.
