// ======================== CHESS RENDERER ======================== //

const CHESS_UNICODE = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const CHESS_PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9 };

function initChessBoard(flipped) {
    if (!el.chessBoard) return;
    const wasFlipped = el.chessBoard.dataset.flipped === 'true';
    if (el.chessBoard.children.length === 64 && wasFlipped === !!flipped) return; // already built with same perspective
    el.chessBoard.innerHTML = '';
    el.chessBoard.dataset.flipped = !!flipped;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const row = flipped ? 7 - i : i;
            const col = flipped ? 7 - j : j;
            const sq = document.createElement('div');
            sq.className = 'chess-square ' + ((row + col) % 2 === 0 ? 'chess-light' : 'chess-dark');
            sq.dataset.row = row;
            sq.dataset.col = col;
            sq.addEventListener('click', handleChessSquareClick);
            el.chessBoard.appendChild(sq);
        }
    }
}

function parseFen(fen) {
    // Returns 8x8 array of piece chars (uppercase=white, lowercase=black) or null
    const board = [];
    const rows = fen.split(' ')[0].split('/');
    for (let r = 0; r < 8; r++) {
        const row = [];
        for (const ch of rows[r]) {
            if (ch >= '1' && ch <= '8') {
                for (let i = 0; i < parseInt(ch); i++) row.push(null);
            } else {
                row.push(ch);
            }
        }
        board.push(row);
    }
    return board;
}

function fenActiveColor(fen) {
    const parts = fen.split(' ');
    return parts[1] || 'w'; // 'w' or 'b'
}

function computeCaptured(fen) {
    const board = parseFen(fen);
    const startPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const onBoard = { white: {}, black: {} };
    for (const row of board) {
        for (const p of row) {
            if (!p) continue;
            const side = p === p.toUpperCase() ? 'white' : 'black';
            const key = p.toLowerCase();
            onBoard[side][key] = (onBoard[side][key] || 0) + 1;
        }
    }
    const capturedByWhite = []; // black pieces captured by white
    const capturedByBlack = []; // white pieces captured by black
    for (const [piece, count] of Object.entries(startPieces)) {
        const missingBlack = count - (onBoard.black[piece] || 0);
        for (let i = 0; i < missingBlack; i++) capturedByWhite.push(piece);
        const missingWhite = count - (onBoard.white[piece] || 0);
        for (let i = 0; i < missingWhite; i++) capturedByBlack.push(piece);
    }
    return { capturedByWhite, capturedByBlack };
}

