package com.example.gameplatform.game.snake;

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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Component
public class SnakeGameEngine implements GameEngine<SnakeState.Details, SnakeAction, SnakeConfiguration> {

    private static final Logger log = LoggerFactory.getLogger(SnakeGameEngine.class);

    public static final String GAME_TYPE = "SNAKE";

    public static final String[] PLAYER_COLORS = {
            "#ef4444", // Red
            "#3b82f6", // Blue
            "#22c55e", // Green
            "#eab308"  // Yellow
    };

    // Standard classic Ladders (Bottom -> Top)
    public static final Map<Integer, Integer> DEFAULT_LADDERS = Map.of(
            4, 14,
            9, 31,
            20, 38,
            28, 84,
            40, 59,
            51, 67,
            63, 81,
            71, 91
    );

    // Standard classic Snakes (Head -> Tail)
    public static final Map<Integer, Integer> DEFAULT_SNAKES = Map.of(
            17, 7,
            54, 34,
            62, 19,
            64, 60,
            87, 24,
            93, 73,
            95, 75,
            99, 78
    );

    private final Random random;

    public SnakeGameEngine() {
        this(new Random());
    }

    public SnakeGameEngine(Random random) {
        this.random = random;
    }

    @Override
    public String gameType() {
        return GAME_TYPE;
    }

    @Override
    public String displayName() {
        return "Snake and Ladder";
    }

    @Override
    public int minPlayers() {
        return 2;
    }

    @Override
    public int maxPlayers() {
        return 4;
    }

    @Override
    public boolean isSpectatorAllowed() {
        return true;
    }

    @Override
    public boolean isLateJoinAllowed() {
        return false;
    }

    @Override
    public SnakeConfiguration defaultConfiguration() {
        return new SnakeConfiguration(100);
    }

    @Override
    public GameState<SnakeState.Details> createGame(String gameId, List<Player> players, SnakeConfiguration configuration) {
        if (players.size() < 2 || players.size() > 4) {
            throw new IllegalArgumentException("Snake and Ladder requires 2, 3, or 4 players");
        }

        Map<String, SnakeState.SnakePlayerData> playerStates = new HashMap<>();
        List<String> turnOrder = new ArrayList<>();

        for (int i = 0; i < players.size(); i++) {
            Player p = players.get(i);
            String color = PLAYER_COLORS[i % PLAYER_COLORS.length];

            playerStates.put(p.getId(), SnakeState.SnakePlayerData.builder()
                    .playerId(p.getId())
                    .username(p.getUsername())
                    .color(color)
                    .position(0)
                    .rank(0)
                    .lastRoll(null)
                    .active(true)
                    .build());
            turnOrder.add(p.getId());
        }

        int firstIndex = random.nextInt(turnOrder.size());
        String firstPlayerId = turnOrder.get(firstIndex);
        Player firstPlayer = players.stream()
                .filter(p -> p.getId().equals(firstPlayerId))
                .findFirst()
                .orElse(players.get(firstIndex));

        SnakeState.Details details = SnakeState.Details.builder()
                .boardSize(100)
                .currentPlayerId(firstPlayerId)
                .currentColor(PLAYER_COLORS[firstIndex % PLAYER_COLORS.length])
                .lastDiceRoll(null)
                .turnOrder(turnOrder)
                .players(playerStates)
                .snakes(new HashMap<>(DEFAULT_SNAKES))
                .ladders(new HashMap<>(DEFAULT_LADDERS))
                .consecutiveSixes(0)
                .lastActionMessage("Game started. " + firstPlayer.getUsername() + "'s turn to roll!")
                .build();

        return SnakeState.builder()
                .gameId(gameId)
                .status(GameStatus.IN_PROGRESS)
                .players(turnOrder)
                .sequence(1)
                .updatedAt(System.currentTimeMillis())
                .details(details)
                .build();
    }

