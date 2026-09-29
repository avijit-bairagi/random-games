package com.example.gameplatform.game.chess;

import com.example.gameplatform.common.exception.ErrorCodes;
import com.example.gameplatform.game.core.*;
import com.example.gameplatform.player.model.Player;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

@Component
public class ChessGameEngine implements GameEngine<ChessState.Details, ChessAction, ChessConfiguration> {

    private static final String INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    private final Random random;

    public ChessGameEngine() {
        this(new Random());
    }

    public ChessGameEngine(Random random) {
        this.random = random;
    }

    @Override
    public String gameType() { return "CHESS"; }

    @Override
    public String displayName() { return "Chess"; }

    @Override
    public int minPlayers() { return 2; }

    @Override
    public int maxPlayers() { return 2; }

    @Override
    public boolean isSpectatorAllowed() { return true; }

    @Override
    public boolean isLateJoinAllowed() { return false; }

    @Override
    public ChessConfiguration defaultConfiguration() {
        return new ChessConfiguration(10);
    }

    @Override
    public GameState<ChessState.Details> createGame(String gameId, List<Player> players, ChessConfiguration config) {
        boolean firstPlayerIsWhite = random.nextBoolean();
        String whitePlayerId = players.get(firstPlayerIsWhite ? 0 : 1).getId();
        String blackPlayerId = players.get(firstPlayerIsWhite ? 1 : 0).getId();

        ChessState.Details details = ChessState.Details.builder()
                .fen(INITIAL_FEN)
                .currentPlayerId(whitePlayerId)
                .whitePlayerId(whitePlayerId)
                .blackPlayerId(blackPlayerId)
                .moveHistory(new ArrayList<>())
                .isCheck(false)
                .isCheckmate(false)
                .isDraw(false)
                .drawReason(null)
                .build();

        return ChessState.builder()
                .gameId(gameId)
                .status(GameStatus.IN_PROGRESS)
                .players(List.of(whitePlayerId, blackPlayerId))
                .winner(null)
                .sequence(0)
                .updatedAt(Instant.now().toEpochMilli())
                .details(details)
                .build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public GameResult processAction(GameState<?> state, Player player, ChessAction action) {
        ChessState chessState = (ChessState) state;
        ChessState.Details details = chessState.getDetails();

        if (chessState.getStatus() == GameStatus.FINISHED || chessState.getStatus() == GameStatus.DRAW) {
            return GameResult.failure(ErrorCodes.GAME_ALREADY_FINISHED, "Game is already finished");
        }

        if (!player.getId().equals(details.getCurrentPlayerId())) {
            return GameResult.failure(ErrorCodes.NOT_YOUR_TURN, "It is not your turn");
        }

        String from = action.getFrom();
        String to = action.getTo();
        if (from == null || to == null || from.length() < 2 || to.length() < 2) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Invalid move coordinates");
        }

        char[][] board = fenToBoard(details.getFen());
        boolean isWhite = player.getId().equals(details.getWhitePlayerId());

        int fromCol = from.charAt(0) - 'a';
        int fromRow = 8 - Character.getNumericValue(from.charAt(1));
        int toCol = to.charAt(0) - 'a';
        int toRow = 8 - Character.getNumericValue(to.charAt(1));

        if (!isValidCoordinate(fromCol, fromRow) || !isValidCoordinate(toCol, toRow)) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Coordinates out of bounds");
        }