function renderChess(gameState) {
    if (!el.chessBoard) return;
    const details = gameState.details || {};
    const fen = details.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const board = parseFen(fen);
    const activeColor = fenActiveColor(fen);
    const currentPlayerId = details.currentPlayerId;
    const whitePlayerId = details.whitePlayerId;
    const blackPlayerId = details.blackPlayerId;
    const isMyTurn = state.player && currentPlayerId === state.player.id;
    const myColor = state.player && whitePlayerId === state.player.id ? 'white'
                  : state.player && blackPlayerId === state.player.id ? 'black' : null;

    const flipped = myColor === 'black';
    initChessBoard(flipped);

    // Show color badge
    if (myColor && el.chessMyColorBadge) {
        el.chessMyColorBadge.style.display = 'inline-flex';
        el.chessMyColorText.textContent = myColor.toUpperCase();
        el.chessMyColorText.style.color = myColor === 'white' ? '#f0d9b5' : '#b58863';
    }

    // Turn indicator
    if (el.chessTurnIndicator) {
        if (gameState.status === 'FINISHED') {
            const winnerId = gameState.winner;
            const winnerName = (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[winnerId])
                || (winnerId === (state.player && state.player.id) ? state.player.username : winnerId);
            el.chessTurnIndicator.textContent = winnerId
                ? `🏆 ${winnerId === (state.player && state.player.id) ? 'You Won!' : 'Winner: ' + escapeHtml(winnerName)}`
                : '🏁 Game Finished';
            el.chessTurnIndicator.style.color = 'var(--success)';
        } else if (gameState.status === 'DRAW') {
            el.chessTurnIndicator.textContent = '🤝 Game ended in a draw!' + (details.drawReason ? ' (' + details.drawReason + ')' : '');
            el.chessTurnIndicator.style.color = 'var(--warning)';
        } else if (gameState.status === 'IN_PROGRESS') {
            if (details.isCheckmate) {
                el.chessTurnIndicator.textContent = '♟ Checkmate!';
                el.chessTurnIndicator.style.color = 'var(--danger)';
            } else if (details.isCheck) {
                el.chessTurnIndicator.textContent = isMyTurn ? '⚠️ You are in Check! Move your King.' : '⚠️ Opponent is in Check!';
                el.chessTurnIndicator.style.color = 'var(--danger)';
            } else if (isMyTurn) {
                el.chessTurnIndicator.textContent = `♟ Your Turn (${myColor === 'white' ? '⬜ White' : '⬛ Black'})`;
                el.chessTurnIndicator.style.color = 'var(--primary)';
            } else {
                el.chessTurnIndicator.textContent = `⏳ Opponent's Turn...`;
                el.chessTurnIndicator.style.color = 'var(--text-muted)';
            }
        }
    }

    // Render squares
    const squares = el.chessBoard.querySelectorAll('.chess-square');
    squares.forEach(sq => {
        const r = parseInt(sq.dataset.row);
        const c = parseInt(sq.dataset.col);
        const piece = board[r] && board[r][c];
        sq.innerHTML = '';
        sq.classList.remove('chess-selected', 'chess-valid-move', 'chess-last-move', 'chess-in-check', 'chess-capturable');

        if (piece) {
            const span = document.createElement('span');
            span.className = 'chess-piece ' + (piece === piece.toUpperCase() ? 'chess-piece-white' : 'chess-piece-black');
            span.textContent = CHESS_UNICODE[piece] || piece;
            sq.appendChild(span);
        }

        // Highlight selected
        if (state.chessSelectedSquare && state.chessSelectedSquare[0] === r && state.chessSelectedSquare[1] === c) {
            sq.classList.add('chess-selected');
        }

        // Highlight valid moves
        const isValidDest = state.chessValidMoves.some(m => m[0] === r && m[1] === c);
        if (isValidDest) {
            sq.classList.add(piece ? 'chess-capturable' : 'chess-valid-move');
        }
    });

    // Highlight king in check
    if (details.isCheck && gameState.status === 'IN_PROGRESS') {
        const kingChar = activeColor === 'w' ? 'K' : 'k';
        squares.forEach(sq => {
            const r = parseInt(sq.dataset.row);
            const c = parseInt(sq.dataset.col);
            if (board[r] && board[r][c] === kingChar) {
                sq.classList.add('chess-in-check');
            }
        });
    }

    // Captured pieces
    const { capturedByWhite, capturedByBlack } = computeCaptured(fen);
    if (el.chessCapturedWhitePieces) {
        el.chessCapturedWhitePieces.textContent = capturedByWhite.map(p => CHESS_UNICODE[p]).join(' ') || '—';
    }
    if (el.chessCapturedBlackPieces) {
        el.chessCapturedBlackPieces.textContent = capturedByBlack.map(p => CHESS_UNICODE[p.toUpperCase()]).join(' ') || '—';
    }

    // Move history
    if (el.chessMoveList && details.moveHistory) {
        const moves = details.moveHistory;
        let html = '';
        for (let i = 0; i < moves.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            const white = moves[i] || '';
            const black = moves[i + 1] || '';
            html += `<div class="chess-move-row"><span class="chess-move-num">${moveNum}.</span><span class="chess-move-white">${escapeHtml(white)}</span><span class="chess-move-black">${escapeHtml(black)}</span></div>`;
        }
        el.chessMoveList.innerHTML = html;
        el.chessMoveList.scrollTop = el.chessMoveList.scrollHeight;
    }
}

function handleChessSquareClick(e) {
    if (state.isSpectator) return;
    const gameState = state.currentGameState;
    if (!gameState || gameState.status !== 'IN_PROGRESS') return;
    const details = gameState.details || {};
    if (details.currentPlayerId !== (state.player && state.player.id)) return;

    const sq = e.currentTarget;
    const r = parseInt(sq.dataset.row);
    const c = parseInt(sq.dataset.col);
    const fen = details.fen || '';
    const board = parseFen(fen);
    const piece = board[r] && board[r][c];
    const myColor = details.whitePlayerId === state.player.id ? 'white' : 'black';
    const isMyPiece = piece && (myColor === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase());

    if (state.chessSelectedSquare) {
        const [selR, selC] = state.chessSelectedSquare;
        const isValidDest = state.chessValidMoves.some(m => m[0] === r && m[1] === c);

        if (isValidDest) {
            // Check for pawn promotion
            const movingPiece = board[selR][selC];
            const isPromotion = (movingPiece === 'P' && r === 0) || (movingPiece === 'p' && r === 7);
            if (isPromotion) {
                showChessPromotionModal(selR, selC, r, c, myColor);
            } else {
                sendChessMove(selR, selC, r, c, null);
            }
            state.chessSelectedSquare = null;
            state.chessValidMoves = [];
            renderChess(gameState);
            return;
        }

        // Re-select own piece
        if (isMyPiece) {
            state.chessSelectedSquare = [r, c];
            state.chessValidMoves = computeClientValidMoves(board, r, c, myColor, fen);
            renderChess(gameState);
            return;
        }

        // Deselect
        state.chessSelectedSquare = null;
        state.chessValidMoves = [];
        renderChess(gameState);
        return;
    }

    if (isMyPiece) {
        state.chessSelectedSquare = [r, c];
        state.chessValidMoves = computeClientValidMoves(board, r, c, myColor, fen);
        renderChess(gameState);
    }
}

