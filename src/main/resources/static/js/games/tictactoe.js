// ======================== TIC-TAC-TOE RENDERER ======================== //
function renderTicTacToe(gameState) {
    const details = gameState.details || gameState;
    const board = details.board;
    const currentTurn = details.currentPlayerId;
    const marks = details.playerMarks || {};
    const winLine = details.winningLine;
    // Update Turn Indicator
    if (gameState.status === 'FINISHED') {
        const winnerName = (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[gameState.winner])
            || (gameState.winner === state.player.id ? state.player.username : gameState.winner);
        el.tttTurnIndicator.textContent = gameState.winner
            ? `🏆 ${gameState.winner === state.player.id ? 'You Won!' : 'Winner: ' + escapeHtml(winnerName)}`
            : 'Game Finished';
        el.tttTurnIndicator.style.color = 'var(--success)';
    } else if (gameState.status === 'DRAW') {
        el.tttTurnIndicator.textContent = '🤝 Game Ended in a Draw!';
        el.tttTurnIndicator.style.color = 'var(--warning)';
    } else if (gameState.status === 'WAITING' || gameState.status === 'READY' || (state.currentRoom && state.currentRoom.status !== 'IN_PROGRESS')) {
        el.tttTurnIndicator.textContent = (state.currentRoom && state.currentRoom.status === 'READY')
            ? '⚡ Ready! Host can start the game'
            : '⏳ Waiting for players to join...';
        el.tttTurnIndicator.style.color = 'var(--text-muted)';
    } else {
        const isMyTurn = currentTurn === state.player.id;
        const myMark = marks[state.player.id] || '?';
        el.tttTurnIndicator.textContent = isMyTurn ? `Your Turn (${myMark})` : `Opponent's Turn...`;
        el.tttTurnIndicator.style.color = isMyTurn ? 'var(--primary)' : 'var(--text-muted)';
    }
    // Render 3x3 Grid
    const cells = el.tttGrid.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const mark = (board && board[r]) ? board[r][c] : '';
        cell.textContent = mark;
        cell.className = 'ttt-cell';
        if (mark) {
            cell.classList.add('occupied', `mark-${mark}`);
        }
        if (winLine && winLine.some(pt => pt[0] === r && pt[1] === c)) {
            cell.classList.add('win-cell');
        }
    });
}
