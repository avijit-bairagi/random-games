package com.example.gameplatform.game.carrom;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.game.core.*;
import com.example.gameplatform.player.model.Player;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

/**
 * Server-authoritative Carrom game engine with simplified 2D physics simulation.
 *
 * <h2>Board model</h2>
 * <ul>
 *   <li>Board is a square with half-side {@code HALF_BOARD = 380} (arbitrary units).</li>
 *   <li>Pocket centres are at the four corners.</li>
 *   <li>Coin radius: {@code COIN_R = 15}; Queen radius: {@code COIN_R}; Striker radius: {@code STRIKER_R = 18}.</li>
 *   <li>Coefficient of restitution (e): {@code 0.80} (coin-coin &amp; coin-wall).</li>
 *   <li>Friction: velocity decays by factor {@code FRICTION} each step.</li>
 * </ul>
 *
 * <h2>Turn / Foul rules</h2>
 * <ol>
 *   <li>Striker pocketed → foul; lose turn; return one pocketed own-colour coin to board centre.</li>
 *   <li>No coin pocketed → lose turn (regular miss).</li>
 *   <li>Pocket opponent's coin → opponent's coin is pocketed for them (they benefit).</li>
 *   <li>Queen pocketed → must cover on the <em>same</em> or next successful strike; if not covered, queen is returned.</li>
 *   <li>3 consecutive fouls in a row by same player → penalty: return one own coin to board.</li>
 *   <li>Pocketing the last own-colour coin without queen covered → the last coin is returned.</li>
 * </ol>
 */
@Component
public class CarromGameEngine implements GameEngine<CarromState.Details, CarromAction, CarromConfiguration> {

    // ---- Board constants (all in the same arbitrary unit system) ----

    /** Half-side of the square board. */
    static final double HALF_BOARD  = 380.0;

    /** Radius of any colour coin or the queen. */
    static final double COIN_R      = 15.0;

    /** Radius of the striker. */
    static final double STRIKER_R   = 18.0;

    /** Radius of a pocket opening (centre to edge). */
    static final double POCKET_R    = 25.0;

    /** Total coins per colour. */
    static final int    COINS_PER_COLOR = 9;

    /** Coefficient of restitution for collisions. */
    private static final double COR        = 0.80;

    /** Per-step velocity multiplier (friction / damping). */
    private static final double FRICTION   = 0.985;

    /** Minimum speed below which a body is considered at rest. */
    private static final double REST_SPEED = 0.1;

    /** Maximum speed imparted by a full-power strike. */
    private static final double MAX_STRIKE_SPEED = 1200.0;

    /** Simulation steps per strike. */
    private static final int    SIM_STEPS  = 3000;

    /** Half the legal striker sliding range along the baseline. */
    private static final double STRIKER_SLIDE_HALF = HALF_BOARD * 0.55;

    /** Y-coordinate of each player's baseline (striker placed here). */
    private static final double BASELINE_Y = HALF_BOARD - COIN_R * 3.5;

    /** Pocket corner positions. */
    private static final double[][] POCKETS = {
            {-HALF_BOARD, -HALF_BOARD},
            { HALF_BOARD, -HALF_BOARD},
            {-HALF_BOARD,  HALF_BOARD},
            { HALF_BOARD,  HALF_BOARD}
    };

    // ============================== GameEngine interface ==============================

    @Override public String gameType()    { return "CARROM"; }
    @Override public String displayName() { return "Carrom"; }
    @Override public int minPlayers()     { return 2; }
    @Override public int maxPlayers()     { return 2; }
    @Override public boolean isSpectatorAllowed() { return true; }
    @Override public boolean isLateJoinAllowed()  { return false; }

    @Override
    public CarromConfiguration defaultConfiguration() {
        return new CarromConfiguration(50);
    }

    // ---- Create game ----