function computeClientValidMoves(board, r, c, myColor, fen) {
    // Client-side move hints (not authoritative — server validates)
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const isWhite = piece === piece.toUpperCase();
    const type = piece.toLowerCase();
    const dir = isWhite ? -1 : 1;

    const inBounds = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;
    const isEnemy = (row, col) => {
        const p = board[row][col];
        return p && (isWhite ? p === p.toLowerCase() : p === p.toUpperCase());
    };
    const isEmpty = (row, col) => inBounds(row, col) && !board[row][col];
    const isEmptyOrEnemy = (row, col) => inBounds(row, col) && (!board[row][col] || isEnemy(row, col));

    const slide = (dr, dc) => {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
            if (!board[nr][nc]) { moves.push([nr, nc]); }
            else { if (isEnemy(nr, nc)) moves.push([nr, nc]); break; }
            nr += dr; nc += dc;
        }
    };

    if (type === 'p') {
        if (isEmpty(r + dir, c)) {
            moves.push([r + dir, c]);
            const startRow = isWhite ? 6 : 1;
            if (r === startRow && isEmpty(r + 2 * dir, c)) moves.push([r + 2 * dir, c]);
        }
        if (inBounds(r + dir, c - 1) && isEnemy(r + dir, c - 1)) moves.push([r + dir, c - 1]);
        if (inBounds(r + dir, c + 1) && isEnemy(r + dir, c + 1)) moves.push([r + dir, c + 1]);
        // En passant hint from FEN
        const epField = fen.split(' ')[3];
        if (epField && epField !== '-') {
            const epCol = epField.charCodeAt(0) - 'a'.charCodeAt(0);
            const epRow = 8 - parseInt(epField[1]);
            if (r + dir === epRow && Math.abs(c - epCol) === 1) moves.push([epRow, epCol]);
        }
    } else if (type === 'n') {
        [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => {
            if (isEmptyOrEnemy(r+dr, c+dc)) moves.push([r+dr, c+dc]);
        });
    } else if (type === 'b') {
        [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => slide(dr,dc));
    } else if (type === 'r') {
        [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => slide(dr,dc));
    } else if (type === 'q') {
        [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => slide(dr,dc));
    } else if (type === 'k') {
        [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => {
            if (isEmptyOrEnemy(r+dr, c+dc)) moves.push([r+dr, c+dc]);
        });
        // Castling hints from FEN
        const castling = fen.split(' ')[2] || '';
        if (isWhite && r === 7 && c === 4) {
            if (castling.includes('K') && !board[7][5] && !board[7][6]) moves.push([7, 6]);
            if (castling.includes('Q') && !board[7][3] && !board[7][2] && !board[7][1]) moves.push([7, 2]);
        }
        if (!isWhite && r === 0 && c === 4) {
            if (castling.includes('k') && !board[0][5] && !board[0][6]) moves.push([0, 6]);
            if (castling.includes('q') && !board[0][3] && !board[0][2] && !board[0][1]) moves.push([0, 2]);
        }
    }
    return moves;
}

function showChessPromotionModal(fromR, fromC, toR, toC, myColor) {
    if (!el.chessPromotionModal) return;
    const pieces = myColor === 'white' ? ['Q','R','B','N'] : ['q','r','b','n'];
    el.chessPromotionChoices.innerHTML = pieces.map(p =>
        `<button class="chess-promo-btn" data-piece="${p}">${CHESS_UNICODE[p]}</button>`
    ).join('');
    el.chessPromotionChoices.querySelectorAll('.chess-promo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            el.chessPromotionModal.style.display = 'none';
            sendChessMove(fromR, fromC, toR, toC, btn.dataset.piece.toLowerCase());
        });
    });
    el.chessPromotionModal.style.display = 'flex';
}

function sendChessMove(fromR, fromC, toR, toC, promotion) {
    const files = 'abcdefgh';
    const fromSq = files[fromC] + (8 - fromR);
    const toSq = files[toC] + (8 - toR);
    const action = { action: 'MOVE', from: fromSq, to: toSq };
    if (promotion) action.promotion = promotion;
    sendGameAction(action);
}

