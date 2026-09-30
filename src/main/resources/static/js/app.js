/**
 * Random Games Platform - Realtime Frontend Client
 */

// State Management
const state = {
    player: null,
    currentRoom: null,
    currentGameState: null,
    isSpectator: false,
    lastGameOverShownGameId: null,
    selectedGameTab: 'ALL',
    ws: null,
    wsConnected: false,
    pingInterval: null,
    availableGames: [],
    rooms: [],
    // Game renderers
    snakeAnimationId: null,
    lastSnakeState: null,
    // Chess state
    chessSelectedSquare: null,
    chessValidMoves: [],
    chessPendingPromotion: null
};

// DOM Elements
const el = {
    wsStatusIndicator: document.getElementById('wsStatusIndicator'),
    wsStatusText: document.getElementById('wsStatusText'),
    playerBadge: document.getElementById('playerBadge'),
    displayUsername: document.getElementById('displayUsername'),
    
    welcomeScreen: document.getElementById('welcomeScreen'),
    lobbyScreen: document.getElementById('lobbyScreen'),
    gameRoomScreen: document.getElementById('gameRoomScreen'),
    
    usernameInput: document.getElementById('usernameInput'),
    enterPlatformBtn: document.getElementById('enterPlatformBtn'),
    
    gameTabs: document.getElementById('gameTabs'),
    roomList: document.getElementById('roomList'),
    noRoomsPlaceholder: document.getElementById('noRoomsPlaceholder'),
    refreshRoomsBtn: document.getElementById('refreshRoomsBtn'),
    openCreateRoomModalBtn: document.getElementById('openCreateRoomModalBtn'),
    createFirstRoomBtn: document.getElementById('createFirstRoomBtn'),
    
    createRoomModal: document.getElementById('createRoomModal'),
    closeCreateRoomModalBtn: document.getElementById('closeCreateRoomModalBtn'),
    cancelCreateRoomBtn: document.getElementById('cancelCreateRoomBtn'),
    confirmCreateRoomBtn: document.getElementById('confirmCreateRoomBtn'),
    roomNameInput: document.getElementById('roomNameInput'),
    gameTypeSelect: document.getElementById('gameTypeSelect'),
    maxPlayersInput: document.getElementById('maxPlayersInput'),
    allowSpectatorsCheckbox: document.getElementById('allowSpectatorsCheckbox'),
    
    roomTitle: document.getElementById('roomTitle'),
    roomGameType: document.getElementById('roomGameType'),
    roomStatusPill: document.getElementById('roomStatusPill'),
    roomSpectatorBadge: document.getElementById('roomSpectatorBadge'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),
    startGameBtn: document.getElementById('startGameBtn'),
    restartGameBtn: document.getElementById('restartGameBtn'),
    playerCount: document.getElementById('playerCount'),
    maxPlayerCount: document.getElementById('maxPlayerCount'),
    playersList: document.getElementById('playersList'),
    spectatorsCard: document.getElementById('spectatorsCard'),
    spectatorCount: document.getElementById('spectatorCount'),
    spectatorsList: document.getElementById('spectatorsList'),
    gameStatusDetails: document.getElementById('gameStatusDetails'),
    eventsLog: document.getElementById('eventsLog'),
    
    // Boards
    ticTacToeBoardContainer: document.getElementById('ticTacToeBoardContainer'),
    tttTurnIndicator: document.getElementById('tttTurnIndicator'),
    tttGrid: document.getElementById('tttGrid'),
    
    ludoBoardContainer: document.getElementById('ludoBoardContainer'),
    ludoTurnIndicator: document.getElementById('ludoTurnIndicator'),
    ludoMyColorBadge: document.getElementById('ludoMyColorBadge'),
    ludoMyColorText: document.getElementById('ludoMyColorText'),
    ludoRollDiceBtn: document.getElementById('ludoRollDiceBtn'),
    diceResultDisplay: document.getElementById('diceResultDisplay'),
    ludoCanvas: document.getElementById('ludoCanvas'),
    ludoCenterDiceOverlay: document.getElementById('ludoCenterDiceOverlay'),
    ludoCenterDiceTitle: document.getElementById('ludoCenterDiceTitle'),
    ludoCenterDiceDisplay: document.getElementById('ludoCenterDiceDisplay'),
    ludoCenterDiceResultText: document.getElementById('ludoCenterDiceResultText'),
    
    snakeBoardContainer: document.getElementById('snakeBoardContainer'),
    snakeThemeSelector: document.getElementById('snakeThemeSelector'),
    snakeTurnIndicator: document.getElementById('snakeTurnIndicator'),
    snakeRollDiceBtn: document.getElementById('snakeRollDiceBtn'),
    snakeDiceResultDisplay: document.getElementById('snakeDiceResultDisplay'),
    snakeScoreboard: document.getElementById('snakeScoreboard'),
    snakeCanvas: document.getElementById('snakeCanvas'),
    snakeCenterDiceOverlay: document.getElementById('snakeCenterDiceOverlay'),
    snakeCenterDiceTitle: document.getElementById('snakeCenterDiceTitle'),
    snakeCenterDiceDisplay: document.getElementById('snakeCenterDiceDisplay'),
    snakeCenterDiceResultText: document.getElementById('snakeCenterDiceResultText'),

    // Chess
    chessBoardContainer: document.getElementById('chessBoardContainer'),
    chessTurnIndicator: document.getElementById('chessTurnIndicator'),
    chessMyColorBadge: document.getElementById('chessMyColorBadge'),
    chessMyColorText: document.getElementById('chessMyColorText'),
    chessBoard: document.getElementById('chessBoard'),
    chessCapturedWhitePieces: document.getElementById('chessCapturedWhitePieces'),
    chessCapturedBlackPieces: document.getElementById('chessCapturedBlackPieces'),
    chessMoveList: document.getElementById('chessMoveList'),
    chessPromotionModal: document.getElementById('chessPromotionModal'),
    chessPromotionChoices: document.getElementById('chessPromotionChoices'),

    // Call Bridge
    callBridgeBoardContainer: document.getElementById('callBridgeBoardContainer'),

    // Game Over Modal
    gameOverModal: document.getElementById('gameOverModal'),
    gameOverIcon: document.getElementById('gameOverIcon'),
    gameOverTitle: document.getElementById('gameOverTitle'),
    gameOverTrophy: document.getElementById('gameOverTrophy'),
    gameOverWinner: document.getElementById('gameOverWinner'),
    gameOverSubtitle: document.getElementById('gameOverSubtitle'),
    gameOverDetails: document.getElementById('gameOverDetails'),
    gameOverLobbyBtn: document.getElementById('gameOverLobbyBtn'),
    gameOverRestartBtn: document.getElementById('gameOverRestartBtn'),
    gameOverCloseBtn: document.getElementById('gameOverCloseBtn'),
    closeGameOverModalBtn: document.getElementById('closeGameOverModalBtn'),
    
    toast: document.getElementById('toast')
};

