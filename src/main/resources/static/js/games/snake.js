// ======================== SNAKE AND LADDER RENDERER ======================== //

let snakeCtx = null;
let snakeTokenPositions = {}; // playerId -> { x, y, currentPos }
let isSnakeAnimating = false;
let currentSnakeTheme = localStorage.getItem('snake_board_theme') || 'classic';

// ======================== 5 BOARD TEMPLATES / THEMES ======================== //

const SNAKE_TEMPLATES = {
    classic: {
        id: 'classic',
        name: 'Classic Royal',
        frameBg: '#1e130c',
        frameBorder: '#b45309',
        cornerAccent: '#f59e0b',
        tileA: ['#ffffff', '#f8fafc'],
        tileB: ['#f4ede2', '#e9decb'],
        gridColor: '#cbd5e1',
        textStyle: '#5c4838',
        textFont: '600 11px Inter, Georgia, sans-serif',
        tile1: { bg: ['#dcfce7', '#bbf7d0'], border: '#15803d', label: 'START 1', icon: '▶' },
        tile100: { bg: ['#fef08a', '#f59e0b'], border: '#b45309', label: 'GOAL 100', icon: '👑' },
        ladder: {
            type: 'mahogany',
            rail: '#78350f',
            railHighlight: '#fde047',
            rung: '#b45309',
            rungCap: '#fde047'
        },
        species: [
            { name: 'Eastern Diamondback', dorsalDark: '#3e2723', dorsalMain: '#6d4c41', dorsalLight: '#a1887f', belly: '#f5f5dc', spots: '#271610', spotBorder: '#fff8e1', eyeColor: '#ffb300', tongue: '#e53935', pattern: 'diamond' },
            { name: 'Emerald Tree Boa', dorsalDark: '#064e3b', dorsalMain: '#059669', dorsalLight: '#34d399', belly: '#fef08a', spots: '#ffffff', spotBorder: '#022c22', eyeColor: '#facc15', tongue: '#dc2626', pattern: 'lightning' },
            { name: 'Scarlet Coral Snake', dorsalDark: '#7f1d1d', dorsalMain: '#dc2626', dorsalLight: '#f87171', belly: '#fee2e2', spots: '#0f172a', spotBorder: '#fbbf24', eyeColor: '#fbbf24', tongue: '#b91c1c', pattern: 'bands' },
            { name: 'Royal Golden Python', dorsalDark: '#78350f', dorsalMain: '#d97706', dorsalLight: '#fcd34d', belly: '#fef3c7', spots: '#451a03', spotBorder: '#fef08a', eyeColor: '#f59e0b', tongue: '#ef4444', pattern: 'rosette' },
            { name: 'Blue Pit Viper', dorsalDark: '#075985', dorsalMain: '#0284c7', dorsalLight: '#38bdf8', belly: '#bae6fd', spots: '#082f49', spotBorder: '#e0f2fe', eyeColor: '#f43f5e', tongue: '#e11d48', pattern: 'viper' },
            { name: 'Black King Cobra', dorsalDark: '#0f172a', dorsalMain: '#1e293b', dorsalLight: '#475569', belly: '#94a3b8', spots: '#cbd5e1', spotBorder: '#334155', eyeColor: '#f59e0b', tongue: '#ef4444', pattern: 'chevron' }
        ]
    },
    jungle: {
        id: 'jungle',
        name: 'Jungle Safari',
        frameBg: '#052e16',
        frameBorder: '#16a34a',
        cornerAccent: '#4ade80',
        tileA: ['#f0fdf4', '#dcfce7'],
        tileB: ['#bbf7d0', '#86efac'],
        gridColor: '#4ade80',
        textStyle: '#14532d',
        textFont: '700 11px Inter, sans-serif',
        tile1: { bg: ['#86efac', '#22c55e'], border: '#14532d', label: 'CAMP 1', icon: '🏕️' },
        tile100: { bg: ['#fef08a', '#eab308'], border: '#854d0e', label: 'TEMPLE 100', icon: '🏆' },
        ladder: {
            type: 'bamboo',
            rail: '#3f6212',
            railHighlight: '#bef264',
            rung: '#65a30d',
            rungCap: '#a3e635'
        },
        species: [
            { name: 'Amazonian Green Boa', dorsalDark: '#064e3b', dorsalMain: '#10b981', dorsalLight: '#6ee7b7', belly: '#fef08a', spots: '#ecfdf5', spotBorder: '#022c22', eyeColor: '#fde047', tongue: '#dc2626', pattern: 'lightning' },
            { name: 'Crimson Rainforest Viper', dorsalDark: '#881337', dorsalMain: '#e11d48', dorsalLight: '#fb7185', belly: '#ffe4e6', spots: '#4c0519', spotBorder: '#fbcfe8', eyeColor: '#fbbf24', tongue: '#9f1239', pattern: 'diamond' },
            { name: 'Yellow-Lipped Tree Viper', dorsalDark: '#713f12', dorsalMain: '#eab308', dorsalLight: '#fde047', belly: '#fef9c3', spots: '#422006', spotBorder: '#fef08a', eyeColor: '#ef4444', tongue: '#dc2626', pattern: 'rosette' },
            { name: 'Jungle Tiger Python', dorsalDark: '#78350f', dorsalMain: '#ea580c', dorsalLight: '#fdba74', belly: '#ffedd5', spots: '#431407', spotBorder: '#fed7aa', eyeColor: '#facc15', tongue: '#ea580c', pattern: 'bands' },
            { name: 'Emerald Bush Viper', dorsalDark: '#022c22', dorsalMain: '#059669', dorsalLight: '#34d399', belly: '#a7f3d0', spots: '#064e3b', spotBorder: '#d1fae5', eyeColor: '#f43f5e', tongue: '#e11d48', pattern: 'viper' },
            { name: 'Night Stalker Krait', dorsalDark: '#020617', dorsalMain: '#0f172a', dorsalLight: '#334155', belly: '#64748b', spots: '#f1f5f9', spotBorder: '#94a3b8', eyeColor: '#eab308', tongue: '#ef4444', pattern: 'chevron' }
        ]
    },
    neon: {
        id: 'neon',
        name: 'Neon Cyber',
        frameBg: '#090d16',
        frameBorder: '#06b6d4',
        cornerAccent: '#ec4899',
        tileA: ['#0f172a', '#1e293b'],
        tileB: ['#0b1120', '#151e33'],
        gridColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: '#38bdf8',
        textFont: 'bold 11px "Courier New", monospace',
        tile1: { bg: ['#064e3b', '#059669'], border: '#34d399', label: 'NODE 1', icon: '⚡' },
        tile100: { bg: ['#581c87', '#9333ea'], border: '#c084fc', label: 'CORE 100', icon: '👑' },
        ladder: {
            type: 'cyber',
            rail: '#0284c7',
            railHighlight: '#38bdf8',
            rung: '#ec4899',
            rungCap: '#06b6d4'
        },
        species: [
            { name: 'Plasma Cyan Wyrm', dorsalDark: '#083344', dorsalMain: '#06b6d4', dorsalLight: '#67e8f9', belly: '#cffafe', spots: '#ec4899', spotBorder: '#f472b6', eyeColor: '#f43f5e', tongue: '#ec4899', pattern: 'lightning' },
            { name: 'Synthwave Magenta Cobra', dorsalDark: '#4a044e', dorsalMain: '#d946ef', dorsalLight: '#f0abfc', belly: '#fae8ff', spots: '#06b6d4', spotBorder: '#67e8f9', eyeColor: '#38bdf8', tongue: '#06b6d4', pattern: 'diamond' },
            { name: 'Neon Electric Viper', dorsalDark: '#14532d', dorsalMain: '#22c55e', dorsalLight: '#86efac', belly: '#dcfce7', spots: '#facc15', spotBorder: '#fef08a', eyeColor: '#f43f5e', tongue: '#e11d48', pattern: 'bands' },
            { name: 'Quantum Violet Python', dorsalDark: '#3b0764', dorsalMain: '#9333ea', dorsalLight: '#c084fc', belly: '#f3e8ff', spots: '#38bdf8', spotBorder: '#a5f3fc', eyeColor: '#facc15', tongue: '#06b6d4', pattern: 'rosette' },
            { name: 'Laser Amber Serpent', dorsalDark: '#7c2d12', dorsalMain: '#f97316', dorsalLight: '#fdba74', belly: '#ffedd5', spots: '#06b6d4', spotBorder: '#e0f2fe', eyeColor: '#38bdf8', tongue: '#38bdf8', pattern: 'viper' },
            { name: 'Dark Net Stalker', dorsalDark: '#020617', dorsalMain: '#1e1b4b', dorsalLight: '#4338ca', belly: '#818cf8', spots: '#f43f5e', spotBorder: '#fda4af', eyeColor: '#06b6d4', tongue: '#f43f5e', pattern: 'chevron' }
        ]
    },
    desert: {
        id: 'desert',
        name: 'Desert Oasis',
        frameBg: '#27170a',
        frameBorder: '#d97706',
        cornerAccent: '#fbbf24',
        tileA: ['#fffbeb', '#fef3c7'],
        tileB: ['#fde68a', '#fcd34d'],
        gridColor: '#d97706',
        textStyle: '#78350f',
        textFont: '600 11px Georgia, serif',
        tile1: { bg: ['#ecfdf5', '#a7f3d0'], border: '#059669', label: 'OASIS 1', icon: '🌴' },
        tile100: { bg: ['#f59e0b', '#b45309'], border: '#78350f', label: 'PYRAMID 100', icon: '👑' },
        ladder: {
            type: 'gilded',
            rail: '#92400e',
            railHighlight: '#fde047',
            rung: '#d97706',
            rungCap: '#fbbf24'
        },
        species: [
            { name: 'Saharan Horned Asp', dorsalDark: '#451a03', dorsalMain: '#b45309', dorsalLight: '#fde047', belly: '#fef3c7', spots: '#78350f', spotBorder: '#fef9c3', eyeColor: '#dc2626', tongue: '#b91c1c', pattern: 'diamond' },
            { name: 'Gilded Egyptian Cobra', dorsalDark: '#78350f', dorsalMain: '#d97706', dorsalLight: '#fcd34d', belly: '#fffbeb', spots: '#0f172a', spotBorder: '#fef08a', eyeColor: '#ef4444', tongue: '#dc2626', pattern: 'chevron' },
            { name: 'Sunfire Desert Viper', dorsalDark: '#7c2d12', dorsalMain: '#ea580c', dorsalLight: '#fdba74', belly: '#ffedd5', spots: '#431407', spotBorder: '#fef08a', eyeColor: '#eab308', tongue: '#b91c1c', pattern: 'bands' },
            { name: 'Dune Sand Boa', dorsalDark: '#713f12', dorsalMain: '#ca8a04', dorsalLight: '#facc15', belly: '#fef9c3', spots: '#3e2723', spotBorder: '#fffde7', eyeColor: '#dc2626', tongue: '#ea580c', pattern: 'rosette' },
            { name: 'Red Sea Coral Snake', dorsalDark: '#881337', dorsalMain: '#e11d48', dorsalLight: '#fda4af', belly: '#ffe4e6', spots: '#0f172a', spotBorder: '#fde047', eyeColor: '#facc15', tongue: '#9f1239', pattern: 'bands' },
            { name: 'Terracotta Sidewinder', dorsalDark: '#5c1d11', dorsalMain: '#c2410c', dorsalLight: '#fb923c', belly: '#ffedd5', spots: '#431407', spotBorder: '#fed7aa', eyeColor: '#fde047', tongue: '#991b1b', pattern: 'viper' }
        ]
    },
    frost: {
        id: 'frost',
        name: 'Arctic Frost',
        frameBg: '#082f49',
        frameBorder: '#38bdf8',
        cornerAccent: '#bae6fd',
        tileA: ['#f0f9ff', '#e0f2fe'],
        tileB: ['#bae6fd', '#7dd3fc'],
        gridColor: '#0284c7',
        textStyle: '#0369a1',
        textFont: '700 11px Inter, sans-serif',
        tile1: { bg: ['#dbeafe', '#93c5fd'], border: '#2563eb', label: 'BASE 1', icon: '❄️' },
        tile100: { bg: ['#fef9c3', '#fde047'], border: '#ca8a04', label: 'PEAK 100', icon: '👑' },
        ladder: {
            type: 'steel',
            rail: '#0369a1',
            railHighlight: '#e0f2fe',
            rung: '#0284c7',
            rungCap: '#e0f2fe'
        },
        species: [
            { name: 'Arctic Diamond Viper', dorsalDark: '#0c4a6e', dorsalMain: '#0284c7', dorsalLight: '#bae6fd', belly: '#f0f9ff', spots: '#ffffff', spotBorder: '#0369a1', eyeColor: '#f43f5e', tongue: '#e11d48', pattern: 'diamond' },
            { name: 'Glacial Ice Wyrm', dorsalDark: '#1e1b4b', dorsalMain: '#6366f1', dorsalLight: '#a5b4fc', belly: '#e0e7ff', spots: '#38bdf8', spotBorder: '#e0f2fe', eyeColor: '#facc15', tongue: '#ec4899', pattern: 'lightning' },
            { name: 'Frostbite White Cobra', dorsalDark: '#334155', dorsalMain: '#94a3b8', dorsalLight: '#f1f5f9', belly: '#ffffff', spots: '#0284c7', spotBorder: '#7dd3fc', eyeColor: '#38bdf8', tongue: '#0284c7', pattern: 'chevron' },
            { name: 'Aurora Sky Serpent', dorsalDark: '#064e3b', dorsalMain: '#10b981', dorsalLight: '#67e8f9', belly: '#cffafe', spots: '#ec4899', spotBorder: '#f472b6', eyeColor: '#fbbf24', tongue: '#f43f5e', pattern: 'bands' },
            { name: 'Deep Blizzard Python', dorsalDark: '#0f172a', dorsalMain: '#38bdf8', dorsalLight: '#e0f2fe', belly: '#f8fafc', spots: '#0369a1', spotBorder: '#bae6fd', eyeColor: '#f43f5e', tongue: '#ef4444', pattern: 'rosette' },
            { name: 'Crystal Blue Viper', dorsalDark: '#075985', dorsalMain: '#0ea5e9', dorsalLight: '#7dd3fc', belly: '#e0f2fe', spots: '#ffffff', spotBorder: '#0284c7', eyeColor: '#fbbf24', tongue: '#e11d48', pattern: 'viper' }
        ]
    }
};