    @Override
    public GameState<CarromState.Details> createGame(String gameId, List<Player> players,
                                                     CarromConfiguration config) {
        String p1 = players.get(0).getId();
        String p2 = players.get(1).getId();

        // Randomly assign colours
        boolean p1IsBlack = new Random().nextBoolean();
        String p1Color = p1IsBlack ? "BLACK" : "WHITE";
        String p2Color = p1IsBlack ? "WHITE" : "BLACK";

        List<CarromState.Coin> coins = buildInitialCoins();

        CarromState.Details details = CarromState.Details.builder()
                .coins(coins)
                .currentPlayerId(p1)
                .player1Id(p1)
                .player2Id(p2)
                .player1Color(p1Color)
                .player2Color(p2Color)
                .player1Pocketed(0)
                .player2Pocketed(0)
                .queenPocketed(false)
                .queenCoveredBy(null)
                .turnNumber(1)
                .consecutiveFouls(0)
                .dueToReturnQueen(false)
                .lastStrike(null)
                .build();

        return CarromState.builder()
                .gameId(gameId)
                .status(GameStatus.IN_PROGRESS)
                .players(List.of(p1, p2))
                .winner(null)
                .sequence(0)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();
    }

    // ---- Process action ----

    @Override
    @SuppressWarnings("unchecked")
    public GameResult processAction(GameState<?> state, Player player, CarromAction action) {
        CarromState cs = (CarromState) state;
        CarromState.Details d = cs.getDetails();

        // Guard: game over
        if (cs.getStatus() == GameStatus.FINISHED || cs.getStatus() == GameStatus.DRAW) {
            return GameResult.failure(ErrorCodes.GAME_ALREADY_FINISHED, "Game is already finished.");
        }

        // Guard: not your turn
        if (!player.getId().equals(d.getCurrentPlayerId())) {
            return GameResult.failure(ErrorCodes.NOT_YOUR_TURN, "It is not your turn.");
        }

        // Guard: action type
        if (!CarromAction.STRIKE.equals(action.getActionType())) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Unknown action type.");
        }

