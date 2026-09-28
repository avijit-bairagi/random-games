package com.example.gameplatform.game.ludo;

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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class LudoGameEngine implements GameEngine<LudoState.Details, LudoAction, LudoConfiguration> {

    private static final Logger log = LoggerFactory.getLogger(LudoGameEngine.class);

    public static final String GAME_TYPE = "LUDO";
    public static final int TOTAL_TRACK_CELLS = 52;
    public static final int HOME_GOAL_STEP = 57; // 0..50 main track, 51..56 home column, 57 goal

    // Starting track positions on 0..51 global board for RED, GREEN, YELLOW, BLUE
    public static final int RED_START_INDEX = 0;
    public static final int GREEN_START_INDEX = 13;
    public static final int YELLOW_START_INDEX = 26;
    public static final int BLUE_START_INDEX = 39;

    // Safe squares on global 52-cell track (start cells + star cells)
    public static final Set<Integer> SAFE_SQUARES = Set.of(
            0, 8, 13, 21, 26, 34, 39, 47
    );

    private final Random random;

    public LudoGameEngine() {
        this(new Random());
    }

    public LudoGameEngine(Random random) {
        this.random = random;
    }

    @Override
    public String gameType() {
        return GAME_TYPE;
    }

    @Override
    public String displayName() {
        return "Ludo";
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
    public LudoConfiguration defaultConfiguration() {
        return new LudoConfiguration(4);
    }

    @Override
    public GameState<LudoState.Details> createGame(String gameId, List<Player> players, LudoConfiguration configuration) {
        if (players.size() != 2 && players.size() != 4) {
            throw new IllegalArgumentException("Ludo requires 2 or 4 players");
        }

        LudoState.Color[] colors;
        int[] startIndices;

        if (players.size() == 2) {
            // Opposite sides: RED (top-left) and YELLOW (bottom-right)
            colors = new LudoState.Color[]{LudoState.Color.RED, LudoState.Color.YELLOW};
            startIndices = new int[]{RED_START_INDEX, YELLOW_START_INDEX};
        } else {
            // 4 players: RED, GREEN, YELLOW, BLUE
            colors = LudoState.Color.values();
            startIndices = new int[]{RED_START_INDEX, GREEN_START_INDEX, YELLOW_START_INDEX, BLUE_START_INDEX};
        }

        Map<String, LudoState.PlayerState> playerStates = new HashMap<>();
        List<String> turnOrder = new ArrayList<>();

        for (int i = 0; i < players.size(); i++) {
            Player p = players.get(i);
            LudoState.Color color = colors[i];
            int startIndex = startIndices[i];

            List<LudoState.Piece> pieces = new ArrayList<>();
            for (int pieceId = 0; pieceId < 4; pieceId++) {
                pieces.add(LudoState.Piece.builder()
                        .id(pieceId)
                        .color(color)
                        .step(-1) // In yard
                        .inYard(true)
                        .finished(false)
                        .build());
            }

            playerStates.put(p.getId(), LudoState.PlayerState.builder()
                    .playerId(p.getId())
                    .color(color)
                    .startGlobalIndex(startIndex)
                    .pieces(pieces)
                    .piecesFinished(0)
                    .build());

            turnOrder.add(p.getId());
        }

        int firstIndex = random.nextInt(turnOrder.size());
        String firstPlayerId = turnOrder.get(firstIndex);
        LudoState.PlayerState firstPlayerState = playerStates.get(firstPlayerId);

        LudoState.Details details = LudoState.Details.builder()
                .currentPlayerId(firstPlayerId)
                .currentColor(firstPlayerState.getColor())
                .turnPhase(LudoState.TurnPhase.ROLLING)
                .lastDiceRoll(null)
                .consecutiveSixes(0)
                .movablePieceIndices(List.of())
                .playerStates(playerStates)
                .playerTurnOrder(turnOrder)
                .currentTurnIndex(firstIndex)
                .build();

        return LudoState.builder()
                .gameId(gameId)
                .status(GameStatus.IN_PROGRESS)
                .players(players.stream().map(Player::getId).collect(Collectors.toList()))
                .winner(null)
                .sequence(1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();
    }

    @Override
    public GameResult processAction(GameState<?> state, Player player, LudoAction action) {
        if (!(state instanceof LudoState ludoState)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Invalid game state for Ludo");
        }

        if (ludoState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.failure(ErrorCodes.GAME_ALREADY_FINISHED, "Game is not in progress");
        }

        LudoState.Details details = ludoState.getDetails();
        if (!details.getCurrentPlayerId().equals(player.getId())) {
            return GameResult.failure(ErrorCodes.NOT_YOUR_TURN, "It is not your turn");
        }

        String actionType = action.getActionType();
        if (LudoAction.ROLL_DICE.equalsIgnoreCase(actionType)) {
            return handleRollDice(ludoState, player);
        } else if (LudoAction.MOVE_PIECE.equalsIgnoreCase(actionType)) {
            return handleMovePiece(ludoState, player, action.getPieceIndex());
        } else if (LudoAction.PASS_TURN.equalsIgnoreCase(actionType)) {
            return handlePassTurn(ludoState, player);
        }

        return GameResult.failure(ErrorCodes.INVALID_ACTION, "Unknown Ludo action: " + actionType);
    }

    private GameResult handleRollDice(LudoState state, Player player) {
        LudoState.Details details = state.getDetails();
        if (details.getTurnPhase() != LudoState.TurnPhase.ROLLING) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Dice already rolled. Please select a piece to move.");
        }

        int dice = random.nextInt(6) + 1;
        int sixes = (dice == 6) ? details.getConsecutiveSixes() + 1 : 0;

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("DICE_ROLLED", state.getGameId(), player.getId(), Map.of(
                "dice", dice,
                "consecutiveSixes", sixes
        )));

        // 3 consecutive sixes penalty: turn ends immediately
        if (sixes >= 3) {
            events.add(GameEvent.of("THREE_SIXES_PENALTY", state.getGameId(), player.getId(), Map.of(
                    "message", "Three consecutive sixes rolled! Turn forfeited."
            )));
            return advanceTurn(state, events, "Three consecutive sixes");
        }

        LudoState.PlayerState pState = details.getPlayerStates().get(player.getId());
        List<Integer> movablePieces = findMovablePieces(pState, dice);

        if (movablePieces.isEmpty()) {
            events.add(GameEvent.of("NO_VALID_MOVES", state.getGameId(), player.getId(), Map.of(
                    "dice", dice
            )));
            return advanceTurn(state, events, "No valid moves");
        }

        LudoState.Details newDetails = cloneDetails(details);
        newDetails.setLastDiceRoll(dice);
        newDetails.setConsecutiveSixes(sixes);
        newDetails.setTurnPhase(LudoState.TurnPhase.MOVING);
        newDetails.setMovablePieceIndices(movablePieces);

        LudoState newState = LudoState.builder()
                .gameId(state.getGameId())
                .status(GameStatus.IN_PROGRESS)
                .players(state.getPlayers())
                .winner(state.getWinner())
                .sequence(state.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(newDetails)
                .build();

        return GameResult.success(newState, events);
    }

    private GameResult handleMovePiece(LudoState state, Player player, Integer pieceIndex) {
        LudoState.Details details = state.getDetails();
        if (details.getTurnPhase() != LudoState.TurnPhase.MOVING) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "You must roll the dice before moving");
        }

        if (pieceIndex == null || pieceIndex < 0 || pieceIndex >= 4) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Invalid piece index");
        }

        if (!details.getMovablePieceIndices().contains(pieceIndex)) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Selected piece cannot be moved with dice roll " + details.getLastDiceRoll());
        }

        int dice = details.getLastDiceRoll();
        LudoState.Details newDetails = cloneDetails(details);
        LudoState.PlayerState pState = newDetails.getPlayerStates().get(player.getId());
        LudoState.Piece piece = pState.getPieces().get(pieceIndex);

        List<GameEvent> events = new ArrayList<>();
        boolean grantBonusTurn = false;

        if (piece.isInYard()) {
            // Move out of yard to start position (step 0)
            piece.setInYard(false);
            piece.setStep(0);
            events.add(GameEvent.of("PIECE_ENTERED_TRACK", state.getGameId(), player.getId(), Map.of(
                    "pieceIndex", pieceIndex,
                    "color", pState.getColor()
            )));
        } else {
            int targetStep = piece.getStep() + dice;
            piece.setStep(targetStep);

            if (targetStep == HOME_GOAL_STEP) {
                piece.setFinished(true);
                pState.setPiecesFinished(pState.getPiecesFinished() + 1);
                grantBonusTurn = true;
                events.add(GameEvent.of("PIECE_REACHED_HOME", state.getGameId(), player.getId(), Map.of(
                        "pieceIndex", pieceIndex,
                        "color", pState.getColor(),
                        "piecesFinished", pState.getPiecesFinished()
                )));
            } else {
                events.add(GameEvent.of("PIECE_MOVED", state.getGameId(), player.getId(), Map.of(
                        "pieceIndex", pieceIndex,
                        "step", targetStep,
                        "color", pState.getColor()
                )));
            }
        }

        // Check for opponent capture on main track
        if (!piece.isInYard() && !piece.isFinished() && piece.getStep() < 51) {
            int globalPos = calculateGlobalPosition(pState.getStartGlobalIndex(), piece.getStep());
            if (!SAFE_SQUARES.contains(globalPos)) {
                // Check if any opponent piece is on this global cell
                for (LudoState.PlayerState oppState : newDetails.getPlayerStates().values()) {
                    if (oppState.getPlayerId().equals(player.getId())) continue;

                    for (LudoState.Piece oppPiece : oppState.getPieces()) {
                        if (!oppPiece.isInYard() && !oppPiece.isFinished() && oppPiece.getStep() < 51) {
                            int oppGlobalPos = calculateGlobalPosition(oppState.getStartGlobalIndex(), oppPiece.getStep());
                            if (oppGlobalPos == globalPos) {
                                // Captured!
                                oppPiece.setStep(-1);
                                oppPiece.setInYard(true);
                                grantBonusTurn = true;
                                events.add(GameEvent.of("PIECE_CAPTURED", state.getGameId(), player.getId(), Map.of(
                                        "capturedPlayerId", oppState.getPlayerId(),
                                        "capturedPieceIndex", oppPiece.getId(),
                                        "capturedColor", oppState.getColor(),
                                        "globalPosition", globalPos
                                )));
                            }
                        }
                    }
                }
            }
        }

        // Check win condition (all 4 pieces reached home)
        if (pState.getPiecesFinished() >= 4) {
            events.add(GameEvent.of("GAME_WON", state.getGameId(), player.getId(), Map.of(
                    "winner", player.getId(),
                    "color", pState.getColor()
            )));

            LudoState winState = LudoState.builder()
                    .gameId(state.getGameId())
                    .status(GameStatus.FINISHED)
                    .players(state.getPlayers())
                    .winner(player.getId())
                    .sequence(state.getSequence() + 1)
                    .updatedAt(Instant.now().toEpochMilli())
                    .details(newDetails)
                    .build();

            return GameResult.success(winState, events);
        }

        // Check if player gets another turn (dice == 6 or captured opponent or reached home)
        if (dice == 6 || grantBonusTurn) {
            newDetails.setTurnPhase(LudoState.TurnPhase.ROLLING);
            newDetails.setLastDiceRoll(null);
            newDetails.setMovablePieceIndices(List.of());

            LudoState nextRollState = LudoState.builder()
                    .gameId(state.getGameId())
                    .status(GameStatus.IN_PROGRESS)
                    .players(state.getPlayers())
                    .winner(null)
                    .sequence(state.getSequence() + 1)
                    .updatedAt(Instant.now().toEpochMilli())
                    .details(newDetails)
                    .build();

            return GameResult.success(nextRollState, events);
        }

        // Otherwise pass to next player
        return advanceTurnWithDetails(state, newDetails, events);
    }

    private GameResult handlePassTurn(LudoState state, Player player) {
        LudoState.Details details = state.getDetails();
        if (details.getTurnPhase() == LudoState.TurnPhase.MOVING && details.getMovablePieceIndices().isEmpty()) {
            return advanceTurn(state, new ArrayList<>(), "Passed turn");
        }
        return GameResult.failure(ErrorCodes.INVALID_ACTION, "Cannot pass turn while valid moves exist");
    }

    private GameResult advanceTurn(LudoState state, List<GameEvent> events, String reason) {
        LudoState.Details newDetails = cloneDetails(state.getDetails());
        return advanceTurnWithDetails(state, newDetails, events);
    }

    private GameResult advanceTurnWithDetails(LudoState state, LudoState.Details newDetails, List<GameEvent> events) {
        int nextTurnIndex = (newDetails.getCurrentTurnIndex() + 1) % newDetails.getPlayerTurnOrder().size();
        String nextPlayerId = newDetails.getPlayerTurnOrder().get(nextTurnIndex);
        LudoState.PlayerState nextPlayerState = newDetails.getPlayerStates().get(nextPlayerId);

        newDetails.setCurrentTurnIndex(nextTurnIndex);
        newDetails.setCurrentPlayerId(nextPlayerId);
        newDetails.setCurrentColor(nextPlayerState.getColor());
        newDetails.setTurnPhase(LudoState.TurnPhase.ROLLING);
        newDetails.setLastDiceRoll(null);
        newDetails.setConsecutiveSixes(0);
        newDetails.setMovablePieceIndices(List.of());

        events.add(GameEvent.of("TURN_CHANGED", state.getGameId(), nextPlayerId, Map.of(
                "currentPlayerId", nextPlayerId,
                "color", nextPlayerState.getColor()
        )));

        LudoState newState = LudoState.builder()
                .gameId(state.getGameId())
                .status(GameStatus.IN_PROGRESS)
                .players(state.getPlayers())
                .winner(null)
                .sequence(state.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(newDetails)
                .build();

        return GameResult.success(newState, events);
    }

    private List<Integer> findMovablePieces(LudoState.PlayerState pState, int dice) {
        List<Integer> movable = new ArrayList<>();
        for (LudoState.Piece p : pState.getPieces()) {
            if (p.isFinished()) continue;

            if (p.isInYard()) {
                if (dice == 6) {
                    movable.add(p.getId());
                }
            } else {
                int targetStep = p.getStep() + dice;
                if (targetStep <= HOME_GOAL_STEP) {
                    movable.add(p.getId());
                }
            }
        }
        return movable;
    }

    public static int calculateGlobalPosition(int startGlobalIndex, int step) {
        if (step < 0 || step > 50) return -1;
        return (startGlobalIndex + step) % TOTAL_TRACK_CELLS;
    }

    private LudoState.Details cloneDetails(LudoState.Details original) {
        Map<String, LudoState.PlayerState> newPlayerStates = new HashMap<>();
        for (Map.Entry<String, LudoState.PlayerState> entry : original.getPlayerStates().entrySet()) {
            LudoState.PlayerState ps = entry.getValue();
            List<LudoState.Piece> newPieces = new ArrayList<>();
            for (LudoState.Piece p : ps.getPieces()) {
                newPieces.add(LudoState.Piece.builder()
                        .id(p.getId())
                        .color(p.getColor())
                        .step(p.getStep())
                        .inYard(p.isInYard())
                        .finished(p.isFinished())
                        .build());
            }
            newPlayerStates.put(entry.getKey(), LudoState.PlayerState.builder()
                    .playerId(ps.getPlayerId())
                    .color(ps.getColor())
                    .startGlobalIndex(ps.getStartGlobalIndex())
                    .pieces(newPieces)
                    .piecesFinished(ps.getPiecesFinished())
                    .build());
        }

        return LudoState.Details.builder()
                .currentPlayerId(original.getCurrentPlayerId())
                .currentColor(original.getCurrentColor())
                .turnPhase(original.getTurnPhase())
                .lastDiceRoll(original.getLastDiceRoll())
                .consecutiveSixes(original.getConsecutiveSixes())
                .movablePieceIndices(new ArrayList<>(original.getMovablePieceIndices()))
                .playerStates(newPlayerStates)
                .playerTurnOrder(new ArrayList<>(original.getPlayerTurnOrder()))
                .currentTurnIndex(original.getCurrentTurnIndex())
                .build();
    }

    @Override
    public boolean isValidAction(GameState<?> state, Player player, LudoAction action) {
        if (!(state instanceof LudoState ludoState) || ludoState.getStatus() != GameStatus.IN_PROGRESS) {
            return false;
        }
        LudoState.Details details = ludoState.getDetails();
        if (!details.getCurrentPlayerId().equals(player.getId())) {
            return false;
        }
        if (LudoAction.ROLL_DICE.equalsIgnoreCase(action.getActionType())) {
            return details.getTurnPhase() == LudoState.TurnPhase.ROLLING;
        }
        if (LudoAction.MOVE_PIECE.equalsIgnoreCase(action.getActionType())) {
            return details.getTurnPhase() == LudoState.TurnPhase.MOVING &&
                    action.getPieceIndex() != null &&
                    details.getMovablePieceIndices().contains(action.getPieceIndex());
        }
        return false;
    }

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        if (!(state instanceof LudoState ludoState) || ludoState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.success(state);
        }

        LudoState.Details details = ludoState.getDetails();
        List<String> remainingPlayers = ludoState.getPlayers().stream()
                .filter(id -> !id.equals(player.getId()))
                .collect(Collectors.toList());

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("PLAYER_DISCONNECTED", ludoState.getGameId(), player.getId(), Map.of(
                "playerId", player.getId()
        )));

        if (remainingPlayers.size() <= 1) {
            String winner = remainingPlayers.isEmpty() ? null : remainingPlayers.get(0);
            LudoState finishedState = LudoState.builder()
                    .gameId(ludoState.getGameId())
                    .status(winner != null ? GameStatus.FINISHED : GameStatus.CANCELLED)
                    .players(ludoState.getPlayers())
                    .winner(winner)
                    .sequence(ludoState.getSequence() + 1)
                    .updatedAt(Instant.now().toEpochMilli())
                    .details(details)
                    .build();
            return GameResult.success(finishedState, events);
        }

        // If disconnected player was current turn, advance turn
        if (player.getId().equals(details.getCurrentPlayerId())) {
            return advanceTurn(ludoState, events, "Disconnected player turn advance");
        }

        return GameResult.success(state, events);
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.success(state);
    }

    @Override
    public LudoAction parseAction(Map<String, Object> rawAction) {
        String actionType = (String) rawAction.getOrDefault("action", (String) rawAction.get("actionType"));
        Integer pieceIndex = null;
        if (rawAction.containsKey("pieceIndex") && rawAction.get("pieceIndex") instanceof Number n) {
            pieceIndex = n.intValue();
        } else if (rawAction.containsKey("piece") && rawAction.get("piece") instanceof Number n) {
            pieceIndex = n.intValue();
        }
        return new LudoAction(actionType, pieceIndex);
    }

    @Override
    public LudoConfiguration parseConfiguration(Map<String, Object> rawConfig) {
        if (rawConfig == null) return defaultConfiguration();
        int pieces = rawConfig.get("piecesPerPlayer") instanceof Number n ? n.intValue() : 4;
        return new LudoConfiguration(pieces);
    }
}