function setSnakeBoardTheme(themeName) {
    if (!SNAKE_TEMPLATES[themeName]) return;
    currentSnakeTheme = themeName;
    localStorage.setItem('snake_board_theme', themeName);

    if (el.snakeThemeSelector) {
        el.snakeThemeSelector.querySelectorAll('.theme-pill').forEach(btn => {
            if (btn.dataset.theme === themeName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    const currentGState = state.currentGameState || (state.currentRoom ? state.currentRoom.gameStateSummary : null);
    drawSnakeLudoBoard(currentGState ? currentGState.details : null);
}

function initSnakeCanvas() {
    if (!el.snakeCanvas) return;
    const canvas = el.snakeCanvas;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 600 * dpr;
    canvas.height = 600 * dpr;
    canvas.style.width = '600px';
    canvas.style.height = '600px';
    snakeCtx = canvas.getContext('2d');
    snakeCtx.scale(dpr, dpr);

    if (el.snakeThemeSelector) {
        el.snakeThemeSelector.querySelectorAll('.theme-pill').forEach(btn => {
            if (btn.dataset.theme === currentSnakeTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    const currentGState = state.currentGameState || (state.currentRoom ? state.currentRoom.gameStateSummary : null);
    drawSnakeLudoBoard(currentGState ? currentGState.details : null);
}

function getSnakeLudoCellCenter(num) {
    if (num < 1) num = 1;
    if (num > 100) num = 100;
    const r = Math.floor((num - 1) / 10); // 0 (bottom) .. 9 (top)
    let c = (num - 1) % 10;
    if (r % 2 === 1) {
        c = 9 - c; // zigzag
    }
    const cs = 60;
    return {
        x: c * cs + cs / 2,
        y: (9 - r) * cs + cs / 2,
        left: c * cs,
        top: (9 - r) * cs,
        row: r,
        col: c
    };
}

function getSnakeLudoPosition(pos) {
    if (pos === 0) {
        return { x: 30, y: 570 }; // Staging area
    }
    return getSnakeLudoCellCenter(pos);
}

function getSnakeControlPoints(headTile, tailTile) {
    const pHead = getSnakeLudoCellCenter(headTile);
    const pTail = getSnakeLudoCellCenter(tailTile);
    const dx = pTail.x - pHead.x;
    const dy = pTail.y - pHead.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;

    // Organic S-curve sinuous wave control points
    const side = (headTile % 2 === 0) ? 1 : -1;
    const curveAmp1 = Math.min(48, Math.max(22, dist * 0.28)) * side;
    const curveAmp2 = Math.min(42, Math.max(18, dist * 0.22)) * -side;

    const cp1 = { x: pHead.x + dx * 0.35 + nx * curveAmp1, y: pHead.y + dy * 0.35 + ny * curveAmp1 };
    const cp2 = { x: pHead.x + dx * 0.70 + nx * curveAmp2, y: pHead.y + dy * 0.70 + ny * curveAmp2 };
    return { pHead, cp1, cp2, pTail };
}

function getSnakeBezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    return { x, y };
}

function runAnimation(duration, onUpdate, onComplete) {
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        onUpdate(progress);
        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            if (onComplete) onComplete();
        }
    }
    requestAnimationFrame(tick);
}

function updateSnakeUI(gameState) {
    const details = gameState.details || gameState;
    const players = details.players || {};
    const isMyTurn = details.currentPlayerId === state.player.id;
    const currPlayer = players[details.currentPlayerId];
    const currName = currPlayer ? currPlayer.username : 'Player';
    const myData = state.player && players[state.player.id];
    const isFinishedMe = myData && myData.position >= 100;

    if (gameState.status === 'FINISHED') {
        const winnerName = (gameState.winner && players[gameState.winner]) ? players[gameState.winner].username : gameState.winner;
        el.snakeTurnIndicator.textContent = gameState.winner 
            ? `🏆 ${gameState.winner === state.player.id ? 'You Won!' : 'Winner: ' + winnerName}`
            : 'Match Finished';
        el.snakeTurnIndicator.style.color = 'var(--success)';
        el.snakeRollDiceBtn.disabled = true;
    } else if (gameState.status === 'WAITING' || gameState.status === 'READY' || (state.currentRoom && state.currentRoom.status !== 'IN_PROGRESS')) {
        el.snakeTurnIndicator.textContent = (state.currentRoom && state.currentRoom.status === 'READY')
            ? '⚡ Ready! Host can start the game'
            : '⏳ Waiting for players to join...';
        el.snakeTurnIndicator.style.color = 'var(--text-muted)';
        el.snakeRollDiceBtn.disabled = true;
    } else if (isFinishedMe) {
        const myRank = myData.rank > 0 ? ` (Rank #${myData.rank})` : '';
        el.snakeTurnIndicator.textContent = `🎉 You finished${myRank}! Spectating match...`;
        el.snakeTurnIndicator.style.color = 'var(--success)';
        el.snakeRollDiceBtn.disabled = true;
    } else {
        el.snakeTurnIndicator.textContent = isMyTurn 
            ? `Your Turn to Roll 🎲` 
            : `${currName}'s Turn to Roll...`;
        el.snakeTurnIndicator.style.color = isMyTurn ? 'var(--primary)' : 'var(--text-muted)';
        el.snakeRollDiceBtn.disabled = !(isMyTurn && gameState.status === 'IN_PROGRESS' && !isSnakeAnimating && !isSnakeDiceRolling);
    }

    if (!isSnakeDiceRolling) {
        updateDiceFace(el.snakeDiceResultDisplay, details.lastDiceRoll, false);
    }

    // Update Scoreboard / Position cards
    const turnOrder = details.turnOrder || Object.keys(players);
    el.snakeScoreboard.innerHTML = turnOrder.map(pid => {
        const p = players[pid];
        if (!p) return '';
        const isCurrent = pid === details.currentPlayerId && gameState.status === 'IN_PROGRESS';
        const isWinner = pid === gameState.winner;
        const isMe = state.player && pid === state.player.id;
        const rankBadge = p.rank > 0 
            ? `<span style="background:rgba(245,158,11,0.2); color:#f59e0b; padding:2px 7px; border-radius:10px; font-weight:700; font-size:0.75rem; border:1px solid rgba(245,158,11,0.4);">Rank #${p.rank}</span>` 
            : '';
        return `
            <div class="snake-score-item ${isCurrent ? 'active-turn' : ''}">
                <span class="snake-score-dot" style="background-color: ${p.color}"></span>
                <span>${isMe ? '👑 You (' + escapeHtml(p.username) + ')' : escapeHtml(p.username)}: <strong>Square ${p.position}</strong></span>
                ${rankBadge}
                ${isWinner ? '<span>🏆 WINNER</span>' : ''}
                ${!p.active ? '<span style="color:var(--danger)">(LEFT)</span>' : ''}
            </div>
        `;
    }).join('');
}

async function renderSnake(gameState, events) {
    const details = gameState.details || gameState;
    if (!snakeCtx) initSnakeCanvas();

    const players = details.players || {};

    // Initialize tokens if missing
    Object.values(players).forEach(p => {
        if (!snakeTokenPositions[p.playerId]) {
            const pt = getSnakeLudoPosition(p.position);
            snakeTokenPositions[p.playerId] = { x: pt.x, y: pt.y, currentPos: p.position };
        }
    });

    // Check if there is an animated movement to perform
    let movedPid = null;
    let oldPos = 0;
    let finalPos = 0;
    let ladderEvt = null;
    let snakeEvt = null;
    let rollVal = details.lastDiceRoll || 0;

    // Identify who rolled the dice from events
    const diceEvt = events && events.find(e => e.eventType === 'DICE_ROLLED');
    if (diceEvt) {
        movedPid = diceEvt.playerId;
        rollVal = diceEvt.payload.dice;
    }

    if (events && events.length > 0) {
        ladderEvt = events.find(e => e.eventType === 'LADDER_CLIMBED');
        snakeEvt = events.find(e => e.eventType === 'SNAKE_BITTEN');
        const moveEvt = events.find(e => e.eventType === 'PLAYER_MOVED' || e.eventType === 'LADDER_CLIMBED' || e.eventType === 'SNAKE_BITTEN');
        if (moveEvt && moveEvt.playerId && players[moveEvt.playerId]) {
            movedPid = moveEvt.playerId;
            oldPos = (moveEvt.payload && moveEvt.payload.from !== undefined) 
                ? moveEvt.payload.from 
                : (snakeTokenPositions[movedPid] ? snakeTokenPositions[movedPid].currentPos : 0);
            finalPos = players[movedPid].position;
        }
    }

    if (!movedPid) {
        for (const p of Object.values(players)) {
            if (snakeTokenPositions[p.playerId] && snakeTokenPositions[p.playerId].currentPos !== p.position) {
                movedPid = p.playerId;
                oldPos = snakeTokenPositions[p.playerId].currentPos;
                finalPos = p.position;
                break;
            }
        }
    }

    // Set oldPos and finalPos if we only have movedPid from DICE_ROLLED
    if (movedPid && players[movedPid] && oldPos === 0 && finalPos === 0) {
        oldPos = snakeTokenPositions[movedPid] ? snakeTokenPositions[movedPid].currentPos : players[movedPid].position;
        finalPos = players[movedPid].position;
    }

    if (!movedPid || (oldPos === finalPos && rollVal === 0)) {
        // No animation needed
        Object.values(players).forEach(p => {
            const pt = getSnakeLudoPosition(p.position);
            snakeTokenPositions[p.playerId] = { x: pt.x, y: pt.y, currentPos: p.position };
        });
        drawSnakeLudoBoard(details);
        updateSnakeUI(gameState);
        return;
    }

    // Animate the turn!
    isSnakeAnimating = true;
    if (el.snakeRollDiceBtn) el.snakeRollDiceBtn.disabled = true;
    updateSnakeUI(gameState);

    const movingPlayer = players[movedPid];
    const rollerName = movingPlayer ? movingPlayer.username : 'Player';

    // 1. Center Dice Roll Animation
    await new Promise(resolve => {
        triggerDiceRollAnimation('SNAKE', rollerName, rollVal, resolve);
    });

    // 2. Step-by-Step Forward Animation
    let forwardTarget = finalPos;
    if (ladderEvt && ladderEvt.payload && ladderEvt.payload.from !== undefined) {
        forwardTarget = ladderEvt.payload.from;
    } else if (snakeEvt && snakeEvt.payload && snakeEvt.payload.from !== undefined) {
        forwardTarget = snakeEvt.payload.from;
    } else if (details.ladders && details.ladders[oldPos + rollVal]) {
        forwardTarget = oldPos + rollVal;
    } else if (details.snakes && details.snakes[oldPos + rollVal]) {
        forwardTarget = oldPos + rollVal;
    } else if (oldPos + rollVal <= 100) {
        forwardTarget = oldPos + rollVal;
    }

    const stepList = [];
    if (forwardTarget > oldPos) {
        for (let s = oldPos + 1; s <= forwardTarget; s++) {
            stepList.push(s);
        }
    }

    for (let i = 0; i < stepList.length; i++) {
        const fromTile = (i === 0) ? oldPos : stepList[i - 1];
        const toTile = stepList[i];
        const p1 = getSnakeLudoPosition(fromTile);
        const p2 = getSnakeLudoPosition(toTile);

        await new Promise(resolve => {
            runAnimation(240, (t) => {
                const x = p1.x + (p2.x - p1.x) * t;
                const hop = Math.sin(t * Math.PI) * 18;
                const y = p1.y + (p2.y - p1.y) * t - hop;
                snakeTokenPositions[movedPid] = { x, y, currentPos: toTile };
                drawSnakeLudoBoard(details);
            }, resolve);
        });
    }

    // Update position at end of forward steps
    snakeTokenPositions[movedPid] = { ...getSnakeLudoPosition(forwardTarget), currentPos: forwardTarget };
    drawSnakeLudoBoard(details);

    // 3. Ladder Climb or Snake Slide Transition
    if (ladderEvt || (details.ladders && details.ladders[forwardTarget])) {
        const ladderStart = forwardTarget;
        const ladderEnd = ladderEvt ? ladderEvt.payload.to : details.ladders[forwardTarget];
        await new Promise(r => setTimeout(r, 600)); // Increased wait before big move
        const pStart = getSnakeLudoPosition(ladderStart);
        const pEnd = getSnakeLudoPosition(ladderEnd);
        
        // Dynamic duration based on distance
        const dist = Math.sqrt(Math.pow(pEnd.x - pStart.x, 2) + Math.pow(pEnd.y - pStart.y, 2));
        const duration = Math.max(1200, dist * 3); // Slower for big moves

        await new Promise(resolve => {
            runAnimation(duration, (t) => {
                const x = pStart.x + (pEnd.x - pStart.x) * t;
                const y = pStart.y + (pEnd.y - pStart.y) * t;
                snakeTokenPositions[movedPid] = { x, y, currentPos: ladderEnd };
                drawSnakeLudoBoard(details);
            }, resolve);
        });
    } else if (snakeEvt || (details.snakes && details.snakes[forwardTarget])) {
        const snakeHead = forwardTarget;
        const snakeTail = snakeEvt ? snakeEvt.payload.to : details.snakes[forwardTarget];
        await new Promise(r => setTimeout(r, 600)); // Increased wait before big move
        const { pHead, cp1, cp2, pTail } = getSnakeControlPoints(snakeHead, snakeTail);

        // Dynamic duration based on distance
        const dist = Math.sqrt(Math.pow(pHead.x - pTail.x, 2) + Math.pow(pHead.y - pTail.y, 2));
        const duration = Math.max(1400, dist * 3.5); // Even slower for snakes

        await new Promise(resolve => {
            runAnimation(duration, (t) => {
                const pt = getSnakeBezierPoint(t, pHead, cp1, cp2, pTail);
                snakeTokenPositions[movedPid] = { x: pt.x, y: pt.y, currentPos: snakeTail };
                drawSnakeLudoBoard(details);
            }, resolve);
        });
    }

    // 4. Finalize position and re-enable turn
    const finalPt = getSnakeLudoPosition(finalPos);
    snakeTokenPositions[movedPid] = { x: finalPt.x, y: finalPt.y, currentPos: finalPos };
    drawSnakeLudoBoard(details);

    isSnakeAnimating = false;
    updateSnakeUI(gameState);
}

// ======================== REALISTIC BOARD DRAWING ENGINE ======================== //

function drawSnakeLudoBoard(details) {
    if (!snakeCtx) return;
    const ctx = snakeCtx;
    const w = 600;
    const h = 600;
    const cs = 60;
    const theme = SNAKE_TEMPLATES[currentSnakeTheme] || SNAKE_TEMPLATES.classic;

    ctx.clearRect(0, 0, w, h);

    // 1. Board Outer Frame & Shadow
    ctx.save();
    ctx.fillStyle = theme.frameBg;
    ctx.fillRect(0, 0, w, h);

    // Bevel frame border
    ctx.strokeStyle = theme.frameBorder;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

    // Frame Corner Brackets
    ctx.strokeStyle = theme.cornerAccent;
    ctx.lineWidth = 3;
    const cornerSize = 18;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(4, 4 + cornerSize); ctx.lineTo(4, 4); ctx.lineTo(4 + cornerSize, 4); ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(w - 4 - cornerSize, 4); ctx.lineTo(w - 4, 4); ctx.lineTo(w - 4, 4 + cornerSize); ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(4, h - 4 - cornerSize); ctx.lineTo(4, h - 4); ctx.lineTo(4 + cornerSize, h - 4); ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(w - 4 - cornerSize, h - 4); ctx.lineTo(w - 4, h - 4); ctx.lineTo(w - 4, h - 4 - cornerSize); ctx.stroke();
    ctx.restore();

    // 2. Draw 100 Grid Cells
    for (let num = 1; num <= 100; num++) {
        const cell = getSnakeLudoCellCenter(num);
        const isEven = (cell.row + cell.col) % 2 === 0;

        ctx.save();

        if (num === 1) {
            // Special Tile 1: Start Launchpad
            const g1 = ctx.createLinearGradient(cell.left, cell.top, cell.left + cs, cell.top + cs);
            g1.addColorStop(0, theme.tile1.bg[0]);
            g1.addColorStop(1, theme.tile1.bg[1]);
            ctx.fillStyle = g1;
            ctx.fillRect(cell.left, cell.top, cs, cs);

            ctx.strokeStyle = theme.tile1.border;
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.left + 1, cell.top + 1, cs - 2, cs - 2);

            ctx.fillStyle = theme.tile1.border;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${theme.tile1.icon} 1`, cell.x, cell.top + 14);
            ctx.font = '800 9px Inter, sans-serif';
            ctx.fillText('START', cell.x, cell.top + 46);
        } else if (num === 100) {
            // Special Tile 100: Grand Victory Goal
            const g100 = ctx.createRadialGradient(cell.x, cell.y, 4, cell.x, cell.y, 35);
            g100.addColorStop(0, theme.tile100.bg[0]);
            g100.addColorStop(1, theme.tile100.bg[1]);
            ctx.fillStyle = g100;
            ctx.fillRect(cell.left, cell.top, cs, cs);

            ctx.strokeStyle = theme.tile100.border;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(cell.left + 1, cell.top + 1, cs - 2, cs - 2);

            // Sunburst star rays
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
            ctx.lineWidth = 1;
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                ctx.beginPath();
                ctx.moveTo(cell.x, cell.y);
                ctx.lineTo(cell.x + Math.cos(a) * 22, cell.y + Math.sin(a) * 22);
                ctx.stroke();
            }

            ctx.fillStyle = theme.tile100.border;
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${theme.tile100.icon} 100`, cell.x, cell.top + 14);
            ctx.font = '800 9px Inter, sans-serif';
            ctx.fillText('WINNER', cell.x, cell.top + 46);
        } else {
            // Regular Checkered Tile
            const grad = ctx.createLinearGradient(cell.left, cell.top, cell.left + cs, cell.top + cs);
            if (isEven) {
                grad.addColorStop(0, theme.tileA[0]);
                grad.addColorStop(1, theme.tileA[1]);
            } else {
                grad.addColorStop(0, theme.tileB[0]);
                grad.addColorStop(1, theme.tileB[1]);
            }
            ctx.fillStyle = grad;
            ctx.fillRect(cell.left, cell.top, cs, cs);

            // Grid Border
            ctx.strokeStyle = theme.gridColor;
            ctx.lineWidth = 0.75;
            ctx.strokeRect(cell.left + 0.5, cell.top + 0.5, cs - 1, cs - 1);

            // Subtle inner bevel highlight on top/left
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.moveTo(cell.left + 1, cell.top + cs - 1);
            ctx.lineTo(cell.left + 1, cell.top + 1);
            ctx.lineTo(cell.left + cs - 1, cell.top + 1);
            ctx.stroke();

            // Cell Number
            ctx.fillStyle = theme.textStyle;
            ctx.font = theme.textFont;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(num.toString(), cell.left + 4, cell.top + 4);
        }

        ctx.restore();
    }

    const ladders = (details && details.ladders) ? details.ladders : {
        4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91
    };

    const snakes = (details && details.snakes) ? details.snakes : {
        17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78
    };

    // 3. Draw Themed Realistic Ladders
    Object.entries(ladders).forEach(([start, end]) => {
        const p1 = getSnakeLudoCellCenter(parseInt(start));
        const p2 = getSnakeLudoCellCenter(parseInt(end));
        drawRealisticLadder(ctx, p1, p2, theme.ladder, theme.id);
    });

    // 4. Draw Themed Anatomical Realistic Snakes
    let snakeIdx = 0;
    Object.entries(snakes).forEach(([head, tail]) => {
        const headTile = parseInt(head);
        const tailTile = parseInt(tail);
        const species = theme.species[snakeIdx % theme.species.length];
        snakeIdx++;
        drawRealisticSnake(ctx, headTile, tailTile, species, theme.id);
    });

    // 5. Draw Player Tokens
    if (details && details.players) {
        drawSnakePlayerTokens(ctx, details);
    }
}

// ======================== REALISTIC LADDER RENDERER ======================== //

function drawRealisticLadder(ctx, p1, p2, ladderCfg, themeId) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;
    const railOffset = 10;

    ctx.save();

    // 1. Ladder Soft Cast Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    // 2. Ladder Side Rails
    ctx.strokeStyle = ladderCfg.rail;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    // Left Rail
    ctx.beginPath();
    ctx.moveTo(p1.x + px * railOffset, p1.y + py * railOffset);
    ctx.lineTo(p2.x + px * railOffset, p2.y + py * railOffset);
    ctx.stroke();

    // Right Rail
    ctx.beginPath();
    ctx.moveTo(p1.x - px * railOffset, p1.y - py * railOffset);
    ctx.lineTo(p2.x - px * railOffset, p2.y - py * railOffset);
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // 3. Rail Highlights / Metallic Trim
    ctx.strokeStyle = ladderCfg.railHighlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p1.x + px * railOffset - 1, p1.y + py * railOffset - 1);
    ctx.lineTo(p2.x + px * railOffset - 1, p2.y + py * railOffset - 1);
    ctx.moveTo(p1.x - px * railOffset + 1, p1.y - py * railOffset + 1);
    ctx.lineTo(p2.x - px * railOffset + 1, p2.y - py * railOffset + 1);
    ctx.stroke();

    // Bamboo Joint Nodules for Jungle Theme
    if (themeId === 'jungle') {
        const joints = Math.floor(dist / 32);
        ctx.fillStyle = '#65a30d';
        for (let j = 1; j <= joints; j++) {
            const jt = j / (joints + 1);
            const jx = p1.x + dx * jt;
            const jy = p1.y + dy * jt;
            ctx.beginPath();
            ctx.arc(jx + px * railOffset, jy + py * railOffset, 4, 0, Math.PI * 2);
            ctx.arc(jx - px * railOffset, jy - py * railOffset, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 4. Ladder Rungs
    const numRungs = Math.max(3, Math.floor(dist / 22));
    for (let i = 1; i < numRungs; i++) {
        const t = i / numRungs;
        const cx = p1.x + dx * t;
        const cy = p1.y + dy * t;

        // Rung Bar with 3D gradient
        ctx.strokeStyle = ladderCfg.rung;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx + px * railOffset, cy + py * railOffset);
        ctx.lineTo(cx - px * railOffset, cy - py * railOffset);
        ctx.stroke();

        // Rung Metallic Stud Caps
        ctx.fillStyle = ladderCfg.rungCap;
        ctx.beginPath();
        ctx.arc(cx + px * railOffset, cy + py * railOffset, 2.2, 0, Math.PI * 2);
        ctx.arc(cx - px * railOffset, cy - py * railOffset, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ======================== REALISTIC ANATOMICAL SNAKE RENDERER ======================== //

function drawRealisticSnake(ctx, headTile, tailTile, species, themeId) {
    const { pHead, cp1, cp2, pTail } = getSnakeControlPoints(headTile, tailTile);

    const steps = 75;
    const curvePoints = [];
    const tangents = [];
    const normals = [];
    const widths = [];

    // 1. Sample Bezier Curve with Tangents, Normals & Tapered Body Thickness
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = getSnakeBezierPoint(t, pHead, cp1, cp2, pTail);
        curvePoints.push(pt);

        // Derivative for tangent vector
        const u = 1 - t;
        const dxdt = 3 * u * u * (cp1.x - pHead.x) + 6 * u * t * (cp2.x - cp1.x) + 3 * t * t * (pTail.x - cp2.x);
        const dydt = 3 * u * u * (cp1.y - pHead.y) + 6 * u * t * (cp2.y - cp1.y) + 3 * t * t * (pTail.y - cp2.y);
        const tanLen = Math.hypot(dxdt, dydt) || 1;
        const tx = dxdt / tanLen;
        const ty = dydt / tanLen;
        tangents.push({ x: tx, y: ty, angle: Math.atan2(ty, tx) });
        normals.push({ x: -ty, y: tx });

        // Tapered anatomical body thickness: neck (13px) -> upper body (16.5px) -> mid body (14px) -> tail tip (3px)
        let w;
        if (t < 0.08) {
            w = 13 + (t / 0.08) * 3.5;
        } else if (t <= 0.45) {
            w = 16.5 - ((t - 0.08) / 0.37) * 2.5;
        } else if (t <= 0.80) {
            w = 14.0 - ((t - 0.45) / 0.35) * 5.0;
        } else {
            w = 9.0 - ((t - 0.80) / 0.20) * 6.0;
        }
        widths.push(Math.max(2.8, w));
    }

    ctx.save();

    // 2. Soft Realistic Ground Drop Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3.5;
    ctx.shadowOffsetY = 4.5;
    ctx.fillStyle = species.dorsalDark;

    ctx.beginPath();
    // Top boundary
    for (let i = 0; i <= steps; i++) {
        const pt = curvePoints[i];
        const n = normals[i];
        const halfW = widths[i] / 2;
        if (i === 0) ctx.moveTo(pt.x + n.x * halfW, pt.y + n.y * halfW);
        else ctx.lineTo(pt.x + n.x * halfW, pt.y + n.y * halfW);
    }
    // Bottom boundary
    for (let i = steps; i >= 0; i--) {
        const pt = curvePoints[i];
        const n = normals[i];
        const halfW = widths[i] / 2;
        ctx.lineTo(pt.x - n.x * halfW, pt.y - n.y * halfW);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. 3D Cylindrical Shaded Body Ribbon
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const pt = curvePoints[i];
        const n = normals[i];
        const halfW = widths[i] / 2;
        if (i === 0) ctx.moveTo(pt.x + n.x * halfW, pt.y + n.y * halfW);
        else ctx.lineTo(pt.x + n.x * halfW, pt.y + n.y * halfW);
    }
    for (let i = steps; i >= 0; i--) {
        const pt = curvePoints[i];
        const n = normals[i];
        const halfW = widths[i] / 2;
        ctx.lineTo(pt.x - n.x * halfW, pt.y - n.y * halfW);
    }
    ctx.closePath();

    ctx.fillStyle = species.dorsalDark;
    ctx.fill();

    // Body Main Scale Color Stroke
    ctx.strokeStyle = species.dorsalMain;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. Ventral Belly Plates (Transverse Scutes along inner curve)
    for (let i = 1; i < steps; i += 2) {
        const pt = curvePoints[i];
        const n = normals[i];
        const w = widths[i];
        const bellyW = w * 0.42;

        ctx.strokeStyle = species.belly;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(pt.x - n.x * (w / 2), pt.y - n.y * (w / 2));
        ctx.lineTo(pt.x - n.x * (w / 2 - bellyW), pt.y - n.y * (w / 2 - bellyW));
        ctx.stroke();
    }

    // 5. Dorsal Spine 3D Cylindrical Highlight Ridge
    ctx.strokeStyle = species.dorsalLight;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const pt = curvePoints[i];
        const n = normals[i];
        const offset = widths[i] * 0.15;
        if (i === 0) ctx.moveTo(pt.x + n.x * offset, pt.y + n.y * offset);
        else ctx.lineTo(pt.x + n.x * offset, pt.y + n.y * offset);
    }
    ctx.stroke();

    // 6. Species-Specific Dorsal Scale Markings / Saddles
    const numMarkings = Math.max(5, Math.floor(steps / 5.5));
    for (let m = 1; m < numMarkings; m++) {
        const idx = Math.floor((m / numMarkings) * (steps - 8)) + 3;
        const pt = curvePoints[idx];
        const n = normals[idx];
        const t = tangents[idx];
        const r = widths[idx] * 0.38;

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(t.angle);

        if (species.pattern === 'diamond') {
            // Eastern Diamondback / Viper Diamond Saddles
            ctx.fillStyle = species.spotBorder;
            ctx.beginPath();
            ctx.moveTo(0, -r * 1.3);
            ctx.lineTo(r * 1.3, 0);
            ctx.lineTo(0, r * 1.3);
            ctx.lineTo(-r * 1.3, 0);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = species.spots;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.9);
            ctx.lineTo(r * 0.9, 0);
            ctx.lineTo(0, r * 0.9);
            ctx.lineTo(-r * 0.9, 0);
            ctx.closePath();
            ctx.fill();
        } else if (species.pattern === 'lightning') {
            // Emerald Tree Boa Lightning Zigzags
            ctx.fillStyle = species.spotBorder;
            ctx.beginPath();
            ctx.moveTo(-r * 1.2, -r * 0.8);
            ctx.lineTo(0, -r * 1.4);
            ctx.lineTo(r * 1.2, -r * 0.8);
            ctx.lineTo(0, r * 0.3);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = species.spots;
            ctx.beginPath();
            ctx.arc(0, -r * 0.3, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (species.pattern === 'bands') {
            // Coral Snake Alternating Tri-Color Rings
            ctx.fillStyle = species.spotBorder;
            ctx.fillRect(-r * 0.8, -r * 1.2, r * 1.6, r * 2.4);
            ctx.fillStyle = species.spots;
            ctx.fillRect(-r * 0.4, -r * 1.2, r * 0.8, r * 2.4);
        } else if (species.pattern === 'rosette') {
            // Python Chocolate Rosettes
            ctx.fillStyle = species.spotBorder;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = species.spots;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = species.dorsalLight;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Chevron / Viper Spots
            ctx.fillStyle = species.spotBorder;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.2, r * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = species.spots;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 7. Rattle or Tapered Tail Tip
    const tailPt = curvePoints[steps];
    const tailTan = tangents[steps];
    ctx.save();
    ctx.translate(tailPt.x, tailPt.y);
    ctx.rotate(tailTan.angle);

    if (species.pattern === 'diamond') {
        // Rattlesnake Segmented Rattle Rings
        const rattleColors = ['#d7ccc8', '#bcaaa4', '#8d6e63'];
        for (let r = 0; r < 3; r++) {
            ctx.fillStyle = rattleColors[r % rattleColors.length];
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(r * 3.5, 0, 2.5, 3.5 - r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    } else {
        // Smooth Slender Coiled Tip
        ctx.fillStyle = species.dorsalDark;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 8. Anatomical Realistic Viper / Cobra Head
    const headPt = curvePoints[0];
    const headTan = tangents[0];
    const headAngle = headTan.angle + Math.PI; // Face outwards toward tile

    ctx.save();
    ctx.translate(headPt.x, headPt.y);
    ctx.rotate(headAngle);

    // Forked Tongue (Dynamic Flickering Curves)
    ctx.strokeStyle = species.tongue;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(25, -4);
    ctx.moveTo(20, 0);
    ctx.lineTo(25, 4);
    ctx.stroke();

    // Triangular Viper Head / Cobra Hood
    ctx.fillStyle = species.dorsalMain;
    ctx.strokeStyle = species.dorsalDark;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(12, 0);          // Snout tip
    ctx.lineTo(4, -8);          // Upper jaw
    ctx.lineTo(-8, -10);        // Left temporal venom gland
    ctx.lineTo(-12, -4);        // Neck left
    ctx.lineTo(-12, 4);         // Neck right
    ctx.lineTo(-8, 10);         // Right temporal venom gland
    ctx.lineTo(4, 8);           // Lower jaw
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head Crown Scale Highlights
    ctx.fillStyle = species.dorsalLight;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(0, -4);
    ctx.lineTo(-4, 0);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    // Supraocular Brow Ridges (Menacing 3D shadow over eyes)
    ctx.strokeStyle = species.dorsalDark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(3, -5.5, 4, 0, Math.PI);
    ctx.arc(3, 5.5, 4, 0, Math.PI);
    ctx.stroke();

    // Eyes: Glowing Reptilian Iris with Vertical Slit Black Pupil
    ctx.fillStyle = species.eyeColor;
    ctx.beginPath();
    ctx.arc(3, -5.5, 3.2, 0, Math.PI * 2);
    ctx.arc(3, 5.5, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Vertical Slit Black Pupil
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(3, -5.5, 1.1, 2.8, 0, 0, Math.PI * 2);
    ctx.ellipse(3, 5.5, 1.1, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corneal Specular Glint Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -6.5, 0.9, 0, Math.PI * 2);
    ctx.arc(4, 4.5, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Loreal Heat-Sensing Pits & Nostrils
    ctx.fillStyle = species.dorsalDark;
    ctx.beginPath();
    ctx.arc(8, -2.5, 1, 0, Math.PI * 2);
    ctx.arc(8, 2.5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
}

// ======================== PLAYER TOKENS RENDERER ======================== //

function drawSnakePlayerTokens(ctx, details) {
    const players = Object.values(details.players);
    const restingByCell = {};

    players.forEach(p => {
        const anim = snakeTokenPositions[p.playerId];
        const pos = anim ? anim.currentPos : p.position;
        if (!restingByCell[pos]) restingByCell[pos] = [];
        restingByCell[pos].push(p);
    });

    const cellOffsets = [
        { x: 0, y: 0 },
        { x: -13, y: 13 },
        { x: 13, y: -13 },
        { x: 13, y: 13 }
    ];

    players.forEach(p => {
        const anim = snakeTokenPositions[p.playerId];
        let px, py;
        if (anim) {
            px = anim.x;
            py = anim.y;
            if (!isSnakeAnimating && restingByCell[anim.currentPos] && restingByCell[anim.currentPos].length > 1) {
                const idx = restingByCell[anim.currentPos].indexOf(p);
                const off = cellOffsets[idx] || { x: 0, y: 0 };
                px += off.x;
                py += off.y;
            }
        } else {
            const pt = getSnakeLudoPosition(p.position);
            px = pt.x;
            py = pt.y;
            if (restingByCell[p.position] && restingByCell[p.position].length > 1) {
                const idx = restingByCell[p.position].indexOf(p);
                const off = cellOffsets[idx] || { x: 0, y: 0 };
                px += off.x;
                py += off.y;
            }
        }

        const isMe = state.player && p.playerId === state.player.id;
        const isCurrentTurn = details.currentPlayerId === p.playerId;

        ctx.save();

        // 1. Token Soft Drop Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2.5;
        ctx.shadowOffsetY = 3.5;

        // 2. Token Glossy 3D Dome
        const radGrad = ctx.createRadialGradient(px - 4, py - 4, 2, px, py, 14);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.35, p.color || '#ef4444');
        radGrad.addColorStop(1, '#090d16');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 3. Metallic White Rim
        ctx.strokeStyle = isMe ? '#fde047' : '#ffffff';
        ctx.lineWidth = isMe ? 3 : 2.2;
        ctx.stroke();

        // 4. Active Turn Pulsing Golden Aura
        if (isCurrentTurn) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3.2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.arc(px, py, 19, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 5. Local Player Identification Indicator
        if (isMe) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('👑 YOU', px, py - 18);
        }

        // 6. Player Initials
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = (p.username || p.playerId || 'P').substring(0, 2).toUpperCase();
        ctx.fillText(initial, px, py);

        ctx.restore();
    });
}