// ======================== INITIALIZATION ======================== //

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchSupportedGames();
    restoreSession();
});

function setupEventListeners() {
    el.enterPlatformBtn.addEventListener('click', handleEnterPlatform);
    el.usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleEnterPlatform();
    });

    el.gameTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.selectedGameTab = e.target.dataset.game;
            renderRooms();
        }
    });

    el.refreshRoomsBtn.addEventListener('click', fetchRooms);
    el.openCreateRoomModalBtn.addEventListener('click', () => openCreateRoomModal());
    el.createFirstRoomBtn.addEventListener('click', () => openCreateRoomModal());
    el.closeCreateRoomModalBtn.addEventListener('click', closeCreateRoomModal);
    el.cancelCreateRoomBtn.addEventListener('click', closeCreateRoomModal);
    el.confirmCreateRoomBtn.addEventListener('click', handleCreateRoom);

    el.gameTypeSelect.addEventListener('change', updateMaxPlayersOptions);

    el.leaveRoomBtn.addEventListener('click', handleLeaveRoom);
    el.startGameBtn.addEventListener('click', handleStartGame);
    el.restartGameBtn.addEventListener('click', handleRestartGame);

    // Tic-Tac-Toe cell click
    el.tttGrid.addEventListener('click', (e) => {
        if (state.isSpectator) return;
        if (e.target.classList.contains('ttt-cell')) {
            const row = parseInt(e.target.dataset.row);
            const col = parseInt(e.target.dataset.col);
            sendGameAction({ action: 'PLACE_MARK', row, column: col });
        }
    });

    // Ludo Dice button click
    el.ludoRollDiceBtn.addEventListener('click', () => {
        if (state.isSpectator) return;
        el.ludoRollDiceBtn.disabled = true;
        sendGameAction({ action: 'ROLL_DICE' });
    });

    // Ludo Canvas Hover & Click for selecting pieces directly
    el.ludoCanvas.addEventListener('mousemove', handleLudoCanvasHover);
    el.ludoCanvas.addEventListener('mouseleave', () => {
        el.ludoCanvas.style.cursor = 'default';
    });
    el.ludoCanvas.addEventListener('pointerdown', handleLudoCanvasTap);
    el.ludoCanvas.addEventListener('click', handleLudoCanvasTap);

    // Snake and Ladder Dice button click
    el.snakeRollDiceBtn.addEventListener('click', () => {
        if (state.isSpectator) return;
        el.snakeRollDiceBtn.disabled = true;
        sendGameAction({ action: 'ROLL_DICE' });
    });

    // Snake and Ladder Theme selector
    if (el.snakeThemeSelector) {
        el.snakeThemeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.theme-pill');
            if (btn && btn.dataset.theme) {
                setSnakeBoardTheme(btn.dataset.theme);
            }
        });
    }

    // Game Over Modal buttons
    if (el.gameOverLobbyBtn) el.gameOverLobbyBtn.addEventListener('click', () => { el.gameOverModal.style.display = 'none'; handleLeaveRoom(); });
    if (el.gameOverRestartBtn) el.gameOverRestartBtn.addEventListener('click', () => { el.gameOverModal.style.display = 'none'; handleRestartGame(); });
    if (el.gameOverCloseBtn) el.gameOverCloseBtn.addEventListener('click', () => { el.gameOverModal.style.display = 'none'; });
    if (el.closeGameOverModalBtn) el.closeGameOverModalBtn.addEventListener('click', () => { el.gameOverModal.style.display = 'none'; });
}
// ======================== REST API CALLS ======================== //

async function fetchSupportedGames() {
    try {
        const res = await fetch('/api/v1/games');
        if (res.ok) {
            state.availableGames = await res.json();
        }
    } catch (err) {
        console.error('Failed to fetch game types', err);
    }
}

async function handleEnterPlatform() {
    const username = el.usernameInput.value.trim();
    try {
        const res = await fetch('/api/v1/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        if (res.ok) {
            state.player = await res.json();
            localStorage.setItem('game_platform_player', JSON.stringify(state.player));
            el.displayUsername.textContent = state.player.username;
            el.playerBadge.style.display = 'flex';
            
            // Connect WebSocket with registered playerId
            connectWebSocket();

            // Switch to Lobby view
            showScreen('lobbyScreen');
            fetchRooms();
        } else {
            showToast('Failed to create player session', 'error');
        }
    } catch (err) {
        showToast('Connection error: ' + err.message, 'error');
    }
}