    @Override
    public GameResult processAction(GameState<?> state, Player player, SnakeAction action) {
        if (!(state instanceof SnakeState snakeState)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Invalid state class for Snake and Ladder");
        }

        if (snakeState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.failure(ErrorCodes.GAME_ALREADY_FINISHED, "Game is already finished");
        }

        SnakeState.Details details = snakeState.getDetails();

        if (player == null || !player.getId().equals(details.getCurrentPlayerId())) {
            return GameResult.failure(ErrorCodes.NOT_YOUR_TURN, "It is not your turn to roll the dice");
        }

        String actionType = action != null ? action.getActionType() : SnakeAction.ROLL_DICE;
        if (!SnakeAction.ROLL_DICE.equalsIgnoreCase(actionType)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Unknown action type: " + actionType);
        }

        // Authoritative roll
        int diceRoll;
        if (action.getDiceValue() != null && action.getDiceValue() >= 1 && action.getDiceValue() <= 6) {
            diceRoll = action.getDiceValue();
        } else {
            diceRoll = random.nextInt(6) + 1;
        }

        // Deep copy player states
        Map<String, SnakeState.SnakePlayerData> updatedPlayers = new HashMap<>();
        for (Map.Entry<String, SnakeState.SnakePlayerData> entry : details.getPlayers().entrySet()) {
            SnakeState.SnakePlayerData original = entry.getValue();
            updatedPlayers.put(entry.getKey(), SnakeState.SnakePlayerData.builder()
                    .playerId(original.getPlayerId())
                    .username(original.getUsername())
                    .color(original.getColor())
                    .position(original.getPosition())
                    .rank(original.getRank())
                    .lastRoll(original.getLastRoll())
                    .active(original.isActive())
                    .build());
        }

        SnakeState.SnakePlayerData currentPlayerState = updatedPlayers.get(player.getId());
        currentPlayerState.setLastRoll(diceRoll);

        int oldPos = currentPlayerState.getPosition();
        int targetPos = oldPos + diceRoll;
        List<GameEvent> events = new ArrayList<>();
        GameStatus newStatus = GameStatus.IN_PROGRESS;
        String winner = null;
        String actionMessage;

        events.add(GameEvent.builder()
                .eventType("DICE_ROLLED")
                .gameId(snakeState.getGameId())
                .playerId(player.getId())
                .payload(Map.of("dice", diceRoll, "player", player.getUsername(), "fromPosition", oldPos))
                .timestamp(System.currentTimeMillis())
                .build());

        boolean reachedGoal = false;

        if (targetPos > 100) {
            // Cannot move beyond 100
            actionMessage = player.getUsername() + " rolled a " + diceRoll + " but needs " + (100 - oldPos) + " to reach 100.";
            events.add(GameEvent.builder()
                    .eventType("MOVE_SKIPPED")
                    .gameId(snakeState.getGameId())
                    .playerId(player.getId())
                    .payload(Map.of("message", actionMessage))
                    .timestamp(System.currentTimeMillis())
                    .build());
        } else if (targetPos == 100) {
            // Reached goal!
            currentPlayerState.setPosition(100);
            currentPlayerState.setRank(1);
            reachedGoal = true;
            newStatus = GameStatus.FINISHED;
            winner = player.getId();
            actionMessage = "🎉 " + player.getUsername() + " rolled a " + diceRoll + ", reached 100 and won the match!";
            events.add(GameEvent.builder()
                    .eventType("PLAYER_WON")
                    .gameId(snakeState.getGameId())
                    .playerId(player.getId())
                    .payload(Map.of("winner", player.getUsername(), "position", 100))
                    .timestamp(System.currentTimeMillis())
                    .build());
        } else {
            // Check ladder or snake
            if (details.getLadders().containsKey(targetPos)) {
                int ladderEnd = details.getLadders().get(targetPos);
                currentPlayerState.setPosition(ladderEnd);
                actionMessage = "🪜 " + player.getUsername() + " rolled a " + diceRoll + " to square " + targetPos + " and climbed a ladder to square " + ladderEnd + "!";
                events.add(GameEvent.builder()
                        .eventType("LADDER_CLIMBED")
                        .gameId(snakeState.getGameId())
                        .playerId(player.getId())
                        .payload(Map.of("player", player.getUsername(), "from", targetPos, "to", ladderEnd))
                        .timestamp(System.currentTimeMillis())
                        .build());
            } else if (details.getSnakes().containsKey(targetPos)) {
                int snakeEnd = details.getSnakes().get(targetPos);
                currentPlayerState.setPosition(snakeEnd);
                actionMessage = "🐍 " + player.getUsername() + " rolled a " + diceRoll + " to square " + targetPos + " and was bitten by a snake, sliding down to square " + snakeEnd + "!";
                events.add(GameEvent.builder()
                        .eventType("SNAKE_BITTEN")
                        .gameId(snakeState.getGameId())
                        .playerId(player.getId())
                        .payload(Map.of("player", player.getUsername(), "from", targetPos, "to", snakeEnd))
                        .timestamp(System.currentTimeMillis())
                        .build());
            } else {
                currentPlayerState.setPosition(targetPos);
                actionMessage = player.getUsername() + " rolled a " + diceRoll + " and moved to square " + targetPos + ".";
                events.add(GameEvent.builder()
                        .eventType("PLAYER_MOVED")
                        .gameId(snakeState.getGameId())
                        .playerId(player.getId())
                        .payload(Map.of("player", player.getUsername(), "from", oldPos, "to", targetPos))
                        .timestamp(System.currentTimeMillis())
                        .build());
            }
        }

        // Determine turn rotation & bonus turn on six
        String nextPlayerId = details.getCurrentPlayerId();
        int consecutiveSixes = details.getConsecutiveSixes();

        if (reachedGoal) {
            // Game over
            nextPlayerId = null;
        } else if (diceRoll == 6) {
            if (consecutiveSixes + 1 >= 3) {
                // 3 sixes in a row -> turn passes
                consecutiveSixes = 0;
                nextPlayerId = getNextActivePlayerId(details.getTurnOrder(), player.getId(), updatedPlayers);
                actionMessage += " Three 6s in a row! Turn passes to next player.";
            } else {
                consecutiveSixes++;
                nextPlayerId = player.getId();
                actionMessage += " Rolled a 6! " + player.getUsername() + " gets another roll!";
                events.add(GameEvent.builder()
                        .eventType("BONUS_TURN")
                        .gameId(snakeState.getGameId())
                        .playerId(player.getId())
                        .payload(Map.of("message", player.getUsername() + " gets a bonus turn!"))
                        .timestamp(System.currentTimeMillis())
                        .build());
            }
        } else {
            consecutiveSixes = 0;
            nextPlayerId = getNextActivePlayerId(details.getTurnOrder(), player.getId(), updatedPlayers);
        }

        String nextColor = null;
        if (nextPlayerId != null && updatedPlayers.containsKey(nextPlayerId)) {
            nextColor = updatedPlayers.get(nextPlayerId).getColor();
        }

        SnakeState.Details newDetails = SnakeState.Details.builder()
                .boardSize(details.getBoardSize())
                .currentPlayerId(nextPlayerId)
                .currentColor(nextColor)
                .lastDiceRoll(diceRoll)
                .turnOrder(details.getTurnOrder())
                .players(updatedPlayers)
                .snakes(details.getSnakes())
                .ladders(details.getLadders())
                .consecutiveSixes(consecutiveSixes)
                .lastActionMessage(actionMessage)
                .build();

        SnakeState newState = SnakeState.builder()
                .gameId(snakeState.getGameId())
                .status(newStatus)
                .players(snakeState.getPlayers())
                .winner(winner)
                .sequence(snakeState.getSequence() + 1)
                .updatedAt(System.currentTimeMillis())
                .details(newDetails)
                .build();

        return GameResult.builder()
                .successful(true)
                .newState(newState)
                .events(events)
                .build();
    }

