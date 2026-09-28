# Web-Based Multiplayer Random Games Platform

A scalable, modular, real-time multiplayer gaming platform built on **Java 25**, **Spring Boot 3.x**, and **WebSockets**, featuring **Tic-Tac-Toe**, **Ludo**, and **Snake**.

---

## Key Features

1. **Pluggable Game Abstraction**:
   - Generic `GameEngine<S, A, C>` interface isolating rules, actions, and configurations.
   - New games can be added independently without modifying existing engines (`HOW_TO_ADD_A_NEW_GAME.md`).
2. **Deterministic, Authoritative Server**:
   - Per-room locking mechanism (`ReentrantLock`) ensuring serialized, atomic action execution without race conditions.
   - Client sends only player intentions (`PLACE_MARK`, `ROLL_DICE`, `CHANGE_DIRECTION`); state calculations and validations occur strictly server-side.
3. **Real-time WebSocket Transport**:
   - Uniform message envelopes for actions, events, and room lifecycle (`GAME_STATE_UPDATED`, `GAME_STARTED`, `PLAYER_JOINED`).
   - Rate limiting (30 requests/sec per player) and heartbeats.
4. **Three Fully Functional Real-Time Games**:
   - **Tic-Tac-Toe**: 2 players, 3x3 turn management, win & draw detection, forfeit on disconnect.
   - **Ludo**: 2-4 players, colors, dice rolls, safe squares, capturing opponent tokens, home column progression, bonus turns on six/capture/home goal.
   - **Snake**: 1-6 players, server-authoritative tick loop scheduler, wall/self/opponent collisions, food digestion & growth.
5. **Modern Web UI**:
   - Single-page responsive client in HTML5 / CSS / Canvas.
   - Real-time room list, creation modal, interactive boards, and event feed.
6. **Observability & Documentation**:
   - Spring Boot Actuator (`/actuator/health`, `/actuator/metrics`, `/actuator/prometheus`).
   - Micrometer custom metrics (games created, finished, duration, invalid actions, disconnects).
   - OpenAPI / Swagger UI (`/swagger-ui.html`).

---

## Tech Stack

- **Backend**: Java 25, Spring Boot 3.4.3, Spring WebSocket, Micrometer Prometheus, SpringDoc OpenAPI, Jackson
- **Frontend**: HTML5, Modern CSS, HTML5 Canvas, Vanilla JavaScript (ES6+)
- **Build Tool**: Maven

---

## Getting Started

### Prerequisites
- Java 21 or higher (OpenJDK 25 compatible)
- Maven 3.8+

### Build and Run

```bash
# Clone and build
mvn clean package

# Run application
mvn spring-boot:run
```

The application will start on `http://localhost:8080`.

---

## API Endpoints & Documentation

- **Web Frontend**: `http://localhost:8080/`
- **OpenAPI Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **Actuator Health**: `http://localhost:8080/actuator/health`
- **Prometheus Metrics**: `http://localhost:8080/actuator/prometheus`

### Key REST APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/players` | Create or register player session |
| `GET` | `/api/v1/players/{id}` | Get player information |
| `GET` | `/api/v1/games` | List supported game engines |
| `GET` | `/api/v1/games/rooms` | List all available game rooms |
| `POST` | `/api/v1/games/rooms` | Create a new game room |
| `POST` | `/api/v1/games/rooms/{roomId}/join` | Join a room as player or spectator |
| `DELETE` | `/api/v1/games/rooms/{roomId}/players/{playerId}` | Leave a game room |
| `POST` | `/api/v1/games/rooms/{roomId}/start` | Start game (host only) |

---

## Running Tests

```bash
mvn test
```

Includes test suites:
- `TicTacToeGameEngineTest`: Turn checks, row/column/diagonal wins, draw conditions, boundary and occupancy checks.
- `LudoGameEngineTest`: Yard deployment on six, dice rolls, safe spots, piece capturing, and win detection.
- `SnakeGameEngineTest`: Direction changes, tick movements, wall collisions, self collisions, body collisions, food growth.
- `PlatformIntegrationTest`: End-to-end player registration, room creation, joining, starting, and leaving lifecycle.