async function restoreSession() {
    const savedPlayerJson = localStorage.getItem('game_platform_player');
    if (!savedPlayerJson) {
        showScreen('welcomeScreen');
        return;
    }

    let savedPlayer;
    try {
        savedPlayer = JSON.parse(savedPlayerJson);
    } catch (e) {
        localStorage.removeItem('game_platform_player');
        showScreen('welcomeScreen');
        return;
    }

    if (!savedPlayer || !savedPlayer.id) {
        localStorage.removeItem('game_platform_player');
        showScreen('welcomeScreen');
        return;
    }

    try {
        // Validate player exists on backend
        const res = await fetch(`/api/v1/players/${savedPlayer.id}`);
        if (!res.ok) {
            // Player session expired or server restarted
            localStorage.removeItem('game_platform_player');
            localStorage.removeItem('game_platform_room_id');
            showScreen('welcomeScreen');
            return;
        }

        state.player = await res.json();
        localStorage.setItem('game_platform_player', JSON.stringify(state.player));
        el.displayUsername.textContent = state.player.username;
        el.playerBadge.style.display = 'flex';

        connectWebSocket();

        const savedRoomId = localStorage.getItem('game_platform_room_id');
        if (savedRoomId) {
            try {
                const roomRes = await fetch(`/api/v1/games/rooms/${savedRoomId}`);
                if (roomRes.ok) {
                    const room = await roomRes.json();
                    if (room.status !== 'CANCELLED' && (room.playerIds.includes(state.player.id) || room.spectatorIds.includes(state.player.id))) {
                        enterRoom(room);
                        return;
                    }
                }
            } catch (err) {
                console.warn('Could not restore room:', err);
            }
            localStorage.removeItem('game_platform_room_id');
        }

        // Show lobby view
        showScreen('lobbyScreen');
        fetchRooms();
    } catch (err) {
        console.error('Session restore failed:', err);
        showScreen('welcomeScreen');
    }
}

async function fetchRooms() {
    try {
        const url = state.selectedGameTab === 'ALL' 
            ? '/api/v1/games/rooms' 
            : `/api/v1/games/${state.selectedGameTab}/rooms`;
        const res = await fetch(url);
        if (res.ok) {
            state.rooms = await res.json();
            renderRooms();
        }
    } catch (err) {
        console.error('Failed to fetch rooms', err);
    }
}

async function handleCreateRoom() {
    const name = el.roomNameInput.value.trim() || `${state.player.username}'s Game`;
    const gameType = el.gameTypeSelect.value;
    const maxPlayers = parseInt(el.maxPlayersInput.value);
    const spectatorAllowed = el.allowSpectatorsCheckbox.checked;

    let configuration = null;
    if (gameType === 'CALL_BRIDGE') {
        const winCondition = document.getElementById('cbWinConditionSelect')?.value || 'ROUNDS';
        const totalRounds = parseInt(document.getElementById('cbRoundsInput')?.value || '5');
        const pointThreshold = parseInt(document.getElementById('cbPointsInput')?.value || '50');
        configuration = { winCondition, totalRounds, pointThreshold };
    }

    try {
        const res = await fetch('/api/v1/games/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                gameType,
                hostPlayerId: state.player.id,
                maxPlayers,
                spectatorAllowed,
                lateJoinAllowed: false,
                configuration
            })
        });

        if (res.ok) {
            const room = await res.json();
            closeCreateRoomModal();
            enterRoom(room);
        } else {
            const err = await res.json();
            showToast(err.message || 'Failed to create room', 'error');
        }
    } catch (err) {
        showToast('Error creating room: ' + err.message, 'error');
    }
}

async function joinRoom(roomId, asSpectator = false) {
    if (!state.player) {
        showToast('Please enter a username first', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/v1/games/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: state.player.id,
                asSpectator: asSpectator
            })
        });

        if (res.ok) {
            const room = await res.json();
            enterRoom(room, asSpectator);
        } else {
            const err = await res.json();
            showToast(err.message || 'Failed to join room', 'error');
        }
    } catch (err) {
        showToast('Error joining room: ' + err.message, 'error');
    }
}

// ======================== WEBSOCKET HANDLING ======================== //

function connectWebSocket() {
    if (state.ws) {
        try { state.ws.close(); } catch(e) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const roomQuery = state.currentRoom ? `&roomId=${state.currentRoom.roomId}` : '';
    const isSpec = state.isSpectator || (state.player && state.currentRoom && state.currentRoom.spectatorIds && state.currentRoom.spectatorIds.includes(state.player.id));
    const spectatorQuery = isSpec ? '&asSpectator=true' : '';
    const wsUrl = `${protocol}//${window.location.host}/ws/game?playerId=${state.player.id}${roomQuery}${spectatorQuery}`;

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
        state.wsConnected = true;
        el.wsStatusIndicator.className = 'connection-status connected';
        el.wsStatusText.textContent = 'Connected';
        
        if (state.currentRoom) {
            sendWsMessage('JOIN_ROOM', { asSpectator: state.isSpectator });
        }

        // Start ping heartbeat
        if (state.pingInterval) clearInterval(state.pingInterval);
        state.pingInterval = setInterval(() => {
            if (state.ws && state.ws.readyState === WebSocket.OPEN) {
                state.ws.send(JSON.stringify({ type: 'PING', playerId: state.player.id }));
            }
        }, 15000);
    };

    state.ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleIncomingWsMessage(msg);
        } catch (e) {
            console.error('Error parsing WS message:', e);
        }
    };

    state.ws.onclose = () => {
        state.wsConnected = false;
        el.wsStatusIndicator.className = 'connection-status';
        el.wsStatusText.textContent = 'Reconnecting...';
        setTimeout(() => {
            if (state.player) connectWebSocket();
        }, 3000);
    };

    state.ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
    };
}

