package com.example.gameplatform.game.tictactoe;

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
import java.util.Random;
import java.util.stream.Collectors;

@Component
public class TicTacToeGameEngine implements GameEngine<TicTacToeState.Details, TicTacToeAction, TicTacToeConfiguration> {

    private static final Logger log = LoggerFactory.getLogger(TicTacToeGameEngine.class);

    public static final String GAME_TYPE = "TIC_TAC_TOE";

    private final Random random;

    public TicTacToeGameEngine() {
        this(new Random());
    }

    public TicTacToeGameEngine(Random random) {
        this.random = random;
    }

    @Override
    public String gameType() {
        return GAME_TYPE;
    }

    @Override
    public String displayName() {
        return "Tic Tac Toe";
    }

    @Override
    public int minPlayers() {
        return 2;
    }

    @Override
    public int maxPlayers() {
        return 2;
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
    public TicTacToeConfiguration defaultConfiguration() {
        return new TicTacToeConfiguration(3);
    }

    @Override
    public GameState<TicTacToeState.Details> createGame(String gameId, List<Player> players, TicTacToeConfiguration configuration) {
        if (players.size() < 2) {
            throw new IllegalArgumentException("TicTacToe requires 2 players");
        }

        int size = configuration != null && configuration.getBoardSize() > 0 ? configuration.getBoardSize() : 3;
        String[][] board = new String[size][size];
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                board[i][j] = "";
            }
        }

        Player p1 = players.get(0);
        Player p2 = players.get(1);

        boolean p1Starts = random.nextBoolean();
        Player starter = p1Starts ? p1 : p2;
        Player other = p1Starts ? p2 : p1;

        Map<String, String> marks = new HashMap<>();
        marks.put(starter.getId(), "X");
        marks.put(other.getId(), "O");

        TicTacToeState.Details details = TicTacToeState.Details.builder()
                .board(board)
                .currentPlayerId(starter.getId())
                .playerMarks(marks)
                .playerX(starter.getId())
                .playerO(other.getId())
                .movesCount(0)
                .winningLine(null)
                .build();

        return TicTacToeState.builder()
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
    public GameResult processAction(GameState<?> state, Player player, TicTacToeAction action) {
        if (!(state instanceof TicTacToeState ttState)) {
            return GameResult.failure(ErrorCodes.INVALID_ACTION, "Invalid game state for TicTacToe");
        }

        if (ttState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.failure(ErrorCodes.GAME_ALREADY_FINISHED, "Game is not in progress");
        }

        TicTacToeState.Details details = ttState.getDetails();
        if (!details.getCurrentPlayerId().equals(player.getId())) {
            return GameResult.failure(ErrorCodes.NOT_YOUR_TURN, "It is not your turn");
        }

        int r = action.getRow();
        int c = action.getColumn();
        String[][] board = details.getBoard();
        int size = board.length;

        if (r < 0 || r >= size || c < 0 || c >= size) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Position out of bounds: [" + r + "," + c + "]");
        }

