package com.example.gameplatform.game.carrom;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.game.core.GameEngine;
import com.example.gameplatform.game.core.GameEvent;
import com.example.gameplatform.game.core.GameResult;
import com.example.gameplatform.game.core.GameState;
import com.example.gameplatform.game.core.GameStatus;
import com.example.gameplatform.player.model.Player;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class CarromGameEngine implements GameEngine<CarromState.Details, CarromAction, CarromConfiguration> {

    private static final Logger log = LoggerFactory.getLogger(CarromGameEngine.class);

    public static final String GAME_TYPE = "CARROM";

    // Board is modeled as a unit square [0,1]x[0,1]
    // Piece radius (normalized)
    private static final double PIECE_RADIUS = 0.033;
    private static final double STRIKER_RADIUS = 0.040;
    private static final double POCKET_RADIUS = 0.055;
    // Pocket positions (corners)
    private static final double[][] POCKETS = {
        {0.07, 0.07}, {0.93, 0.07}, {0.07, 0.93}, {0.93, 0.93}
    };
    // Friction coefficient per step
    private static final double FRICTION = 0.985;
    private static final double MIN_SPEED = 0.0005;
    private static final int MAX_STEPS = 3000;

    @Override
    public String gameType() { return GAME_TYPE; }

    @Override
    public String displayName() { return "Carrom"; }

    @Override
    public int minPlayers() { return 2; }

    @Override
    public int maxPlayers() { return 4; }

    @Override
    public boolean isSpectatorAllowed() { return true; }

    @Override
    public boolean isLateJoinAllowed() { return false; }

    @Override
    public CarromConfiguration defaultConfiguration() {
        return new CarromConfiguration(2, 29);
    }

    @Override
    public GameState<CarromState.Details> createGame(String gameId, List<Player> players, CarromConfiguration configuration) {
        if (players.size() < 2) {
            throw new IllegalArgumentException("Carrom requires at least 2 players");
        }

        int targetScore = configuration != null ? configuration.getTargetScore() : 29;

        List<CarromState.Piece> pieces = createInitialPieces();

        Map<String, Integer> scores = new HashMap<>();
        Map<String, String> playerColors = new HashMap<>();
        Map<String, String> teams = new HashMap<>();

        if (players.size() == 4) {
            // 4-player: team mode, opposite players are teammates
            // Team A: players 0 and 2 -> BLACK
            // Team B: players 1 and 3 -> WHITE
            playerColors.put(players.get(0).getId(), "BLACK");
            playerColors.put(players.get(1).getId(), "WHITE");
            playerColors.put(players.get(2).getId(), "BLACK");
            playerColors.put(players.get(3).getId(), "WHITE");
            teams.put(players.get(0).getId(), "A");
            teams.put(players.get(1).getId(), "B");
            teams.put(players.get(2).getId(), "A");
            teams.put(players.get(3).getId(), "B");
        } else {
            // 2-player
            playerColors.put(players.get(0).getId(), "BLACK");
            playerColors.put(players.get(1).getId(), "WHITE");
        }

        for (Player p : players) {
            scores.put(p.getId(), 0);
        }

        CarromState.Details details = CarromState.Details.builder()
                .pieces(pieces)
                .currentPlayerId(players.get(0).getId())
                .scores(scores)
                .playerColors(playerColors)
                .teams(teams)
                .queenPocketed(false)
                .queenCovered(false)
                .lastStrike(null)
                .targetScore(targetScore)
                .extraTurn(false)
                .build();

        return CarromState.builder()
                .gameId(gameId)
                .status(GameStatus.IN_PROGRESS)
                .players(players.stream().map(Player::getId).collect(Collectors.toList()))
                .winner(null)
                .sequence(1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();
    }

    /**
     * Creates the standard carrom board setup:
     * - 9 black pieces, 9 white pieces arranged in concentric circles
     * - 1 red queen in the center
     */
    private List<CarromState.Piece> createInitialPieces() {
        List<CarromState.Piece> pieces = new ArrayList<>();
        double cx = 0.5, cy = 0.5;

        // Queen in center
        pieces.add(new CarromState.Piece("RED", cx, cy, false));

        // Inner ring: 6 pieces alternating black/white
        double innerR = 0.075;
        for (int i = 0; i < 6; i++) {
            double angle = Math.toRadians(i * 60.0);
            double x = cx + innerR * Math.cos(angle);
            double y = cy + innerR * Math.sin(angle);
            pieces.add(new CarromState.Piece(i % 2 == 0 ? "BLACK" : "WHITE", x, y, false));
        }

        // Outer ring: 12 pieces alternating black/white
        double outerR = 0.145;
        for (int i = 0; i < 12; i++) {
            double angle = Math.toRadians(i * 30.0 + 15.0);
            double x = cx + outerR * Math.cos(angle);
            double y = cy + outerR * Math.sin(angle);
            pieces.add(new CarromState.Piece(i % 2 == 0 ? "WHITE" : "BLACK", x, y, false));
        }

        return pieces;
    }

    @Override
    public GameResult processAction(GameState<?> state, Player player, CarromAction action) {
        if (!(state instanceof CarromState carromState)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Invalid game state for Carrom");
        }

        if (carromState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.failure(ErrorCodes.GAME_ALREADY_FINISHED, "Game is not in progress");
        }

        CarromState.Details details = carromState.getDetails();
        if (!details.getCurrentPlayerId().equals(player.getId())) {
            return GameResult.failure(ErrorCodes.NOT_YOUR_TURN, "It is not your turn");
        }

        if (!CarromAction.STRIKE.equals(action.getActionType())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Unknown action type: " + action.getActionType());
        }

        // Validate striker position
        double strikerX = Math.max(0.2, Math.min(0.8, action.getStrikerX()));
        double power = Math.max(0.05, Math.min(1.0, action.getPower()));
        double angleRad = Math.toRadians(action.getAngle());

        // Determine striker baseline Y based on player turn
        // In 2-player: player 0 (BLACK) shoots from bottom (y=0.88), player 1 (WHITE) from top (y=0.12)
        // In 4-player: players shoot from their respective sides
        double strikerY = getStrikerBaselineY(player.getId(), carromState.getPlayers(), details.getPlayerColors());

        // Run physics simulation
        PhysicsResult physicsResult = simulateStrike(
                details.getPieces(), strikerX, strikerY, angleRad, power,
                details.isQueenPocketed(), details.isQueenCovered());

        // Determine scoring
        String playerColor = details.getPlayerColors().getOrDefault(player.getId(), "BLACK");
        int pointsScored = 0;
        boolean extraTurn = false;
        boolean queenPocketed = details.isQueenPocketed();
        boolean queenCovered = details.isQueenCovered();
        boolean pocketedStriker = physicsResult.strikerPocketed;

        List<String> pocketedTypes = new ArrayList<>();
        for (CarromState.Piece p : physicsResult.newlyPocketed) {
            pocketedTypes.add(p.getType());
        }

        boolean pocketedQueen = pocketedTypes.contains("RED");
        boolean pocketedOwnColor = pocketedTypes.contains(playerColor);

        // Scoring rules:
        // - Pocketing own color piece: 1 point each, extra turn
        // - Pocketing queen (RED): must cover with own piece in same/next turn; 3 bonus points when covered
        // - Pocketing opponent's piece: -1 point (due)
        // - Pocketing striker: lose 1 point, opponent gets extra turn

        if (pocketedStriker) {
            // Penalty: lose 1 point, no extra turn, turn passes
            pointsScored = -1;
            extraTurn = false;
        } else {
            for (String type : pocketedTypes) {
                if (type.equals(playerColor)) {
                    pointsScored += 1;
                    extraTurn = true;
                } else if (type.equals("RED")) {
                    // Queen pocketed - needs to be covered
                    queenPocketed = true;
                    queenCovered = false;
                } else {
                    // Opponent's piece pocketed - penalty
                    pointsScored -= 1;
                }
            }

            // Check if queen gets covered this turn (own piece pocketed after queen)
            if (queenPocketed && !queenCovered && pocketedOwnColor) {
                queenCovered = true;
                pointsScored += 3; // Queen bonus
            }
        }

        // Apply score
        Map<String, Integer> newScores = new HashMap<>(details.getScores());
        int currentScore = newScores.getOrDefault(player.getId(), 0);
        newScores.put(player.getId(), Math.max(0, currentScore + pointsScored));

        // Determine next player
        List<String> playerIds = carromState.getPlayers();
        String nextPlayerId;
        if (extraTurn && !pocketedStriker) {
            nextPlayerId = player.getId();
        } else {
            int idx = playerIds.indexOf(player.getId());
            nextPlayerId = playerIds.get((idx + 1) % playerIds.size());
        }

        // Check win condition
        GameStatus newStatus = GameStatus.IN_PROGRESS;
        String winner = null;
        int targetScore = details.getTargetScore();

        // Count remaining pieces on board
        long remainingBlack = physicsResult.allPieces.stream()
                .filter(p -> "BLACK".equals(p.getType()) && !p.isPocketed()).count();
        long remainingWhite = physicsResult.allPieces.stream()
                .filter(p -> "WHITE".equals(p.getType()) && !p.isPocketed()).count();

        // Win by score or clearing all own pieces
        for (Map.Entry<String, Integer> entry : newScores.entrySet()) {
            if (entry.getValue() >= targetScore) {
                newStatus = GameStatus.FINISHED;
                winner = entry.getKey();
                break;
            }
        }

        // Win by clearing all pieces of own color
        if (newStatus == GameStatus.IN_PROGRESS) {
            String winnerByClearing = checkWinByClearing(playerIds, details.getPlayerColors(), remainingBlack, remainingWhite, queenCovered);
            if (winnerByClearing != null) {
                newStatus = GameStatus.FINISHED;
                winner = winnerByClearing;
            }
        }

        // Build last strike info
        CarromState.LastStrike lastStrike = new CarromState.LastStrike(
                player.getId(), strikerX, action.getAngle(), power,
                pocketedTypes, pocketedQueen, pocketedStriker, pointsScored);

        CarromState.Details newDetails = CarromState.Details.builder()
                .pieces(physicsResult.allPieces)
                .currentPlayerId(newStatus == GameStatus.IN_PROGRESS ? nextPlayerId : null)
                .scores(newScores)
                .playerColors(details.getPlayerColors())
                .teams(details.getTeams())
                .queenPocketed(queenPocketed)
                .queenCovered(queenCovered)
                .lastStrike(lastStrike)
                .targetScore(targetScore)
                .extraTurn(extraTurn && !pocketedStriker)
                .build();

        CarromState newState = CarromState.builder()
                .gameId(carromState.getGameId())
                .status(newStatus)
                .players(carromState.getPlayers())
                .winner(winner)
                .sequence(carromState.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(newDetails)
                .build();

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("CARROM_STRIKE", carromState.getGameId(), player.getId(), Map.of(
                "strikerX", strikerX,
                "angle", action.getAngle(),
                "power", power,
                "pocketedTypes", pocketedTypes,
                "pocketedStriker", pocketedStriker,
                "pointsScored", pointsScored,
                "extraTurn", extraTurn && !pocketedStriker
        )));

        if (newStatus == GameStatus.FINISHED) {
            events.add(GameEvent.of("GAME_WON", carromState.getGameId(), winner, Map.of(
                    "winner", winner != null ? winner : "NONE"
            )));
        }

        return GameResult.success(newState, events);
    }

    private double getStrikerBaselineY(String playerId, List<String> playerIds, Map<String, String> playerColors) {
        int idx = playerIds.indexOf(playerId);
        if (playerIds.size() == 4) {
            // 4 sides: bottom, right, top, left
            return switch (idx) {
                case 0 -> 0.88; // bottom
                case 1 -> 0.5;  // right side (striker on right baseline)
                case 2 -> 0.12; // top
                case 3 -> 0.5;  // left side
                default -> 0.88;
            };
        }
        // 2-player
        String color = playerColors.getOrDefault(playerId, "BLACK");
        return "BLACK".equals(color) ? 0.88 : 0.12;
    }

    private String checkWinByClearing(List<String> playerIds, Map<String, String> playerColors,
                                       long remainingBlack, long remainingWhite, boolean queenCovered) {
        if (!queenCovered) return null;
        for (String pid : playerIds) {
            String color = playerColors.getOrDefault(pid, "BLACK");
            if ("BLACK".equals(color) && remainingBlack == 0) return pid;
            if ("WHITE".equals(color) && remainingWhite == 0) return pid;
        }
        return null;
    }

    // ======================== PHYSICS SIMULATION ======================== //

    private static class Vec2 {
        double x, y;
        Vec2(double x, double y) { this.x = x; this.y = y; }
        Vec2 add(Vec2 o) { return new Vec2(x + o.x, y + o.y); }
        Vec2 sub(Vec2 o) { return new Vec2(x - o.x, y - o.y); }
        Vec2 scale(double s) { return new Vec2(x * s, y * s); }
        double dot(Vec2 o) { return x * o.x + y * o.y; }
        double len() { return Math.sqrt(x * x + y * y); }
        Vec2 norm() { double l = len(); return l > 0 ? scale(1.0 / l) : new Vec2(0, 0); }
    }

    private static class SimPiece {
        String type;
        Vec2 pos;
        Vec2 vel;
        boolean pocketed;
        boolean isStriker;

        SimPiece(String type, Vec2 pos, Vec2 vel, boolean pocketed, boolean isStriker) {
            this.type = type;
            this.pos = pos;
            this.vel = vel;
            this.pocketed = pocketed;
            this.isStriker = isStriker;
        }
    }

    private static class PhysicsResult {
        List<CarromState.Piece> allPieces;
        List<CarromState.Piece> newlyPocketed;
        boolean strikerPocketed;
    }

    private PhysicsResult simulateStrike(List<CarromState.Piece> currentPieces,
                                          double strikerX, double strikerY,
                                          double angleRad, double power,
                                          boolean queenAlreadyPocketed, boolean queenCovered) {
        double maxSpeed = 0.025 * power;
        Vec2 strikerVel = new Vec2(Math.cos(angleRad) * maxSpeed, -Math.sin(angleRad) * maxSpeed);

        List<SimPiece> simPieces = new ArrayList<>();

        // Add striker
        simPieces.add(new SimPiece("STRIKER", new Vec2(strikerX, strikerY), strikerVel, false, true));

        // Add board pieces (only non-pocketed)
        for (CarromState.Piece p : currentPieces) {
            if (!p.isPocketed()) {
                simPieces.add(new SimPiece(p.getType(), new Vec2(p.getX(), p.getY()), new Vec2(0, 0), false, false));
            }
        }

        // Run simulation
        for (int step = 0; step < MAX_STEPS; step++) {
            boolean anyMoving = false;

            // Update positions
            for (SimPiece sp : simPieces) {
                if (sp.pocketed) continue;
                double speed = sp.vel.len();
                if (speed > MIN_SPEED) {
                    anyMoving = true;
                    sp.pos = sp.pos.add(sp.vel);
                    sp.vel = sp.vel.scale(FRICTION);

                    // Wall bouncing
                    double r = sp.isStriker ? STRIKER_RADIUS : PIECE_RADIUS;
                    if (sp.pos.x - r < 0.04) { sp.pos.x = 0.04 + r; sp.vel.x = Math.abs(sp.vel.x); }
                    if (sp.pos.x + r > 0.96) { sp.pos.x = 0.96 - r; sp.vel.x = -Math.abs(sp.vel.x); }
                    if (sp.pos.y - r < 0.04) { sp.pos.y = 0.04 + r; sp.vel.y = Math.abs(sp.vel.y); }
                    if (sp.pos.y + r > 0.96) { sp.pos.y = 0.96 - r; sp.vel.y = -Math.abs(sp.vel.y); }
                } else {
                    sp.vel = new Vec2(0, 0);
                }
            }

            // Piece-piece collisions
            for (int i = 0; i < simPieces.size(); i++) {
                SimPiece a = simPieces.get(i);
                if (a.pocketed) continue;
                for (int j = i + 1; j < simPieces.size(); j++) {
                    SimPiece b = simPieces.get(j);
                    if (b.pocketed) continue;
                    double ra = a.isStriker ? STRIKER_RADIUS : PIECE_RADIUS;
                    double rb = b.isStriker ? STRIKER_RADIUS : PIECE_RADIUS;
                    resolveCollision(a, b, ra, rb);
                }
            }

            // Check pocket
            for (SimPiece sp : simPieces) {
                if (sp.pocketed) continue;
                for (double[] pocket : POCKETS) {
                    double dx = sp.pos.x - pocket[0];
                    double dy = sp.pos.y - pocket[1];
                    if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS) {
                        sp.pocketed = true;
                        sp.vel = new Vec2(0, 0);
                        break;
                    }
                }
            }

            if (!anyMoving) break;
        }

        // Build result
        PhysicsResult result = new PhysicsResult();
        result.allPieces = new ArrayList<>();
        result.newlyPocketed = new ArrayList<>();
        result.strikerPocketed = false;

        // Map sim pieces back to CarromState.Piece
        int boardPieceIdx = 0;
        for (CarromState.Piece original : currentPieces) {
            if (original.isPocketed()) {
                result.allPieces.add(new CarromState.Piece(original.getType(), original.getX(), original.getY(), true));
                continue;
            }
            // Find corresponding sim piece (skip striker at index 0)
            SimPiece sp = simPieces.get(boardPieceIdx + 1);
            boardPieceIdx++;
            CarromState.Piece updated = new CarromState.Piece(sp.type, sp.pos.x, sp.pos.y, sp.pocketed);
            result.allPieces.add(updated);
            if (sp.pocketed) {
                result.newlyPocketed.add(updated);
            }
        }

        // Check striker
        SimPiece striker = simPieces.get(0);
        result.strikerPocketed = striker.pocketed;

        return result;
    }

    private void resolveCollision(SimPiece a, SimPiece b, double ra, double rb) {
        Vec2 delta = b.pos.sub(a.pos);
        double dist = delta.len();
        double minDist = ra + rb;
        if (dist < minDist && dist > 0.0001) {
            // Separate pieces
            Vec2 normal = delta.norm();
            double overlap = minDist - dist;
            a.pos = a.pos.sub(normal.scale(overlap * 0.5));
            b.pos = b.pos.add(normal.scale(overlap * 0.5));

            // Elastic collision
            Vec2 relVel = a.vel.sub(b.vel);
            double velAlongNormal = relVel.dot(normal);
            if (velAlongNormal > 0) return; // Moving apart

            // Equal mass elastic collision
            double impulse = velAlongNormal;
            a.vel = a.vel.sub(normal.scale(impulse));
            b.vel = b.vel.add(normal.scale(impulse));
        }
    }

    @Override
    public boolean isValidAction(GameState<?> state, Player player, CarromAction action) {
        if (!(state instanceof CarromState carromState) || carromState.getStatus() != GameStatus.IN_PROGRESS) {
            return false;
        }
        CarromState.Details details = carromState.getDetails();
        return details.getCurrentPlayerId().equals(player.getId())
                && CarromAction.STRIKE.equals(action.getActionType())
                && action.getPower() > 0;
    }

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        if (!(state instanceof CarromState carromState) || carromState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.success(state);
        }

        String remainingPlayer = carromState.getPlayers().stream()
                .filter(id -> !id.equals(player.getId()))
                .findFirst()
                .orElse(null);

        List<GameEvent> events = List.of(GameEvent.of("PLAYER_FORFEIT", carromState.getGameId(), player.getId(), Map.of(
                "winner", remainingPlayer != null ? remainingPlayer : "NONE",
                "reason", "Player disconnected"
        )));

        CarromState newState = CarromState.builder()
                .gameId(carromState.getGameId())
                .status(remainingPlayer != null ? GameStatus.FINISHED : GameStatus.CANCELLED)
                .players(carromState.getPlayers())
                .winner(remainingPlayer)
                .sequence(carromState.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(carromState.getDetails())
                .build();

        return GameResult.success(newState, events);
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.success(state);
    }

    @Override
    public CarromAction parseAction(Map<String, Object> rawAction) {
        String actionType = (String) rawAction.getOrDefault("actionType", CarromAction.STRIKE);
        double strikerX = rawAction.get("strikerX") instanceof Number n ? n.doubleValue() : 0.5;
        double angle = rawAction.get("angle") instanceof Number n ? n.doubleValue() : 90.0;
        double power = rawAction.get("power") instanceof Number n ? n.doubleValue() : 0.5;
        return new CarromAction(actionType, strikerX, angle, power);
    }

    @Override
    public CarromConfiguration parseConfiguration(Map<String, Object> rawConfig) {
        if (rawConfig == null) return defaultConfiguration();
        int playerCount = rawConfig.get("playerCount") instanceof Number n ? n.intValue() : 2;
        int targetScore = rawConfig.get("targetScore") instanceof Number n ? n.intValue() : 29;
        return new CarromConfiguration(playerCount, targetScore);
    }
}