function sendWsMessage(type, payload = {}) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        showToast('WebSocket not connected', 'error');
        return;
    }
    const msg = {
        type,
        roomId: state.currentRoom ? state.currentRoom.roomId : null,
        playerId: state.player.id,
        requestId: 'req-' + Math.random().toString(36).substring(2, 9),
        payload
    };
    state.ws.send(JSON.stringify(msg));
}

function sendGameAction(actionPayload) {
    sendWsMessage('GAME_ACTION', actionPayload);
}

function handleIncomingWsMessage(msg) {
    switch (msg.type) {
        case 'PONG':
            break;
        case 'PLAYER_JOINED':
            logEvent(`🟢 ${msg.payload.player.username} joined the room.`);
            if (state.currentRoom && msg.payload.room) {
                updateRoomState(msg.payload.room);
            }
            break;
        case 'PLAYER_LEFT': {
            const pName = (msg.payload && msg.payload.player && msg.payload.player.username) || 'Player';
            const reason = (msg.payload && msg.payload.message) || `🔴 ${pName} left the room.`;
            logEvent(reason, 'important');
            showToast(reason, 'info');
            if (state.currentRoom && msg.payload.room) {
                updateRoomState(msg.payload.room);
            }
            break;
        }
        case 'ROOM_CLOSED': {
            const reason = (msg.payload && msg.payload.message) || 'Room has been closed.';
            showToast(reason, 'info');
            logEvent(`🚪 ${reason}`, 'important');
            localStorage.removeItem('game_platform_room_id');
            state.currentRoom = null;
            showScreen('lobbyScreen');
            fetchRooms();
            break;
        }
        case 'PLAYER_DISCONNECTED':
            logEvent(`⚠️ Player disconnected.`);
            break;
        case 'PLAYER_RECONNECTED':
            logEvent(`🔄 ${msg.payload.player.username} reconnected.`);
            if (state.player && msg.payload.player && msg.payload.player.id === state.player.id && msg.payload.room) {
                updateRoomState(msg.payload.room);
            }
            break;
        case 'GAME_STARTED':
            snakeTokenPositions = {};
            logEvent(`🚀 Game started!`, 'important');
            if (msg.payload.room) updateRoomState(msg.payload.room);
            if (msg.payload.gameState) updateGameState(msg.payload.gameState);
            break;
        case 'GAME_STATE_UPDATED':
            if (msg.payload.gameState) updateGameState(msg.payload.gameState, msg.payload.events);
            if (msg.payload.events) {
                msg.payload.events.forEach(evt => formatGameEvent(evt));
            }
            break;
        case 'GAME_FINISHED': {
            const reason = (msg.payload && msg.payload.reason);
            if (reason) {
                logEvent(`🏁 ${reason}`, 'important');
                showToast(reason, 'info');
            } else {
                logEvent(`🏁 Game finished!`, 'important');
            }
            if (msg.payload.room) updateRoomState(msg.payload.room);
            if (msg.payload.gameState) updateGameState(msg.payload.gameState, msg.payload.events);
            break;
        }
        case 'GAME_ERROR':
            showToast(msg.message || 'Game error', 'error');
            logEvent(`❌ Error: ${msg.message}`, 'error');
            break;
    }
}

// ======================== FORMATTING HELPERS ======================== //