        if (!board[r][c].isEmpty()) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "The selected position is already occupied");
        }

        String mark = details.getPlayerMarks().get(player.getId());
        String[][] newBoard = new String[size][size];
        for (int i = 0; i < size; i++) {
            System.arraycopy(board[i], 0, newBoard[i], 0, size);
        }
        newBoard[r][c] = mark;

        int newMovesCount = details.getMovesCount() + 1;
        List<int[]> winLine = checkWin(newBoard, mark, size);

        GameStatus newStatus = GameStatus.IN_PROGRESS;
        String winner = null;
        String nextPlayerId = player.getId().equals(details.getPlayerX()) ? details.getPlayerO() : details.getPlayerX();

        List<GameEvent> events = new ArrayList<>();
        events.add(GameEvent.of("MARK_PLACED", ttState.getGameId(), player.getId(), Map.of(
                "row", r,
                "column", c,
                "mark", mark
        )));

        if (winLine != null) {
            newStatus = GameStatus.FINISHED;
            winner = player.getId();
            events.add(GameEvent.of("GAME_WON", ttState.getGameId(), player.getId(), Map.of(
                    "winner", winner,
                    "winningLine", winLine
            )));
        } else if (newMovesCount >= size * size) {
            newStatus = GameStatus.DRAW;
            events.add(GameEvent.of("GAME_DRAW", ttState.getGameId(), null, Map.of(
                    "message", "Game ended in a draw"
            )));
        }

        TicTacToeState.Details newDetails = TicTacToeState.Details.builder()
                .board(newBoard)
                .currentPlayerId(newStatus == GameStatus.IN_PROGRESS ? nextPlayerId : null)
                .playerMarks(details.getPlayerMarks())
                .playerX(details.getPlayerX())
                .playerO(details.getPlayerO())
                .movesCount(newMovesCount)
                .winningLine(winLine)
                .build();

        TicTacToeState newState = TicTacToeState.builder()
                .gameId(ttState.getGameId())
                .status(newStatus)
                .players(ttState.getPlayers())
                .winner(winner)
                .sequence(ttState.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(newDetails)
                .build();

        return GameResult.success(newState, events);
    }

    private List<int[]> checkWin(String[][] b, String mark, int size) {
        // Rows
        for (int i = 0; i < size; i++) {
            boolean rowWin = true;
            for (int j = 0; j < size; j++) {
                if (!b[i][j].equals(mark)) {
                    rowWin = false;
                    break;
                }
            }
            if (rowWin) {
                List<int[]> line = new ArrayList<>();
                for (int j = 0; j < size; j++) line.add(new int[]{i, j});
                return line;
            }
        }

        // Columns
        for (int j = 0; j < size; j++) {
            boolean colWin = true;
            for (int i = 0; i < size; i++) {
                if (!b[i][j].equals(mark)) {
                    colWin = false;
                    break;
                }
            }
            if (colWin) {
                List<int[]> line = new ArrayList<>();
                for (int i = 0; i < size; i++) line.add(new int[]{i, j});
                return line;
            }
        }

        // Main diagonal
        boolean diag1 = true;
        for (int i = 0; i < size; i++) {
            if (!b[i][i].equals(mark)) {
                diag1 = false;
                break;
            }
        }
        if (diag1) {
            List<int[]> line = new ArrayList<>();
            for (int i = 0; i < size; i++) line.add(new int[]{i, i});
            return line;
        }

        // Anti diagonal
        boolean diag2 = true;
        for (int i = 0; i < size; i++) {
            if (!b[i][size - 1 - i].equals(mark)) {
                diag2 = false;
                break;
            }
        }
        if (diag2) {
            List<int[]> line = new ArrayList<>();
            for (int i = 0; i < size; i++) line.add(new int[]{i, size - 1 - i});
            return line;
        }

        return null;
    }

    @Override
    public boolean isValidAction(GameState<?> state, Player player, TicTacToeAction action) {
        if (!(state instanceof TicTacToeState ttState) || ttState.getStatus() != GameStatus.IN_PROGRESS) {
            return false;
        }
        TicTacToeState.Details details = ttState.getDetails();
        if (!details.getCurrentPlayerId().equals(player.getId())) {
            return false;
        }
        int r = action.getRow();
        int c = action.getColumn();
        String[][] board = details.getBoard();
        return r >= 0 && r < board.length && c >= 0 && c < board[0].length && board[r][c].isEmpty();
    }

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        if (!(state instanceof TicTacToeState ttState) || ttState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.success(state);
        }

        // The remaining player wins by forfeit
        String remainingPlayer = ttState.getPlayers().stream()
                .filter(id -> !id.equals(player.getId()))
                .findFirst()
                .orElse(null);

        List<GameEvent> events = List.of(GameEvent.of("PLAYER_FORFEIT", ttState.getGameId(), player.getId(), Map.of(
                "winner", remainingPlayer != null ? remainingPlayer : "NONE",
                "reason", "Player disconnected"
        )));

        TicTacToeState newState = TicTacToeState.builder()
                .gameId(ttState.getGameId())
                .status(remainingPlayer != null ? GameStatus.FINISHED : GameStatus.CANCELLED)
                .players(ttState.getPlayers())
                .winner(remainingPlayer)
                .sequence(ttState.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(ttState.getDetails())
                .build();

        return GameResult.success(newState, events);
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.success(state);
    }

    @Override
    public TicTacToeAction parseAction(Map<String, Object> rawAction) {
        String actionType = (String) rawAction.getOrDefault("action", (String) rawAction.get("actionType"));
        int row = rawAction.get("row") instanceof Number n ? n.intValue() : 0;
        int col = rawAction.get("column") instanceof Number n ? n.intValue() : (rawAction.get("col") instanceof Number n2 ? n2.intValue() : 0);
        return new TicTacToeAction(actionType, row, col);
    }

    @Override
    public TicTacToeConfiguration parseConfiguration(Map<String, Object> rawConfig) {
        if (rawConfig == null) return defaultConfiguration();
        int boardSize = rawConfig.get("boardSize") instanceof Number n ? n.intValue() : 3;
        return new TicTacToeConfiguration(boardSize);
    }
}