    private String getNextActivePlayerId(List<String> turnOrder, String currentId, Map<String, SnakeState.SnakePlayerData> players) {
        int currentIndex = turnOrder.indexOf(currentId);
        if (currentIndex < 0) return turnOrder.get(0);

        for (int i = 1; i <= turnOrder.size(); i++) {
            int nextIndex = (currentIndex + i) % turnOrder.size();
            String candidateId = turnOrder.get(nextIndex);
            SnakeState.SnakePlayerData candidateData = players.get(candidateId);
            if (candidateData != null && candidateData.isActive()) {
                return candidateId;
            }
        }
        return currentId;
    }

    @Override
    public boolean isValidAction(GameState<?> state, Player player, SnakeAction action) {
        if (!(state instanceof SnakeState snakeState)) return false;
        if (snakeState.getStatus() != GameStatus.IN_PROGRESS) return false;
        if (player == null || !player.getId().equals(snakeState.getDetails().getCurrentPlayerId())) return false;
        return action != null && (action.getActionType() == null || SnakeAction.ROLL_DICE.equalsIgnoreCase(action.getActionType()));
    }

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        if (!(state instanceof SnakeState snakeState) || snakeState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.builder().successful(true).newState(state).build();
        }

        SnakeState.Details details = snakeState.getDetails();
        Map<String, SnakeState.SnakePlayerData> updatedPlayers = new HashMap<>(details.getPlayers());
        if (updatedPlayers.containsKey(player.getId())) {
            SnakeState.SnakePlayerData pd = updatedPlayers.get(player.getId());
            pd.setActive(false);
        }