function formatStatus(status) {
    if (!status) return '';
    switch (status.toUpperCase()) {
        case 'WAITING': return 'Waiting';
        case 'READY': return 'Ready';
        case 'IN_PROGRESS': return 'In Progress';
        case 'FINISHED': return 'Finished';
        case 'DRAW': return 'Draw';
        case 'CANCELLED': return 'Cancelled';
        default:
            return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
}

function formatGameType(gameType) {
    if (!gameType) return '';
    switch (gameType.toUpperCase()) {
        case 'TIC_TAC_TOE': return 'Tic Tac Toe';
        case 'LUDO': return 'Ludo';
        case 'SNAKE': return 'Snake and Ladder';
        case 'CHESS': return 'Chess';
        case 'CALL_BRIDGE': return 'Call Bridge';
        default: return gameType;
    }
}

function getGameIcon(gameType) {
    if (!gameType) return '🎮';
    switch (gameType.toUpperCase()) {
        case 'TIC_TAC_TOE': return '❌';
        case 'LUDO': return '🎲';
        case 'SNAKE': return '🐍';
        case 'CHESS': return '♟️';
        case 'CALL_BRIDGE': return '♠️';
        default: return '🎮';
    }
}

function updateGameDetailsBox(room, gameState) {
    if (!el.gameStatusDetails) return;
    if (!room) {
        el.gameStatusDetails.innerHTML = 'Waiting for players to join...';
        return;
    }

    const isHost = state.player && room.hostPlayerId === state.player.id;
    const currentCount = room.playerIds ? room.playerIds.length : 0;
    const isFull = currentCount >= room.maxPlayers;
    const isReady = room.status === 'READY' || (currentCount >= room.minPlayers && room.status !== 'IN_PROGRESS');

    if (room.status === 'IN_PROGRESS' || (gameState && gameState.status === 'IN_PROGRESS')) {
        let gameDesc = '';
        if (room.gameType === 'TIC_TAC_TOE') {
            gameDesc = 'Match in progress on 3x3 grid. Take turns placing marks to get 3 in a row.';
        } else if (room.gameType === 'LUDO') {
            gameDesc = 'Match in progress. Roll dice and move pieces towards home. Rolling a 6 earns a bonus turn.';
        } else if (room.gameType === 'SNAKE') {
            gameDesc = 'Match in progress on 100-tile board. Climb ladders, evade snakes, and roll 6 for bonus rolls.';
        } else if (room.gameType === 'CHESS') {
            gameDesc = 'Chess match in progress. Click a piece to select it, then click a destination square to move.';
        } else if (room.gameType === 'CALL_BRIDGE') {
            gameDesc = 'Call Bridge match in progress. Bid your tricks, then play cards to win rounds.';
        } else {
            gameDesc = 'Match in progress.';
        }
        el.gameStatusDetails.innerHTML = `<strong>🎮 Match In Progress</strong><p style="margin-top:0.4rem; color:var(--text-muted);">${gameDesc}</p>`;
    } else if (room.status === 'FINISHED' || (gameState && (gameState.status === 'FINISHED' || gameState.status === 'DRAW'))) {
        const winnerRaw = gameState ? gameState.winner : null;
        const winnerIdList = winnerRaw ? winnerRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        let finishMsg = '';
        if (winnerIdList.length > 0) {
            const isMultiWin = winnerIdList.length > 1;
            const isMe = state.player && winnerIdList.includes(state.player.id);
            const winnerNames = winnerIdList.map(wId => {
                const n = (gameState && gameState.details && gameState.details.players && gameState.details.players[wId] && gameState.details.players[wId].username)
                    || (gameState && gameState.details && gameState.details.playerStates && gameState.details.playerStates[wId] && gameState.details.playerStates[wId].username)
                    || (room && room.playerNames && room.playerNames[wId])
                    || wId;
                return n;
            });
            const winnerName = winnerNames.join(', ');
            if (isMultiWin) {
                finishMsg = `🤝 Tie: <strong>${isMe ? 'You & others' : escapeHtml(winnerName)}</strong>!`;
            } else {
                finishMsg = `🏆 Winner: <strong>${isMe ? 'You (' + escapeHtml(winnerNames[0]) + ')' : escapeHtml(winnerName)}</strong>!`;
            }
        } else if (gameState && gameState.status === 'DRAW') {
            finishMsg = `🤝 Match ended in a draw!`;
        } else {
            finishMsg = `🏁 Match finished.`;
        }
        const hostNote = isHost ? '<p style="margin-top:0.4rem; color:var(--warning);">You can restart the match or wait for new players.</p>' : '<p style="margin-top:0.4rem; color:var(--text-muted);">Waiting for creator to restart match.</p>';
        el.gameStatusDetails.innerHTML = `<div>${finishMsg}</div>${hostNote}`;
    } else if (isFull) {
        if (isHost) {
            el.gameStatusDetails.innerHTML = `<strong>🎉 Room is full (${currentCount}/${room.maxPlayers})!</strong><p style="margin-top:0.4rem; color:var(--success);">All players have joined. Click <strong>▶ Start Game</strong> to begin!</p>`;
        } else {
            el.gameStatusDetails.innerHTML = `<strong>🎉 Room is full (${currentCount}/${room.maxPlayers})!</strong><p style="margin-top:0.4rem; color:var(--text-muted);">Waiting for room creator to start the match...</p>`;
        }
    } else if (isReady) {
        if (isHost) {
            el.gameStatusDetails.innerHTML = `<strong>✨ Ready to start (${currentCount}/${room.maxPlayers} players)</strong><p style="margin-top:0.4rem; color:var(--success);">Minimum players reached. You can click <strong>▶ Start Game</strong> now or wait for more players.</p>`;
        } else {
            el.gameStatusDetails.innerHTML = `<strong>✨ Ready to start (${currentCount}/${room.maxPlayers} players)</strong><p style="margin-top:0.4rem; color:var(--text-muted);">Waiting for room creator to start the match...</p>`;
        }
    } else {
        el.gameStatusDetails.innerHTML = `<strong>⏳ Waiting for players to join...</strong><p style="margin-top:0.4rem; color:var(--text-muted);">${currentCount}/${room.maxPlayers} players joined (Min required: ${room.minPlayers}).</p>`;
    }
}

// ======================== ROOM & GAME MANAGEMENT ======================== //
// ======================== ROOM & GAME MANAGEMENT ======================== //

function enterRoom(room, asSpectator = null) {
    state.currentRoom = room;
    if (asSpectator !== null) {
        state.isSpectator = asSpectator;
    } else {
        state.isSpectator = !!(state.player && room && room.spectatorIds && room.spectatorIds.includes(state.player.id));
    }
    localStorage.setItem('game_platform_as_spectator', state.isSpectator ? 'true' : 'false');
    if (room && room.gameStateSummary) {
        state.currentGameState = room.gameStateSummary;
    }
    snakeTokenPositions = {};
    ludoTokenPositions = {};
    localStorage.setItem('game_platform_room_id', room.roomId);
    showScreen('gameRoomScreen');
    updateRoomState(room);

    // Inform backend WebSocket that player is active in room
    sendWsMessage('JOIN_ROOM', { asSpectator: state.isSpectator });
}

function updateRoomState(room) {
    state.currentRoom = room;
    if (room && room.roomId) {
        localStorage.setItem('game_platform_room_id', room.roomId);
    }
    if (state.player && room) {
        state.isSpectator = !!(room.spectatorIds && room.spectatorIds.includes(state.player.id));
        localStorage.setItem('game_platform_as_spectator', state.isSpectator ? 'true' : 'false');
    }
    if (room && room.gameStateSummary) {
        state.currentGameState = room.gameStateSummary;
    }
    el.roomTitle.textContent = room.name;
    el.roomGameType.textContent = formatGameType(room.gameType);
    el.roomStatusPill.textContent = formatStatus(room.status);
    el.roomStatusPill.className = `status-pill ${room.status ? room.status.toLowerCase().replace('_', '-') : ''}`;

    if (el.roomSpectatorBadge) {
        el.roomSpectatorBadge.style.display = state.isSpectator ? 'inline-flex' : 'none';
    }

    el.playerCount.textContent = room.playerIds ? room.playerIds.length : 0;
    el.maxPlayerCount.textContent = room.maxPlayers;

    // Show host start button if host and in WAITING/READY state and not spectator
    const isHost = state.player && room && state.player.id === room.hostPlayerId && !state.isSpectator;
    if (isHost && (room.status === 'READY' || room.status === 'WAITING')) {
        el.startGameBtn.style.display = 'inline-block';
        el.startGameBtn.disabled = room.playerIds.length < room.minPlayers;
    } else {
        el.startGameBtn.style.display = 'none';
    }

    // Show restart button when game is in progress or finished ONLY FOR ROOM CREATOR
    if (isHost && (room.status === 'IN_PROGRESS' || room.status === 'FINISHED' || room.status === 'DRAW')) {
        el.restartGameBtn.style.display = 'inline-block';
        el.restartGameBtn.disabled = room.playerIds.length < room.minPlayers;
    } else {
        el.restartGameBtn.style.display = 'none';
    }

    renderPlayersList(room.playerIds);
    renderSpectatorsList(room.spectatorIds);
    setupGameBoardView(room.gameType);
    updateGameDetailsBox(room, room.gameStateSummary || state.currentGameState);

    if (room.gameStateSummary) {
        updateGameState(room.gameStateSummary);
    } else if (room.gameType === 'CHESS') {
        renderChess({ status: room.status, details: {} });
    } else if (room.gameType === 'CALL_BRIDGE') {
        renderCallBridge({ status: room.status, details: { totalRounds: room.configuration?.totalRounds || 5, winCondition: room.configuration?.winCondition || 'ROUNDS', pointThreshold: room.configuration?.pointThreshold || 50 } });
    }
}

function handleStartGame() {
    sendWsMessage('START_GAME');
}

function handleRestartGame() {
    if (!state.currentRoom || !state.player) return;
    if (state.player.id !== state.currentRoom.hostPlayerId) {
        showToast('Only the room creator can restart the game', 'error');
        return;
    }
    snakeTokenPositions = {};
    ludoTokenPositions = {};
    state.chessSelectedSquare = null;
    state.chessValidMoves = [];
    sendWsMessage('RESTART_GAME');
}

function handleLeaveRoom() {
    if (!state.currentRoom) return;
    sendWsMessage('LEAVE_ROOM');
    localStorage.removeItem('game_platform_room_id');
    localStorage.removeItem('game_platform_as_spectator');
    state.currentRoom = null;
    state.isSpectator = false;
    showScreen('lobbyScreen');
    fetchRooms();
}

function renderPlayersList(playerIds) {
    if (!el.playersList) return;
    const list = playerIds || [];
    let ludoPlayerStates = null;
    const currentGState = state.currentGameState || (state.currentRoom ? state.currentRoom.gameStateSummary : null);
    if (currentGState && currentGState.details && currentGState.details.playerStates) {
        ludoPlayerStates = currentGState.details.playerStates;
    }

    el.playersList.innerHTML = list.map(id => {
        const isSelf = state.player && id === state.player.id;
        const isHost = state.currentRoom && id === state.currentRoom.hostPlayerId;
        const name = (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[id])
            || (currentGState && currentGState.details && currentGState.details.players && currentGState.details.players[id] && currentGState.details.players[id].username)
            || (currentGState && currentGState.details && currentGState.details.playerStates && currentGState.details.playerStates[id] && currentGState.details.playerStates[id].username)
            || (isSelf ? state.player.username : id);

        let colorBadge = '';
        if (ludoPlayerStates && ludoPlayerStates[id]) {
            const c = ludoPlayerStates[id].color;
            const colorDotHex = c === 'RED' ? '#ef4444' : c === 'GREEN' ? '#22c55e' : c === 'YELLOW' ? '#eab308' : '#3b82f6';
            colorBadge = `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${colorDotHex}; margin-right:6px; border:1px solid #fff;"></span><strong style="color:${colorDotHex}; font-size:0.8rem; margin-right:6px;">${c}</strong>`;
        }

        return `
            <li class="player-item">
                <span>${colorBadge}${isHost ? '👑 ' : ''}${isSelf ? `<strong>You (${escapeHtml(name)})</strong>` : escapeHtml(name)}</span>
                <span class="status-dot"></span>
            </li>
        `;
    }).join('');
}

function renderSpectatorsList(spectatorIds) {
    if (!el.spectatorsList) return;
    const list = spectatorIds || [];
    if (el.spectatorCount) {
        el.spectatorCount.textContent = list.length;
    }
    if (list.length === 0) {
        el.spectatorsList.innerHTML = '<li class="player-item muted" style="color:var(--text-muted); font-size:0.85rem;">No spectators</li>';
        return;
    }
    el.spectatorsList.innerHTML = list.map(id => {
        const isSelf = state.player && id === state.player.id;
        const name = (state.currentRoom && state.currentRoom.spectatorNames && state.currentRoom.spectatorNames[id])
            || (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[id])
            || (isSelf ? state.player.username : id);
        return `
            <li class="player-item">
                <span>👁️ ${isSelf ? `<strong>You (${escapeHtml(name)})</strong>` : escapeHtml(name)}</span>
                <span class="status-dot" style="background-color:#8b5cf6;"></span>
            </li>
        `;
    }).join('');
}

function setupGameBoardView(gameType) {
    el.ticTacToeBoardContainer.style.display = 'none';
    el.ludoBoardContainer.style.display = 'none';
    el.snakeBoardContainer.style.display = 'none';
    el.chessBoardContainer.style.display = 'none';
    if (el.callBridgeBoardContainer) el.callBridgeBoardContainer.style.display = 'none';

    const isWaitingOrReady = state.currentRoom && (state.currentRoom.status === 'WAITING' || state.currentRoom.status === 'READY');
    const waitingText = (state.currentRoom && state.currentRoom.status === 'READY')
        ? '⚡ Ready! Host can start the game'
        : '⏳ Waiting for players to join...';

    if (gameType === 'TIC_TAC_TOE') {
        el.ticTacToeBoardContainer.style.display = 'flex';
        if (isWaitingOrReady) {
            el.tttTurnIndicator.textContent = waitingText;
            el.tttTurnIndicator.style.color = 'var(--text-muted)';
        }
    } else if (gameType === 'LUDO') {
        el.ludoBoardContainer.style.display = 'flex';
        if (isWaitingOrReady) {
            el.ludoTurnIndicator.textContent = waitingText;
            el.ludoTurnIndicator.style.color = 'var(--text-muted)';
            el.ludoRollDiceBtn.disabled = true;
        }
        initLudoCanvas();
    } else if (gameType === 'SNAKE') {
        el.snakeBoardContainer.style.display = 'flex';
        if (isWaitingOrReady) {
            el.snakeTurnIndicator.textContent = waitingText;
            el.snakeTurnIndicator.style.color = 'var(--text-muted)';
            el.snakeRollDiceBtn.disabled = true;
        }
        initSnakeCanvas();
    } else if (gameType === 'CHESS') {
        el.chessBoardContainer.style.display = 'flex';
        if (isWaitingOrReady) {
            el.chessTurnIndicator.textContent = waitingText;
            el.chessTurnIndicator.style.color = 'var(--text-muted)';
        }
        initChessBoard();
    } else if (gameType === 'CALL_BRIDGE') {
        if (el.callBridgeBoardContainer) el.callBridgeBoardContainer.style.display = 'flex';
        const cbTurnIndicator = document.getElementById('cbTurnIndicator');
        if (isWaitingOrReady && cbTurnIndicator) {
            cbTurnIndicator.textContent = waitingText;
            cbTurnIndicator.style.color = 'var(--text-muted)';
        }
    }
}

function updateGameState(gameState, events) {
    if (!gameState) return;
    state.currentGameState = gameState;
    if (state.currentRoom) {
        state.currentRoom.gameStateSummary = gameState;
    }

    const type = gameState.gameType || (state.currentRoom ? state.currentRoom.gameType : null);
    const isHost = state.player && state.currentRoom && state.player.id === state.currentRoom.hostPlayerId && !state.isSpectator;

    if (gameState.status === 'FINISHED' || gameState.status === 'DRAW') {
        if (state.currentRoom) {
            state.currentRoom.status = gameState.status;
            el.roomStatusPill.textContent = formatStatus(gameState.status);
            el.roomStatusPill.className = `status-pill ${gameState.status ? gameState.status.toLowerCase().replace('_', '-') : ''}`;
            if (isHost) {
                el.restartGameBtn.style.display = 'inline-block';
                el.restartGameBtn.disabled = state.currentRoom.playerIds.length < state.currentRoom.minPlayers;
            } else {
                el.restartGameBtn.style.display = 'none';
            }
        }
        if (type === 'CALL_BRIDGE') {
            setTimeout(() => showGameOverModal(gameState, type), 3000);
        } else {
            showGameOverModal(gameState, type);
        }
    } else if (gameState.status === 'IN_PROGRESS') {
        if (state.currentRoom) {
            state.currentRoom.status = gameState.status;
            el.roomStatusPill.textContent = formatStatus(gameState.status);
            el.roomStatusPill.className = `status-pill in-progress`;
            if (isHost) {
                el.restartGameBtn.style.display = 'inline-block';
                el.restartGameBtn.disabled = state.currentRoom.playerIds.length < state.currentRoom.minPlayers;
            } else {
                el.restartGameBtn.style.display = 'none';
            }
        }
    }

    if (state.currentRoom) {
        updateGameDetailsBox(state.currentRoom, gameState);
        renderPlayersList(state.currentRoom.playerIds);
        renderSpectatorsList(state.currentRoom.spectatorIds);
    }

    if (type === 'TIC_TAC_TOE') {
        renderTicTacToe(gameState);
    } else if (type === 'LUDO') {
        renderLudo(gameState, events);
    } else if (type === 'SNAKE') {
        renderSnake(gameState, events);
    } else if (type === 'CHESS') {
        renderChess(gameState);
    } else if (type === 'CALL_BRIDGE') {
        renderCallBridge(gameState, events);
    }
}

function showGameOverModal(gameState, gameType) {
    if (!el.gameOverModal || !gameState) return;
    const isFinished = gameState.status === 'FINISHED';
    const isDraw = gameState.status === 'DRAW';
    if (!isFinished && !isDraw) return;

    const matchId = (gameState.gameId || (state.currentRoom ? state.currentRoom.roomId : '')) + '_' + (gameState.sequence || 0) + '_' + gameState.status;
    if (state.lastGameOverShownGameId === matchId) return;
    state.lastGameOverShownGameId = matchId;

    const winnerRaw = gameState.winner;
    const winnerIds = winnerRaw ? winnerRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const isWinner = state.player && winnerIds.includes(state.player.id);
    const isMultiWinner = winnerIds.length > 1;
    const isSpectator = state.isSpectator;
    const isHost = state.player && state.currentRoom && state.player.id === state.currentRoom.hostPlayerId && !state.isSpectator;

    function resolveWinnerName(wId) {
        return (gameState && gameState.details && gameState.details.players && gameState.details.players[wId] && gameState.details.players[wId].username)
            || (gameState && gameState.details && gameState.details.playerStates && gameState.details.playerStates[wId] && gameState.details.playerStates[wId].username)
            || (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[wId])
            || wId;
    }
    const winnerId = winnerIds[0] || null;
    const winnerNames = winnerIds.map(resolveWinnerName);
    const winnerName = winnerNames.join(', ');

    if (isDraw) {
        if (el.gameOverIcon) el.gameOverIcon.textContent = '🤝';
        if (el.gameOverTrophy) el.gameOverTrophy.textContent = '⚖️';
        if (el.gameOverTitle) el.gameOverTitle.textContent = 'Match Drawn!';
        if (el.gameOverWinner) el.gameOverWinner.textContent = "It's a Draw!";
        if (el.gameOverSubtitle) el.gameOverSubtitle.textContent = 'Both sides demonstrated equal skill and strategy!';
    } else if (isWinner && isMultiWinner) {
        if (el.gameOverIcon) el.gameOverIcon.textContent = '🏆';
        if (el.gameOverTrophy) el.gameOverTrophy.textContent = '🤝';
        if (el.gameOverTitle) el.gameOverTitle.textContent = "It's a Tie! 🎉";
        if (el.gameOverWinner) el.gameOverWinner.textContent = 'You Won (Tied)!';
        if (el.gameOverSubtitle) el.gameOverSubtitle.textContent = `Tied with: ${escapeHtml(winnerNames.filter(n => n !== (state.player && state.player.username)).join(', '))}. Congratulations!`;
    } else if (isWinner) {
        if (el.gameOverIcon) el.gameOverIcon.textContent = '🏆';
        if (el.gameOverTrophy) el.gameOverTrophy.textContent = '👑';
        if (el.gameOverTitle) el.gameOverTitle.textContent = 'Victory! 🎉';
        if (el.gameOverWinner) el.gameOverWinner.textContent = 'You Won!';
        if (el.gameOverSubtitle) el.gameOverSubtitle.textContent = 'Outstanding performance! Congratulations on your victory!';
    } else if (isSpectator) {
        if (el.gameOverIcon) el.gameOverIcon.textContent = '🏁';
        if (el.gameOverTrophy) el.gameOverTrophy.textContent = '🏆';
        if (el.gameOverTitle) el.gameOverTitle.textContent = 'Match Finished!';
        if (el.gameOverWinner) el.gameOverWinner.textContent = isMultiWinner ? `${winnerName ? escapeHtml(winnerName) : 'Players'} Tied!` : `${winnerName ? escapeHtml(winnerName) : 'Player'} Won!`;
        if (el.gameOverSubtitle) el.gameOverSubtitle.textContent = 'Game concluded. Spectator mode active.';
    } else {
        if (el.gameOverIcon) el.gameOverIcon.textContent = '🏁';
        if (el.gameOverTrophy) el.gameOverTrophy.textContent = isMultiWinner ? '🤝' : '👑';
        if (el.gameOverTitle) el.gameOverTitle.textContent = isMultiWinner ? "It's a Tie!" : 'Game Over';
        if (el.gameOverWinner) el.gameOverWinner.textContent = isMultiWinner ? `${winnerName ? escapeHtml(winnerName) : 'Players'} Tied!` : `${winnerName ? escapeHtml(winnerName) : 'Winner'} Wins!`;
        if (el.gameOverSubtitle) el.gameOverSubtitle.textContent = 'Great match! Better luck next time.';
    }

    if (el.gameOverDetails) {
        let detailsHtml = `<strong>${getGameIcon(gameType)} ${formatGameType(gameType)}</strong>`;
        if (winnerName) {
            detailsHtml += ` &bull; Winner: <span style="color:var(--accent); font-weight:700;">${escapeHtml(winnerName)}</span>`;
        }
        // Show player scores for Call Bridge
        if (gameType === 'CALL_BRIDGE' && gameState.details && gameState.details.totalScores) {
            const scores = gameState.details.totalScores;
            const playerNames = state.currentRoom && state.currentRoom.playerNames ? state.currentRoom.playerNames : {};
            const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
            detailsHtml += '<table style="width:100%;margin-top:10px;border-collapse:collapse;font-size:0.95em">';
            detailsHtml += '<tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border)">Player</th><th style="text-align:right;padding:4px 8px;border-bottom:1px solid var(--border)">Score</th></tr>';
            for (const [pid, score] of sorted) {
                const name = escapeHtml(playerNames[pid] || pid);
                const isWin = winnerIds.includes(pid);
                detailsHtml += `<tr><td style="padding:4px 8px">${isWin ? '🏆 ' : ''}${name}</td><td style="text-align:right;padding:4px 8px;font-weight:${isWin ? '700' : '400'};color:${isWin ? 'var(--accent)' : 'inherit'}">${score}</td></tr>`;
            }
            detailsHtml += '</table>';
        }
        el.gameOverDetails.innerHTML = detailsHtml;
    }

    if (el.gameOverRestartBtn) {
        el.gameOverRestartBtn.style.display = isHost ? 'inline-block' : 'none';
        el.gameOverRestartBtn.disabled = state.currentRoom && state.currentRoom.playerIds.length < state.currentRoom.minPlayers;
    }

    el.gameOverModal.style.display = 'flex';
}