        char piece = board[fromRow][fromCol];
        if (piece == '.') {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "No piece at source square");
        }

        if (isWhite && !Character.isUpperCase(piece)) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "You can only move your own pieces");
        }
        if (!isWhite && !Character.isLowerCase(piece)) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "You can only move your own pieces");
        }

        if (!isLegalMove(board, fromRow, fromCol, toRow, toCol, isWhite, details.getFen())) {
            return GameResult.failure(ErrorCodes.INVALID_MOVE, "Illegal move");
        }

        // Apply move
        char[][] newBoard = copyBoard(board);
        char movingPiece = newBoard[fromRow][fromCol];

        // Handle pawn promotion
        if ((movingPiece == 'P' && toRow == 0) || (movingPiece == 'p' && toRow == 7)) {
            String promo = action.getPromotion();
            char promoPiece = (promo != null && !promo.isEmpty()) ? promo.charAt(0) : 'Q';
            movingPiece = isWhite ? Character.toUpperCase(promoPiece) : Character.toLowerCase(promoPiece);
        }

        // Handle en passant capture
        String fenParts[] = details.getFen().split(" ");
        String enPassantTarget = fenParts.length > 3 ? fenParts[3] : "-";
        if ((board[fromRow][fromCol] == 'P' || board[fromRow][fromCol] == 'p') &&
                !enPassantTarget.equals("-")) {
            int epCol = enPassantTarget.charAt(0) - 'a';
            int epRow = 8 - Character.getNumericValue(enPassantTarget.charAt(1));
            if (toCol == epCol && toRow == epRow) {
                // Remove captured pawn
                int capturedRow = isWhite ? epRow + 1 : epRow - 1;
                newBoard[capturedRow][epCol] = '.';
            }
        }

        // Handle castling
        if (movingPiece == 'K' && fromCol == 4 && fromRow == 7) {
            if (toCol == 6) { // kingside
                newBoard[7][5] = 'R'; newBoard[7][7] = '.';
            } else if (toCol == 2) { // queenside
                newBoard[7][3] = 'R'; newBoard[7][0] = '.';
            }
        } else if (movingPiece == 'k' && fromCol == 4 && fromRow == 0) {
            if (toCol == 6) {
                newBoard[0][5] = 'r'; newBoard[0][7] = '.';
            } else if (toCol == 2) {
                newBoard[0][3] = 'r'; newBoard[0][0] = '.';
            }
        }

        newBoard[toRow][toCol] = movingPiece;
        newBoard[fromRow][fromCol] = '.';

        // Update castling rights
        String castling = fenParts.length > 2 ? fenParts[2] : "KQkq";
        castling = updateCastlingRights(castling, fromRow, fromCol, toRow, toCol, board[fromRow][fromCol]);

        // Update en passant
        String newEnPassant = "-";
        if ((board[fromRow][fromCol] == 'P') && fromRow == 6 && toRow == 4) {
            newEnPassant = "" + from.charAt(0) + "3";
        } else if ((board[fromRow][fromCol] == 'p') && fromRow == 1 && toRow == 3) {
            newEnPassant = "" + from.charAt(0) + "6";
        }

        // Half-move clock
        int halfMoveClock = fenParts.length > 4 ? Integer.parseInt(fenParts[4]) : 0;
        char capturedPiece = board[toRow][toCol];
        if (capturedPiece != '.' || board[fromRow][fromCol] == 'P' || board[fromRow][fromCol] == 'p') {
            halfMoveClock = 0;
        } else {
            halfMoveClock++;
        }

        // Full move number
        int fullMoveNumber = fenParts.length > 5 ? Integer.parseInt(fenParts[5]) : 1;
        if (!isWhite) fullMoveNumber++;

        String nextTurn = isWhite ? "b" : "w";
        String newFen = boardToFen(newBoard) + " " + nextTurn + " " + castling + " " + newEnPassant
                + " " + halfMoveClock + " " + fullMoveNumber;

        String nextPlayerId = isWhite ? details.getBlackPlayerId() : details.getWhitePlayerId();
        boolean nextIsWhite = !isWhite;

        boolean inCheck = isKingInCheck(newBoard, nextIsWhite);
        boolean inCheckmate = inCheck && !hasAnyLegalMove(newBoard, nextIsWhite, newFen);
        boolean inStalemate = !inCheck && !hasAnyLegalMove(newBoard, nextIsWhite, newFen);
        boolean fiftyMoveRule = halfMoveClock >= 100;

        List<String> newMoveHistory = new ArrayList<>(details.getMoveHistory());
        newMoveHistory.add(from + to);

        GameStatus newStatus = GameStatus.IN_PROGRESS;
        String winner = null;
        boolean isDraw = false;
        String drawReason = null;

        if (inCheckmate) {
            newStatus = GameStatus.FINISHED;
            winner = player.getId();
        } else if (inStalemate) {
            newStatus = GameStatus.DRAW;
            isDraw = true;
            drawReason = "stalemate";
        } else if (fiftyMoveRule) {
            newStatus = GameStatus.DRAW;
            isDraw = true;
            drawReason = "fifty-move rule";
        }

        ChessState.Details newDetails = ChessState.Details.builder()
                .fen(newFen)
                .currentPlayerId(newStatus == GameStatus.IN_PROGRESS ? nextPlayerId : details.getCurrentPlayerId())
                .whitePlayerId(details.getWhitePlayerId())
                .blackPlayerId(details.getBlackPlayerId())
                .moveHistory(newMoveHistory)
                .isCheck(inCheck && newStatus == GameStatus.IN_PROGRESS)
                .isCheckmate(inCheckmate)
                .isDraw(isDraw)
                .drawReason(drawReason)
                .build();

        ChessState newState = ChessState.builder()
                .gameId(chessState.getGameId())
                .status(newStatus)
                .players(chessState.getPlayers())
                .winner(winner)
                .sequence(chessState.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(newDetails)
                .build();

        return GameResult.success(newState);
    }

    @Override
    public boolean isValidAction(GameState<?> state, Player player, ChessAction action) {
        ChessState chessState = (ChessState) state;
        ChessState.Details details = chessState.getDetails();
        if (!player.getId().equals(details.getCurrentPlayerId())) return false;
        String from = action.getFrom();
        String to = action.getTo();
        if (from == null || to == null || from.length() < 2 || to.length() < 2) return false;
        char[][] board = fenToBoard(details.getFen());
        boolean isWhite = player.getId().equals(details.getWhitePlayerId());
        int fromCol = from.charAt(0) - 'a';
        int fromRow = 8 - Character.getNumericValue(from.charAt(1));
        int toCol = to.charAt(0) - 'a';
        int toRow = 8 - Character.getNumericValue(to.charAt(1));
        if (!isValidCoordinate(fromCol, fromRow) || !isValidCoordinate(toCol, toRow)) return false;
        char piece = board[fromRow][fromCol];
        if (piece == '.') return false;
        if (isWhite && !Character.isUpperCase(piece)) return false;
        if (!isWhite && !Character.isLowerCase(piece)) return false;
        return isLegalMove(board, fromRow, fromCol, toRow, toCol, isWhite, details.getFen());
    }

    @Override
    public GameResult onPlayerDisconnect(GameState<?> state, Player player) {
        ChessState chessState = (ChessState) state;
        if (chessState.getStatus() != GameStatus.IN_PROGRESS) {
            return GameResult.success(state);
        }
        // Forfeit on disconnect
        String winnerId = chessState.getPlayers().stream()
                .filter(id -> !id.equals(player.getId()))
                .findFirst().orElse(null);

        ChessState newState = ChessState.builder()
                .gameId(chessState.getGameId())
                .status(GameStatus.FINISHED)
                .players(chessState.getPlayers())
                .winner(winnerId)
                .sequence(chessState.getSequence() + 1)
                .updatedAt(Instant.now().toEpochMilli())
                .details(chessState.getDetails())
                .build();
        return GameResult.success(newState);
    }

    @Override
    public GameResult onPlayerReconnect(GameState<?> state, Player player) {
        return GameResult.success(state);
    }

    @Override
    public ChessAction parseAction(Map<String, Object> rawAction) {
        String actionType = (String) rawAction.getOrDefault("action", ChessAction.MOVE);
        String from = (String) rawAction.get("from");
        String to = (String) rawAction.get("to");
        String promotion = (String) rawAction.getOrDefault("promotion", null);
        return new ChessAction(actionType, from, to, promotion);
    }

    @Override
    public ChessConfiguration parseConfiguration(Map<String, Object> rawConfig) {
        if (rawConfig == null) return defaultConfiguration();
        int timeLimit = rawConfig.get("timeLimitMinutes") instanceof Number n ? n.intValue() : 10;
        return new ChessConfiguration(timeLimit);
    }

    // ---- Chess logic helpers ----

    private char[][] fenToBoard(String fen) {
        char[][] board = new char[8][8];
        for (char[] row : board) Arrays.fill(row, '.');
        String[] parts = fen.split(" ");
        String[] rows = parts[0].split("/");
        for (int r = 0; r < 8; r++) {
            int col = 0;
            for (char c : rows[r].toCharArray()) {
                if (Character.isDigit(c)) {
                    col += Character.getNumericValue(c);
                } else {
                    board[r][col++] = c;
                }
            }
        }
        return board;
    }

    private String boardToFen(char[][] board) {
        StringBuilder sb = new StringBuilder();
        for (int r = 0; r < 8; r++) {
            if (r > 0) sb.append('/');
            int empty = 0;
            for (int c = 0; c < 8; c++) {
                if (board[r][c] == '.') {
                    empty++;
                } else {
                    if (empty > 0) { sb.append(empty); empty = 0; }
                    sb.append(board[r][c]);
                }
            }
            if (empty > 0) sb.append(empty);
        }
        return sb.toString();
    }

    private char[][] copyBoard(char[][] board) {
        char[][] copy = new char[8][8];
        for (int i = 0; i < 8; i++) copy[i] = Arrays.copyOf(board[i], 8);
        return copy;
    }

    private boolean isValidCoordinate(int col, int row) {
        return col >= 0 && col < 8 && row >= 0 && row < 8;
    }

    private boolean isLegalMove(char[][] board, int fromRow, int fromCol, int toRow, int toCol,
                                 boolean isWhite, String fen) {
        if (!isPseudoLegalMove(board, fromRow, fromCol, toRow, toCol, isWhite, fen)) return false;
        // Check that move doesn't leave own king in check
        char[][] newBoard = copyBoard(board);
        newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = '.';
        return !isKingInCheck(newBoard, isWhite);
    }

    private boolean isPseudoLegalMove(char[][] board, int fromRow, int fromCol, int toRow, int toCol,
                                       boolean isWhite, String fen) {
        char piece = board[fromRow][fromCol];
        char target = board[toRow][toCol];

        // Can't capture own piece
        if (target != '.' && (Character.isUpperCase(target) == isWhite)) return false;

        char p = Character.toUpperCase(piece);
        int dr = toRow - fromRow;
        int dc = toCol - fromCol;

        return switch (p) {
            case 'P' -> isPawnMove(board, fromRow, fromCol, toRow, toCol, isWhite, fen);
            case 'R' -> isRookMove(board, fromRow, fromCol, toRow, toCol);
            case 'N' -> isKnightMove(dr, dc);
            case 'B' -> isBishopMove(board, fromRow, fromCol, toRow, toCol);
            case 'Q' -> isRookMove(board, fromRow, fromCol, toRow, toCol) ||
                        isBishopMove(board, fromRow, fromCol, toRow, toCol);
            case 'K' -> isKingMove(board, fromRow, fromCol, toRow, toCol, isWhite, fen);
            default -> false;
        };
    }

    private boolean isPawnMove(char[][] board, int fromRow, int fromCol, int toRow, int toCol,
                                boolean isWhite, String fen) {
        int dir = isWhite ? -1 : 1;
        int startRow = isWhite ? 6 : 1;
        int dr = toRow - fromRow;
        int dc = toCol - fromCol;

        // Forward one
        if (dc == 0 && dr == dir && board[toRow][toCol] == '.') return true;
        // Forward two from start
        if (dc == 0 && dr == 2 * dir && fromRow == startRow &&
                board[fromRow + dir][fromCol] == '.' && board[toRow][toCol] == '.') return true;
        // Capture diagonally
        if (Math.abs(dc) == 1 && dr == dir && board[toRow][toCol] != '.' &&
                (Character.isUpperCase(board[toRow][toCol]) != isWhite)) return true;
        // En passant
        String[] parts = fen.split(" ");
        String ep = parts.length > 3 ? parts[3] : "-";
        if (!ep.equals("-") && Math.abs(dc) == 1 && dr == dir) {
            int epCol = ep.charAt(0) - 'a';
            int epRow = 8 - Character.getNumericValue(ep.charAt(1));
            if (toCol == epCol && toRow == epRow) return true;
        }
        return false;
    }

    private boolean isRookMove(char[][] board, int fromRow, int fromCol, int toRow, int toCol) {
        if (fromRow != toRow && fromCol != toCol) return false;
        return isPathClear(board, fromRow, fromCol, toRow, toCol);
    }

    private boolean isKnightMove(int dr, int dc) {
        return (Math.abs(dr) == 2 && Math.abs(dc) == 1) || (Math.abs(dr) == 1 && Math.abs(dc) == 2);
    }

    private boolean isBishopMove(char[][] board, int fromRow, int fromCol, int toRow, int toCol) {
        if (Math.abs(toRow - fromRow) != Math.abs(toCol - fromCol)) return false;
        return isPathClear(board, fromRow, fromCol, toRow, toCol);
    }

    private boolean isKingMove(char[][] board, int fromRow, int fromCol, int toRow, int toCol,
                                boolean isWhite, String fen) {
        int dr = Math.abs(toRow - fromRow);
        int dc = Math.abs(toCol - fromCol);
        // Normal king move
        if (dr <= 1 && dc <= 1) return true;
        // Castling
        if (dr == 0 && dc == 2) {
            String[] parts = fen.split(" ");
            String castling = parts.length > 2 ? parts[2] : "-";
            if (isWhite && fromRow == 7 && fromCol == 4) {
                if (toCol == 6 && castling.contains("K") &&
                        board[7][5] == '.' && board[7][6] == '.' &&
                        !isKingInCheck(board, true) &&
                        !isSquareAttacked(board, 7, 5, false) &&
                        !isSquareAttacked(board, 7, 6, false)) return true;
                if (toCol == 2 && castling.contains("Q") &&
                        board[7][3] == '.' && board[7][2] == '.' && board[7][1] == '.' &&
                        !isKingInCheck(board, true) &&
                        !isSquareAttacked(board, 7, 3, false) &&
                        !isSquareAttacked(board, 7, 2, false)) return true;
            }
            if (!isWhite && fromRow == 0 && fromCol == 4) {
                if (toCol == 6 && castling.contains("k") &&
                        board[0][5] == '.' && board[0][6] == '.' &&
                        !isKingInCheck(board, false) &&
                        !isSquareAttacked(board, 0, 5, true) &&
                        !isSquareAttacked(board, 0, 6, true)) return true;
                if (toCol == 2 && castling.contains("q") &&
                        board[0][3] == '.' && board[0][2] == '.' && board[0][1] == '.' &&
                        !isKingInCheck(board, false) &&
                        !isSquareAttacked(board, 0, 3, true) &&
                        !isSquareAttacked(board, 0, 2, true)) return true;
            }
        }
        return false;
    }

    private boolean isPathClear(char[][] board, int fromRow, int fromCol, int toRow, int toCol) {
        int dr = Integer.signum(toRow - fromRow);
        int dc = Integer.signum(toCol - fromCol);
        int r = fromRow + dr, c = fromCol + dc;
        while (r != toRow || c != toCol) {
            if (board[r][c] != '.') return false;
            r += dr; c += dc;
        }
        return true;
    }

    private boolean isKingInCheck(char[][] board, boolean isWhite) {
        // Find king
        char king = isWhite ? 'K' : 'k';
        int kingRow = -1, kingCol = -1;
        outer:
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                if (board[r][c] == king) { kingRow = r; kingCol = c; break outer; }
            }
        }
        if (kingRow == -1) return false;
        return isSquareAttacked(board, kingRow, kingCol, !isWhite);
    }

    private boolean isSquareAttacked(char[][] board, int row, int col, boolean byWhite) {
        // Check all opponent pieces
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                char piece = board[r][c];
                if (piece == '.') continue;
                if (Character.isUpperCase(piece) != byWhite) continue;
                char p = Character.toUpperCase(piece);
                int dr = row - r, dc = col - c;
                boolean attacks = switch (p) {
                    case 'P' -> {
                        int dir = byWhite ? -1 : 1;
                        yield dr == dir && Math.abs(dc) == 1;
                    }
                    case 'R' -> (r == row || c == col) && isPathClear(board, r, c, row, col);
                    case 'N' -> isKnightMove(dr, dc);
                    case 'B' -> Math.abs(dr) == Math.abs(dc) && isPathClear(board, r, c, row, col);
                    case 'Q' -> ((r == row || c == col) || Math.abs(dr) == Math.abs(dc)) &&
                                isPathClear(board, r, c, row, col);
                    case 'K' -> Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
                    default -> false;
                };
                if (attacks) return true;
            }
        }
        return false;
    }

    private boolean hasAnyLegalMove(char[][] board, boolean isWhite, String fen) {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                char piece = board[r][c];
                if (piece == '.') continue;
                if (Character.isUpperCase(piece) != isWhite) continue;
                for (int tr = 0; tr < 8; tr++) {
                    for (int tc = 0; tc < 8; tc++) {
                        if (r == tr && c == tc) continue;
                        if (isLegalMove(board, r, c, tr, tc, isWhite, fen)) return true;
                    }
                }
            }
        }
        return false;
    }

    private String updateCastlingRights(String castling, int fromRow, int fromCol,
                                         int toRow, int toCol, char piece) {
        if (castling.equals("-")) return castling;
        StringBuilder sb = new StringBuilder(castling);
        char p = Character.toUpperCase(piece);
        if (p == 'K') {
            if (Character.isUpperCase(piece)) { // white king
                sb = new StringBuilder(sb.toString().replace("K", "").replace("Q", ""));
            } else {
                sb = new StringBuilder(sb.toString().replace("k", "").replace("q", ""));
            }
        }
        if (p == 'R') {
            if (fromRow == 7 && fromCol == 7) sb = new StringBuilder(sb.toString().replace("K", ""));
            if (fromRow == 7 && fromCol == 0) sb = new StringBuilder(sb.toString().replace("Q", ""));
            if (fromRow == 0 && fromCol == 7) sb = new StringBuilder(sb.toString().replace("k", ""));
            if (fromRow == 0 && fromCol == 0) sb = new StringBuilder(sb.toString().replace("q", ""));
        }
        // Rook captured
        if (toRow == 7 && toCol == 7) sb = new StringBuilder(sb.toString().replace("K", ""));
        if (toRow == 7 && toCol == 0) sb = new StringBuilder(sb.toString().replace("Q", ""));
        if (toRow == 0 && toCol == 7) sb = new StringBuilder(sb.toString().replace("k", ""));
        if (toRow == 0 && toCol == 0) sb = new StringBuilder(sb.toString().replace("q", ""));
        return sb.length() == 0 ? "-" : sb.toString();
    }
}