        long activeCount = updatedPlayers.values().stream().filter(SnakeState.SnakePlayerData::isActive).count();
        GameStatus newStatus = snakeState.getStatus();
        String winner = snakeState.getWinner();
        String nextPlayerId = details.getCurrentPlayerId();

        if (activeCount <= 1) {
            newStatus = GameStatus.FINISHED;
            winner = updatedPlayers.values().stream()
                    .filter(SnakeState.SnakePlayerData::isActive)
                    .map(SnakeState.SnakePlayerData::getPlayerId)
                    .findFirst()
                    .orElse(null);
            nextPlayerId = null;
        } else if (player.getId().equals(details.getCurrentPlayerId())) {
            nextPlayerId = getNextActivePlayerId(details.getTurnOrder(), player.getId(), updatedPlayers);
        }

        String nextColor = null;
        if (nextPlayerId != null && updatedPlayers.containsKey(nextPlayerId)) {
            nextColor = updatedPlayers.get(nextPlayerId).getColor();
        }

        SnakeState.Details newDetails = SnakeState.Details.builder()
                .boardSize(details.getBoardSize())
                .currentPlayerId(nextPlayerId)
                .currentColor(nextColor)
                .lastDiceRoll(details.getLastDiceRoll())
                .turnOrder(details.getTurnOrder())
                .players(updatedPlayers)
                .snakes(details.getSnakes())
                .ladders(details.getLadders())
                .consecutiveSixes(0)
                .lastActionMessage(player.getUsername() + " left the game.")
                .build();

        SnakeState newState = SnakeState.builder()
                .gameId(snakeState.getGameId())
                .status(newStatus)
                .players(snakeState.getPlayers())
                .winner(winner)
                .sequence(snakeState.getSequence() + 1)
                .updatedAt(System.currentTimeMillis())
                .details(newDetails)
                .build();

        return GameResult.builder()
                .successful(true)
                .newState(newState)
                .build();
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.builder().successful(true).newState(state).build();
    }

    @Override
    public SnakeAction parseAction(Map<String, Object> rawAction) {
        if (rawAction == null) return new SnakeAction();
        String type = (String) rawAction.get("action");
        if (type == null) type = (String) rawAction.get("actionType");
        Integer dice = null;
        if (rawAction.containsKey("diceValue")) {
            dice = ((Number) rawAction.get("diceValue")).intValue();
        }
        return new SnakeAction(type, dice);
    }

    @Override
    public SnakeConfiguration parseConfiguration(Map<String, Object> options) {
        if (options == null) return defaultConfiguration();
        int boardSize = options.containsKey("boardSize") ? ((Number) options.get("boardSize")).intValue() : 100;
        return new SnakeConfiguration(boardSize);
    }
}