        // Guard: power range
        double power = Math.max(0.0, Math.min(1.0, action.getPower()));
        if (power <= 0.0) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Strike power must be > 0.");
        }

        // ---- Set up simulation ----

        boolean isPlayer1 = player.getId().equals(d.getPlayer1Id());
        double baselineY   = isPlayer1 ?  BASELINE_Y : -BASELINE_Y;
        double strikerX    = Math.max(-STRIKER_SLIDE_HALF,
                             Math.min( STRIKER_SLIDE_HALF, action.getStrikerX()));

        // angle: 0° = straight toward opposite baseline, ±45° max
        double angleDeg = Math.max(-45.0, Math.min(45.0, action.getAngle()));
        double anglRad;
        if (isPlayer1) {
            // Player 1 shoots toward negative Y
            anglRad = Math.toRadians(-90.0 + angleDeg);
        } else {
            // Player 2 shoots toward positive Y
            anglRad = Math.toRadians(90.0 + angleDeg);
        }

        double speed = power * MAX_STRIKE_SPEED;
        double svx   = speed * Math.cos(anglRad);
        double svy   = speed * Math.sin(anglRad);

        // Deep-copy coins into mutable bodies
        List<Body> bodies = new ArrayList<>();
        for (CarromState.Coin c : d.getCoins()) {
            bodies.add(new Body(c.getId(), c.getType(), c.getX(), c.getY(), COIN_R, 0, 0));
        }
        // Add striker as a special body
        Body striker = new Body("STRIKER", "STRIKER", strikerX, baselineY, STRIKER_R, svx, svy);
        bodies.add(striker);

        // ---- Run physics ----

        simulate(bodies);

        // ---- Determine what was pocketed ----

        Set<String> pocketedIds   = new LinkedHashSet<>();
        boolean     strikerSunken = false;

        List<CarromState.Coin> remaining = new ArrayList<>();
        for (Body b : bodies) {
            if ("STRIKER".equals(b.id)) {
                if (b.pocketed) strikerSunken = true;
                continue;
            }
            if (b.pocketed) {
                pocketedIds.add(b.id);
            } else {
                remaining.add(new CarromState.Coin(b.id, b.type, b.x, b.y));
            }
        }

        // ---- Interpret results ----

        String myColor   = isPlayer1 ? d.getPlayer1Color() : d.getPlayer2Color();
        String oppColor  = isPlayer1 ? d.getPlayer2Color() : d.getPlayer1Color();

        List<String> myPocketed    = new ArrayList<>();
        List<String> oppPocketed   = new ArrayList<>();
        boolean      queenSunkNow  = false;

        for (String cid : pocketedIds) {
            if ("Q".equals(cid)) {
                queenSunkNow = true;
            } else {
                // Determine colour from id prefix
                String type = cid.startsWith("B") ? "BLACK" : "WHITE";
                if (type.equals(myColor)) {
                    myPocketed.add(cid);
                } else {
                    oppPocketed.add(cid);
                }
            }
        }

        // ---- Build new mutable state values ----

        int newP1Pocketed = d.getPlayer1Pocketed();
        int newP2Pocketed = d.getPlayer2Pocketed();
        boolean newQueenPocketed = d.isQueenPocketed();
        String  newQueenCoveredBy = d.getQueenCoveredBy();
        boolean newDueToReturnQueen = d.isDueToReturnQueen();
        int     newConsecutiveFouls = d.getConsecutiveFouls();
        boolean foul = false;
        boolean bonusTurn = false;       // true = current player shoots again
        StringBuilder msg = new StringBuilder();

        // ---- Handle "due to return queen" from last turn ----

        if (d.isDueToReturnQueen()) {
            // Queen must be returned to centre before this turn's effects apply
            newDueToReturnQueen = false;
            newQueenPocketed    = false;
            newQueenCoveredBy   = null;
            // Return queen to board centre (add it back)
            remaining.add(new CarromState.Coin("Q", "QUEEN", 0.0, 0.0));
            msg.append("Queen returned to board. ");
        }

        // ---- Process striker sunk → foul ----

        if (strikerSunken) {
            foul = true;
            newConsecutiveFouls++;
            msg.append("Foul: striker pocketed. ");

            // Return one of the current player's pocketed coins (if any)
            if ((isPlayer1 && newP1Pocketed > 0) || (!isPlayer1 && newP2Pocketed > 0)) {
                if (isPlayer1) newP1Pocketed--;
                else           newP2Pocketed--;
                remaining.add(new CarromState.Coin(
                        returnCoinId(myColor, isPlayer1 ? newP1Pocketed : newP2Pocketed),
                        myColor, 0.0, 0.0));
                msg.append("One of your coins returned to board. ");
            }

            // If queen was sunk on this same strike and it's not yet covered, return it
            if (queenSunkNow) {
                queenSunkNow = false;
                newQueenPocketed = false;
                newQueenCoveredBy = null;
                remaining.add(new CarromState.Coin("Q", "QUEEN", 0.0, 0.0));
                msg.append("Queen returned (striker foul). ");
            }
        }

        // ---- Process opponent coins sunk (they benefit) ----

        if (!oppPocketed.isEmpty()) {
            if (isPlayer1) newP2Pocketed += oppPocketed.size();
            else           newP1Pocketed += oppPocketed.size();
            msg.append("Opponent's ").append(oppPocketed.size()).append(" coin(s) pocketed (opponent benefits). ");
        }

        // ---- Process own coins sunk ----

        if (!myPocketed.isEmpty() && !strikerSunken) {
            if (isPlayer1) newP1Pocketed += myPocketed.size();
            else           newP2Pocketed += myPocketed.size();
            bonusTurn = true;
            msg.append(myPocketed.size()).append(" own coin(s) pocketed. ");
        }

        // ---- Process queen sunk ----

        if (queenSunkNow && !strikerSunken) {
            if (!newQueenPocketed) {
                newQueenPocketed = true;
                // Check if current player also pocketed an own coin on the same strike
                if (!myPocketed.isEmpty()) {
                    // Covered immediately
                    newQueenCoveredBy = null;
                    msg.append("Queen pocketed and covered immediately! ");
                } else {
                    // Must cover on next successful strike
                    newQueenCoveredBy = player.getId();
                    newDueToReturnQueen = false; // will be set after next miss
                    msg.append("Queen pocketed. Must cover on next successful strike. ");
                }
            }
        } else if (newQueenCoveredBy != null && newQueenCoveredBy.equals(player.getId())) {
            // Player had to cover queen this turn
            if (!myPocketed.isEmpty() && !strikerSunken) {
                // Successfully covered
                newQueenCoveredBy = null;
                msg.append("Queen covered! ");
            } else if (!strikerSunken) {
                // Missed covering — queen will be returned on next turn start
                newDueToReturnQueen = true;
                newQueenCoveredBy   = null;
                msg.append("Queen not covered this turn — will be returned. ");
            }
        }

        // ---- Win condition check ----

        boolean queenFullyCovered = newQueenPocketed && newQueenCoveredBy == null && !newDueToReturnQueen;
        int myTotalPocketed = isPlayer1 ? newP1Pocketed : newP2Pocketed;

        GameStatus newStatus = GameStatus.IN_PROGRESS;
        String     winner    = null;

        // Win: all own coins pocketed AND queen is covered
        if (!strikerSunken && myTotalPocketed >= COINS_PER_COLOR && queenFullyCovered) {
            // Verify queen was pocketed (not just all own coins without queen)
            if (newQueenPocketed) {
                newStatus = GameStatus.FINISHED;
                winner    = player.getId();
                msg.append("🎉 ").append(player.getId()).append(" wins!");
            } else {
                // Pocketed all own coins but queen still on board → last coin returned
                if (isPlayer1) newP1Pocketed--;
                else           newP2Pocketed--;
                remaining.add(new CarromState.Coin(
                        returnCoinId(myColor, isPlayer1 ? newP1Pocketed : newP2Pocketed),
                        myColor, 0.0, 0.0));
                msg.append("All own coins pocketed but queen not covered — last coin returned. ");
                bonusTurn = false;
            }
        }

        // ---- Consecutive foul penalty ----

        if (!foul) {
            newConsecutiveFouls = 0;
        } else if (newConsecutiveFouls >= 3) {
            // 3 consecutive fouls: return one coin to board
            newConsecutiveFouls = 0;
            if ((isPlayer1 && newP1Pocketed > 0) || (!isPlayer1 && newP2Pocketed > 0)) {
                if (isPlayer1) newP1Pocketed--;
                else           newP2Pocketed--;
                remaining.add(new CarromState.Coin(
                        returnCoinId(myColor, isPlayer1 ? newP1Pocketed : newP2Pocketed),
                        myColor, 0.0, 0.0));
                msg.append("3 consecutive fouls — one coin returned as penalty. ");
            }
        }

        // ---- Turn management ----

        String nextPlayerId;
        if (newStatus == GameStatus.FINISHED || newStatus == GameStatus.DRAW) {
            nextPlayerId = player.getId();
        } else if (foul || (!bonusTurn && myPocketed.isEmpty() && !queenSunkNow)) {
            // Miss or foul: switch turns
            nextPlayerId = isPlayer1 ? d.getPlayer2Id() : d.getPlayer1Id();
        } else {
            // Successful strike: same player goes again
            nextPlayerId = player.getId();
        }

        // ---- Max turns draw ----

        int newTurnNumber = d.getTurnNumber() + (nextPlayerId.equals(player.getId()) ? 0 : 1);
        CarromConfiguration cfg = defaultConfiguration();
        if (newStatus == GameStatus.IN_PROGRESS && newTurnNumber > cfg.getMaxTurns() * 2) {
            newStatus = GameStatus.DRAW;
            msg.append("Max turns reached — game drawn.");
        }

        // ---- Build last-strike result (for animation) ----

        List<String> allPocketedIds = new ArrayList<>(pocketedIds);
        CarromState.StrikeResult strikeResult = CarromState.StrikeResult.builder()
                .playerId(player.getId())
                .pocketedCoinIds(allPocketedIds)
                .strikerPocketed(strikerSunken)
                .queenPocketed(queenSunkNow)
                .foul(foul)
                .message(msg.toString().trim())
                .coinsAfter(new ArrayList<>(remaining))
                .build();

        // ---- Build new state ----

        CarromState.Details newDetails = CarromState.Details.builder()
                .coins(remaining)
                .currentPlayerId(newStatus == GameStatus.IN_PROGRESS ? nextPlayerId : player.getId())
                .player1Id(d.getPlayer1Id())
                .player2Id(d.getPlayer2Id())
                .player1Color(d.getPlayer1Color())
                .player2Color(d.getPlayer2Color())
                .player1Pocketed(newP1Pocketed)
                .player2Pocketed(newP2Pocketed)
                .queenPocketed(newQueenPocketed)
                .queenCoveredBy(newQueenCoveredBy)
                .turnNumber(newTurnNumber)
                .consecutiveFouls(newConsecutiveFouls)
                .dueToReturnQueen(newDueToReturnQueen)
                .lastStrike(strikeResult)
                .build();

        CarromState newState = CarromState.builder()
                .gameId(cs.getGameId())
                .status(newStatus)
                .players(cs.getPlayers())
                .winner(winner)
                .sequence(cs.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(newDetails)
                .build();

        return GameResult.success(newState);
    }

    // ---- isValidAction ----

    @Override
    public boolean isValidAction(GameState<?> state, Player player, CarromAction action) {
        CarromState cs = (CarromState) state;
        if (!player.getId().equals(cs.getDetails().getCurrentPlayerId())) return false;
        if (!CarromAction.STRIKE.equals(action.getActionType())) return false;
        return action.getPower() > 0.0 && action.getPower() <= 1.0;
    }

    // ---- Disconnect / reconnect ----

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        CarromState cs = (CarromState) state;
        if (cs.getStatus() != GameStatus.IN_PROGRESS) return GameResult.success(state);

        String winnerId = cs.getPlayers().stream()
                .filter(id -> !id.equals(player.getId()))
                .findFirst().orElse(null);

        CarromState newState = CarromState.builder()
                .gameId(cs.getGameId())
                .status(GameStatus.FINISHED)
                .players(cs.getPlayers())
                .winner(winnerId)
                .sequence(cs.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(cs.getDetails())
                .build();
        return GameResult.success(newState);
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.success(state);
    }

    // ---- Parse helpers ----

    @Override
    public CarromAction parseAction(Map<String, Object> rawAction) {
        String actionType = (String) rawAction.getOrDefault("action", CarromAction.STRIKE);
        double strikerX   = rawAction.get("strikerX") instanceof Number n ? n.doubleValue() : 0.0;
        double angle      = rawAction.get("angle")    instanceof Number n ? n.doubleValue() : 0.0;
        double power      = rawAction.get("power")    instanceof Number n ? n.doubleValue() : 0.5;
        return new CarromAction(actionType, strikerX, angle, power);
    }

    @Override
    public CarromConfiguration parseConfiguration(Map<String, Object> rawConfig) {
        if (rawConfig == null) return defaultConfiguration();
        int maxTurns = rawConfig.get("maxTurns") instanceof Number n ? n.intValue() : 50;
        return new CarromConfiguration(maxTurns);
    }

    // ============================== HELPERS ==============================

    /**
     * Builds the standard Carrom opening layout.
     * <ul>
     *   <li>Queen at centre (0, 0).</li>
     *   <li>First ring: 6 coins alternating BLACK–WHITE.</li>
     *   <li>Second ring: 12 coins alternating BLACK–WHITE.</li>
     * </ul>
     */
    private List<CarromState.Coin> buildInitialCoins() {
        List<CarromState.Coin> coins = new ArrayList<>();
        double r1 = COIN_R * 2.5;   // inner ring radius
        double r2 = COIN_R * 5.0;   // outer ring radius

        // Queen at centre
        coins.add(new CarromState.Coin("Q", "QUEEN", 0.0, 0.0));

        int bIdx = 1, wIdx = 1;

        // Inner ring: 6 coins (alternating B, W starting from top)
        for (int i = 0; i < 6; i++) {
            double a = Math.toRadians(i * 60.0);
            double x = r1 * Math.cos(a);
            double y = r1 * Math.sin(a);
            if (i % 2 == 0) {
                coins.add(new CarromState.Coin("B" + bIdx++, "BLACK", x, y));
            } else {
                coins.add(new CarromState.Coin("W" + wIdx++, "WHITE", x, y));
            }
        }

        // Outer ring: 12 coins (alternating, starting offset by 15°)
        for (int i = 0; i < 12; i++) {
            double a = Math.toRadians(i * 30.0 + 15.0);
            double x = r2 * Math.cos(a);
            double y = r2 * Math.sin(a);
            if (i % 2 == 0) {
                coins.add(new CarromState.Coin("B" + bIdx++, "BLACK", x, y));
            } else {
                coins.add(new CarromState.Coin("W" + wIdx++, "WHITE", x, y));
            }
        }

        return coins;
    }

    /**
     * Returns a synthetic coin ID when putting a coin back on the board.
     * Keeps IDs consistent for the client to track.
     */
    private String returnCoinId(String color, int pocketedAfterReturn) {
        char prefix = "BLACK".equals(color) ? 'B' : 'W';
        return "" + prefix + (pocketedAfterReturn + 1);
    }

    // ============================== PHYSICS ==============================

    /**
     * Mutable body used during physics simulation.
     */
    private static class Body {
        String id;
        String type;
        double x, y;
        double vx, vy;
        double radius;
        boolean pocketed;

        Body(String id, String type, double x, double y, double radius, double vx, double vy) {
            this.id     = id;
            this.type   = type;
            this.x      = x;
            this.y      = y;
            this.radius = radius;
            this.vx     = vx;
            this.vy     = vy;
            this.pocketed = false;
        }

        double speed() { return Math.sqrt(vx * vx + vy * vy); }
    }

    /**
     * Runs a simplified Euler-step physics simulation until all bodies come to rest
     * or the step limit is reached.
     *
     * <p>Handles:
     * <ul>
     *   <li>Coin–coin elastic collisions (mass equal).</li>
     *   <li>Wall reflection (HALF_BOARD boundaries, reduced velocity by COR).</li>
     *   <li>Pocket detection at corners.</li>
     *   <li>Friction damping per step.</li>
     * </ul>
     */
    private void simulate(List<Body> bodies) {
        for (int step = 0; step < SIM_STEPS; step++) {
            boolean anyMoving = false;

            // Update positions
            for (Body b : bodies) {
                if (b.pocketed) continue;
                if (b.speed() < REST_SPEED) { b.vx = 0; b.vy = 0; continue; }
                anyMoving = true;
                b.x += b.vx * 0.016; // ~60fps timestep
                b.y += b.vy * 0.016;
                b.vx *= FRICTION;
                b.vy *= FRICTION;
            }

            if (!anyMoving) break;

            // Wall collisions
            for (Body b : bodies) {
                if (b.pocketed) continue;
                // Right / left walls
                if (b.x + b.radius > HALF_BOARD) {
                    b.x  = HALF_BOARD - b.radius;
                    b.vx = -Math.abs(b.vx) * COR;
                } else if (b.x - b.radius < -HALF_BOARD) {
                    b.x  = -HALF_BOARD + b.radius;
                    b.vx =  Math.abs(b.vx) * COR;
                }
                // Top / bottom walls
                if (b.y + b.radius > HALF_BOARD) {
                    b.y  = HALF_BOARD - b.radius;
                    b.vy = -Math.abs(b.vy) * COR;
                } else if (b.y - b.radius < -HALF_BOARD) {
                    b.y  = -HALF_BOARD + b.radius;
                    b.vy =  Math.abs(b.vy) * COR;
                }
            }

            // Body–body collisions (O(n²), small n so acceptable)
            for (int i = 0; i < bodies.size(); i++) {
                Body a = bodies.get(i);
                if (a.pocketed) continue;
                for (int j = i + 1; j < bodies.size(); j++) {
                    Body b = bodies.get(j);
                    if (b.pocketed) continue;
                    resolveCollision(a, b);
                }
            }

            // Pocket detection
            for (Body b : bodies) {
                if (b.pocketed) continue;
                for (double[] pocket : POCKETS) {
                    double dx = b.x - pocket[0];
                    double dy = b.y - pocket[1];
                    if (Math.sqrt(dx * dx + dy * dy) < POCKET_R + b.radius * 0.5) {
                        b.pocketed = true;
                        b.vx = 0; b.vy = 0;
                        break;
                    }
                }
            }
        }
    }

    /**
     * Resolves an elastic collision between two equal-mass circular bodies.
     * Uses the standard 1D elastic collision formula along the line of centres.
     */
    private void resolveCollision(Body a, Body b) {
        double dx = b.x - a.x;
        double dy = b.y - a.y;
        double dist = Math.sqrt(dx * dx + dy * dy);
        double minDist = a.radius + b.radius;
        if (dist >= minDist || dist == 0) return;

        // Normalise
        double nx = dx / dist;
        double ny = dy / dist;

        // Separate (push apart)
        double overlap = (minDist - dist) / 2.0;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        // Relative velocity along collision normal
        double dvx = b.vx - a.vx;
        double dvy = b.vy - a.vy;
        double dvn = dvx * nx + dvy * ny;
        if (dvn > 0) return; // moving apart

        // Equal mass: exchange normal components
        double impulse = -(1 + COR) * dvn / 2.0;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
    }
}
