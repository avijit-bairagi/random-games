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
    lastSnakeState: null
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
                lateJoinAllowed: false
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
        default: return gameType;
    }
}

function getGameIcon(gameType) {
    if (!gameType) return '🎮';
    switch (gameType.toUpperCase()) {
        case 'TIC_TAC_TOE': return '❌';
        case 'LUDO': return '🎲';
        case 'SNAKE': return '🐍';
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
        } else {
            gameDesc = 'Match in progress.';
        }
        el.gameStatusDetails.innerHTML = `<strong>🎮 Match In Progress</strong><p style="margin-top:0.4rem; color:var(--text-muted);">${gameDesc}</p>`;
    } else if (room.status === 'FINISHED' || (gameState && (gameState.status === 'FINISHED' || gameState.status === 'DRAW'))) {
        const winner = gameState ? gameState.winner : null;
        let finishMsg = '';
        if (winner) {
            const isMe = state.player && winner === state.player.id;
            const winnerName = (gameState && gameState.details && gameState.details.players && gameState.details.players[winner] && gameState.details.players[winner].username)
                || (gameState && gameState.details && gameState.details.playerStates && gameState.details.playerStates[winner] && gameState.details.playerStates[winner].username)
                || (room && room.playerNames && room.playerNames[winner])
                || (isMe ? state.player.username : winner);
            finishMsg = `🏆 Winner: <strong>${isMe ? 'You (' + escapeHtml(winnerName) + ')' : escapeHtml(winnerName)}</strong>!`;
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
        showGameOverModal(gameState, type);
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

    const winnerId = gameState.winner;
    const isWinner = state.player && winnerId && winnerId === state.player.id;
    const isSpectator = state.isSpectator;
    const isHost = state.player && state.currentRoom && state.player.id === state.currentRoom.hostPlayerId && !state.isSpectator;

    const winnerName = (gameState && gameState.details && gameState.details.players && gameState.details.players[winnerId] && gameState.details.players[winnerId].username)
        || (gameState && gameState.details && gameState.details.playerStates && gameState.details.playerStates[winnerId] && gameState.details.playerStates[winnerId].username)
        || (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[winnerId])
        || (isWinner ? state.player.username : winnerId);

    if (isDraw) {
        if (el.gameOverIcon) el.gameOverIcon.textContent = '🤝';
        if (el.gameOverTrophy) el.gameOverTrophy.textContent = '⚖️';
        if (el.gameOverTitle) el.gameOverTitle.textContent = 'Match Drawn!';
        if (el.gameOverWinner) el.gameOverWinner.textContent = "It's a Draw!";
        if (el.gameOverSubtitle) el.gameOverSubtitle.textContent = 'Both sides demonstrated equal skill and strategy!';
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
        if (el.gameOverWinner) el.gameOverWinner.textContent = `${winnerName ? escapeHtml(winnerName) : 'Player'} Won!`;
        if (el.gameOverSubtitle) el.gameOverSubtitle.textContent = 'Game concluded. Spectator mode active.';
    } else {
        if (el.gameOverIcon) el.gameOverIcon.textContent = '🏁';
        if (el.gameOverTrophy) el.gameOverTrophy.textContent = '👑';
        if (el.gameOverTitle) el.gameOverTitle.textContent = 'Game Over';
        if (el.gameOverWinner) el.gameOverWinner.textContent = `${winnerName ? escapeHtml(winnerName) : 'Winner'} Wins!`;
        if (el.gameOverSubtitle) el.gameOverSubtitle.textContent = 'Great match! Better luck next time.';
    }

    if (el.gameOverDetails) {
        let detailsHtml = `<strong>${getGameIcon(gameType)} ${formatGameType(gameType)}</strong>`;
        if (winnerName) {
            detailsHtml += ` &bull; Winner: <span style="color:var(--accent); font-weight:700;">${escapeHtml(winnerName)}</span>`;
        }
        el.gameOverDetails.innerHTML = detailsHtml;
    }

    if (el.gameOverRestartBtn) {
        el.gameOverRestartBtn.style.display = isHost ? 'inline-block' : 'none';
        el.gameOverRestartBtn.disabled = state.currentRoom && state.currentRoom.playerIds.length < state.currentRoom.minPlayers;
    }

    el.gameOverModal.style.display = 'flex';
}

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

// ======================== DICE ANIMATION & VISUALS ======================== //

let isLudoDiceRolling = false;
let isSnakeDiceRolling = false;

function updateDiceFace(element, value, isRolling) {
    if (!element) return;
    element.innerHTML = '';
    
    if (isRolling) {
        element.className = 'dice-face rolling';
        // Random pips during spin
        const randomVal = Math.floor(Math.random() * 6) + 1;
        element.classList.add(`dice-${randomVal}`);
        for (let i = 0; i < randomVal; i++) {
            const pip = document.createElement('span');
            pip.className = 'pip';
            element.appendChild(pip);
        }
        return;
    }

    element.classList.remove('rolling');
    const num = (value >= 1 && value <= 6) ? value : 1;
    element.className = `dice-face dice-${num}`;
    for (let i = 0; i < num; i++) {
        const pip = document.createElement('span');
        pip.className = 'pip';
        element.appendChild(pip);
    }
}

function triggerDiceRollAnimation(type, rollerName, finalValue, callback) {
    const isSnake = type === 'SNAKE';
    const diceElement = isSnake ? el.snakeDiceResultDisplay : el.diceResultDisplay;
    const centerOverlay = isSnake ? el.snakeCenterDiceOverlay : el.ludoCenterDiceOverlay;
    const centerDisplay = isSnake ? el.snakeCenterDiceDisplay : el.ludoCenterDiceDisplay;
    const centerTitle = isSnake ? el.snakeCenterDiceTitle : el.ludoCenterDiceTitle;
    const centerResult = isSnake ? el.snakeCenterDiceResultText : el.ludoCenterDiceResultText;
    const rollBtn = isSnake ? el.snakeRollDiceBtn : el.ludoRollDiceBtn;
    
    if (isSnake) isSnakeDiceRolling = true;
    else isLudoDiceRolling = true;

    if (rollBtn) rollBtn.disabled = true;

    if (centerOverlay) {
        if (centerTitle) centerTitle.textContent = `${rollerName || 'Player'} is rolling...`;
        if (centerResult) centerResult.textContent = 'Rolling dice...';
        centerOverlay.style.display = 'flex';
    }

    let iterations = 0;
    const interval = setInterval(() => {
        updateDiceFace(diceElement, null, true);
        if (centerDisplay) updateDiceFace(centerDisplay, null, true);
        iterations++;
        if (iterations > 12) {
            clearInterval(interval);
            const rollNum = (finalValue >= 1 && finalValue <= 6) ? finalValue : 1;
            updateDiceFace(diceElement, rollNum, false);
            if (centerDisplay) updateDiceFace(centerDisplay, rollNum, false);
            if (centerResult) {
                centerResult.textContent = `🎲 Rolled a ${rollNum}${rollNum === 6 ? ' (BONUS ROLL!)' : '!'}`;
            }

            setTimeout(() => {
                if (centerOverlay) centerOverlay.style.display = 'none';
                if (isSnake) isSnakeDiceRolling = false;
                else isLudoDiceRolling = false;
                if (callback) callback();
            }, 850);
        }
    }, 60);
}

// ======================== LUDO RENDERER & ANIMATIONS ======================== //

let ludoCtx = null;
let ludoTokenPositions = {}; // key: `${color}_${pieceId}` -> { x, y, currentStep, inYard }
let currentRenderedLudoTokens = {}; // key: `${color}_${pieceId}` -> { x, y }
let isLudoAnimating = false;
let ludoAutoMoveTimer = null;
let lastAutoMovedTurnKey = null;
let lastLudoTapTime = 0;

function initLudoCanvas() {
    ludoCtx = el.ludoCanvas.getContext('2d');
    drawLudoBoard(null);
}

function handleLudoCanvasHover(e) {
    if (!state.currentRoom || !state.player || state.isSpectator) {
        el.ludoCanvas.style.cursor = 'default';
        return;
    }
    const gameState = state.currentGameState || (state.currentRoom ? state.currentRoom.gameStateSummary : null);
    if (!gameState || gameState.status !== 'IN_PROGRESS') {
        el.ludoCanvas.style.cursor = 'default';
        return;
    }
    const details = gameState.details || gameState;
    if (details.currentPlayerId !== state.player.id || details.turnPhase !== 'MOVING' || isLudoAnimating || isLudoDiceRolling) {
        el.ludoCanvas.style.cursor = 'default';
        return;
    }

    const pState = details.playerStates ? details.playerStates[state.player.id] : null;
    if (!pState || !details.movablePieceIndices || details.movablePieceIndices.length === 0) {
        el.ludoCanvas.style.cursor = 'default';
        return;
    }

    const rect = el.ludoCanvas.getBoundingClientRect();
    const scaleX = el.ludoCanvas.width / rect.width;
    const scaleY = el.ludoCanvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const cs = 40;
    let isHoveringMovable = false;
    for (const idx of details.movablePieceIndices) {
        const p = pState.pieces ? pState.pieces[idx] : null;
        if (p && (p.isFinished || p.finished || p.step >= 57)) continue;

        const tokenKey = `${pState.color}_${idx}`;
        let pos = currentRenderedLudoTokens[tokenKey];
        if (!pos) {
            if (pState.pieces[idx].inYard) {
                pos = getLudoYardCoordinate(pState.color, idx, cs);
            } else {
                pos = getLudoBoardCoordinate(pState.color, pState.pieces[idx].step, cs);
            }
        }

        const dist = Math.hypot(mouseX - pos.x, mouseY - pos.y);
        const badgeDist = Math.hypot(mouseX - pos.x, mouseY - (pos.y - 21));
        let baseDist = Infinity;
        if (pos.baseX !== undefined && pos.baseY !== undefined) {
            baseDist = Math.hypot(mouseX - pos.baseX, mouseY - pos.baseY);
        }
        if (Math.min(dist, badgeDist, baseDist) <= 34) {
            isHoveringMovable = true;
            break;
        }
    }
    el.ludoCanvas.style.cursor = isHoveringMovable ? 'pointer' : 'default';
}

function handleLudoCanvasTap(e) {
    const now = Date.now();
    if (now - lastLudoTapTime < 200) return; // Debounce rapid pointer/click triggers

    if (!state.currentRoom || !state.player || state.isSpectator) return;
    const gameState = state.currentGameState || (state.currentRoom ? state.currentRoom.gameStateSummary : null);
    if (!gameState || gameState.status !== 'IN_PROGRESS') return;
    const details = gameState.details || gameState;
    if (details.currentPlayerId !== state.player.id || details.turnPhase !== 'MOVING' || isLudoAnimating || isLudoDiceRolling) return;

    const pState = details.playerStates ? details.playerStates[state.player.id] : null;
    if (!pState || !details.movablePieceIndices || details.movablePieceIndices.length === 0) return;

    const rect = el.ludoCanvas.getBoundingClientRect();
    const scaleX = el.ludoCanvas.width / rect.width;
    const scaleY = el.ludoCanvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }

    if (clientX === undefined || clientY === undefined) return;

    const clickX = (clientX - rect.left) * scaleX;
    const clickY = (clientY - rect.top) * scaleY;

    const cs = 40;
    let bestIdx = null;
    let bestDist = 42; // Generous tap radius for desktop and mobile

    for (const idx of details.movablePieceIndices) {
        const p = pState.pieces ? pState.pieces[idx] : null;
        if (p && (p.isFinished || p.finished || p.step >= 57)) continue;

        const tokenKey = `${pState.color}_${idx}`;
        let pos = currentRenderedLudoTokens[tokenKey];
        if (!pos) {
            if (pState.pieces[idx].inYard) {
                pos = getLudoYardCoordinate(pState.color, idx, cs);
            } else {
                pos = getLudoBoardCoordinate(pState.color, pState.pieces[idx].step, cs);
            }
        }

        const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
        const badgeDist = Math.hypot(clickX - pos.x, clickY - (pos.y - 21));
        let baseDist = Infinity;
        if (pos.baseX !== undefined && pos.baseY !== undefined) {
            baseDist = Math.hypot(clickX - pos.baseX, clickY - pos.baseY);
        }
        const effectiveDist = Math.min(dist, badgeDist, baseDist);

        if (effectiveDist < bestDist) {
            bestDist = effectiveDist;
            bestIdx = idx;
        }
    }

    if (bestIdx !== null) {
        lastLudoTapTime = now;
        if (e.preventDefault && e.cancelable) e.preventDefault();
        window.makeLudoMove(bestIdx);
    }
}

function checkAndTriggerLudoAutoPlay(gameState) {
    if (state.isSpectator) return;
    if (!gameState || gameState.status !== 'IN_PROGRESS' || !state.player) return;
    const details = gameState.details || gameState;
    if (details.currentPlayerId !== state.player.id || details.turnPhase !== 'MOVING') {
        if (ludoAutoMoveTimer) {
            clearTimeout(ludoAutoMoveTimer);
            ludoAutoMoveTimer = null;
        }
        return;
    }

    if (isLudoDiceRolling || isLudoAnimating) return;

    const pState = details.playerStates ? details.playerStates[state.player.id] : null;
    if (!pState || !details.movablePieceIndices || details.movablePieceIndices.length === 0) return;

    // Filter out finished pieces
    const movableIndices = details.movablePieceIndices.filter(idx => {
        const p = pState.pieces ? pState.pieces[idx] : null;
        return p && !p.isFinished && !p.finished && p.step < 57;
    });

    if (movableIndices.length === 0) return;

    const movablePieces = movableIndices.map(idx => pState.pieces[idx]).filter(Boolean);

    // Check if there is only 1 movable piece OR all movable pieces share identical step & yard state
    const firstP = movablePieces[0];
    const allSamePosition = movablePieces.every(p => p.step === firstP.step && p.inYard === firstP.inYard);

    if (movableIndices.length === 1 || allSamePosition) {
        const pieceIdx = movableIndices[0];
        const turnKey = `${details.currentPlayerId}_seq${gameState.sequence || 0}_roll${details.lastDiceRoll}_idx${pieceIdx}`;
        if (lastAutoMovedTurnKey === turnKey) return;

        lastAutoMovedTurnKey = turnKey;

        if (ludoAutoMoveTimer) clearTimeout(ludoAutoMoveTimer);
        ludoAutoMoveTimer = setTimeout(() => {
            ludoAutoMoveTimer = null;
            window.makeLudoMove(pieceIdx);
        }, 400);
    }
}

function syncLudoTokenPositions(details) {
    if (!details || !details.playerStates) return;
    const cs = 40;
    Object.values(details.playerStates).forEach(ps => {
        const pColor = ps.color;
        ps.pieces.forEach((p, idx) => {
            const tokenKey = `${pColor}_${idx}`;
            const isFinished = p.finished || p.isFinished || p.step >= 57;
            if (p.inYard || p.step < 0) {
                const yardPos = getLudoYardCoordinate(pColor, idx, cs);
                ludoTokenPositions[tokenKey] = {
                    x: yardPos.x,
                    y: yardPos.y,
                    inYard: true,
                    currentStep: -1,
                    finished: false
                };
            } else if (isFinished) {
                const goalPos = getLudoGoalCoordinate(pColor, idx, cs);
                ludoTokenPositions[tokenKey] = {
                    x: goalPos.x,
                    y: goalPos.y,
                    inYard: false,
                    currentStep: 57,
                    finished: true
                };
            } else if (!isLudoAnimating || !ludoTokenPositions[tokenKey]) {
                const trackPos = getLudoBoardCoordinate(pColor, p.step, cs);
                ludoTokenPositions[tokenKey] = {
                    x: trackPos.x,
                    y: trackPos.y,
                    inYard: false,
                    currentStep: p.step,
                    finished: false
                };
            }
        });
    });
}

function updateLudoUI(gameState) {
    const details = gameState.details || gameState;
    const isMyTurn = details.currentPlayerId === state.player.id;
    const color = details.currentColor;

    if (!isMyTurn || details.turnPhase === 'ROLLING') {
        lastAutoMovedTurnKey = null;
    }

    // Detect current player's assigned color in this game
    let myColor = null;
    if (details.playerStates && details.playerStates[state.player.id]) {
        myColor = details.playerStates[state.player.id].color;
    }

    if (myColor) {
        el.ludoMyColorBadge.style.display = 'inline-flex';
        el.ludoMyColorText.textContent = myColor;
        el.ludoMyColorText.className = `color-highlight ${myColor}`;
    } else {
        el.ludoMyColorBadge.style.display = 'none';
    }

    if (gameState.status === 'FINISHED') {
        const winnerColor = (gameState.winner && details.playerStates && details.playerStates[gameState.winner]) 
            ? details.playerStates[gameState.winner].color 
            : null;
        el.ludoTurnIndicator.textContent = gameState.winner 
            ? `🏆 ${gameState.winner === state.player.id ? 'You Won!' : 'Winner: ' + (winnerColor ? winnerColor + ' (' + gameState.winner + ')' : gameState.winner)}` 
            : 'Match Finished';
        el.ludoTurnIndicator.style.color = 'var(--success)';
        el.ludoRollDiceBtn.disabled = true;
    } else if (gameState.status === 'WAITING' || gameState.status === 'READY' || (state.currentRoom && state.currentRoom.status !== 'IN_PROGRESS')) {
        el.ludoTurnIndicator.textContent = (state.currentRoom && state.currentRoom.status === 'READY')
            ? '⚡ Ready! Host can start the game'
            : '⏳ Waiting for players to join...';
        el.ludoTurnIndicator.style.color = 'var(--text-muted)';
        el.ludoRollDiceBtn.disabled = true;
    } else {
        const pState = (details.playerStates && state.player) ? details.playerStates[state.player.id] : null;
        let isSingleAuto = false;
        if (isMyTurn && details.turnPhase === 'MOVING' && pState && details.movablePieceIndices && details.movablePieceIndices.length > 0) {
            const movablePieces = details.movablePieceIndices.map(idx => pState.pieces[idx]).filter(Boolean);
            if (movablePieces.length === 1) {
                isSingleAuto = true;
            } else if (movablePieces.length > 1) {
                const firstP = movablePieces[0];
                isSingleAuto = movablePieces.every(p => p.step === firstP.step && p.inYard === firstP.inYard);
            }
        }

        el.ludoTurnIndicator.textContent = isMyTurn 
            ? (details.turnPhase === 'ROLLING' ? 'Your Turn - Roll Dice 🎲' : (isSingleAuto ? 'Auto Moving...' : '👉 Tap your highlighted piece to move'))
            : `${color}'s Turn (${details.turnPhase === 'ROLLING' ? 'Rolling...' : 'Moving...'})`;
        el.ludoTurnIndicator.style.color = isMyTurn ? 'var(--primary)' : 'var(--text-muted)';
        el.ludoRollDiceBtn.disabled = !(isMyTurn && details.turnPhase === 'ROLLING' && gameState.status === 'IN_PROGRESS' && !isLudoDiceRolling && !isLudoAnimating);
    }

    if (!isLudoDiceRolling) {
        updateDiceFace(el.diceResultDisplay, details.lastDiceRoll, false);
    }

    checkAndTriggerLudoAutoPlay(gameState);
}

async function renderLudo(gameState, events) {
    const details = gameState.details || gameState;
    if (!ludoCtx) initLudoCanvas();

    // 1. Process capture events immediately so target piece is reset to yard instantly in tracking
    if (events && events.length > 0) {
        events.forEach(evt => {
            if (evt.eventType === 'PIECE_CAPTURED' && evt.payload) {
                const capColor = evt.payload.capturedColor;
                const capIdx = evt.payload.capturedPieceIndex;
                if (capColor && capIdx !== undefined) {
                    const capKey = `${capColor}_${capIdx}`;
                    const yardPos = getLudoYardCoordinate(capColor, capIdx, 40);
                    ludoTokenPositions[capKey] = {
                        x: yardPos.x,
                        y: yardPos.y,
                        inYard: true,
                        currentStep: -1,
                        finished: false
                    };
                }
            }
        });
    }

    syncLudoTokenPositions(details);

    // Check for dice roll event
    const diceEvt = events && events.find(e => e.eventType === 'DICE_ROLLED');
    if (diceEvt && diceEvt.payload && diceEvt.payload.dice !== undefined) {
        const rollerState = details.playerStates ? details.playerStates[diceEvt.playerId] : null;
        const rollerColor = rollerState ? rollerState.color : 'Player';
        const rollerName = details.players && details.players[diceEvt.playerId] ? details.players[diceEvt.playerId].username : `${rollerColor}`;
        triggerDiceRollAnimation('LUDO', `${rollerName} (${rollerColor})`, diceEvt.payload.dice, () => {
            syncLudoTokenPositions(details);
            drawLudoBoard(details);
            updateLudoUI(gameState);
        });
        return;
    }

    // Check for piece movement events
    const moveEvt = events && events.find(e => e.eventType === 'PIECE_MOVED' || e.eventType === 'PIECE_ENTERED_TRACK' || e.eventType === 'PIECE_REACHED_HOME');
    if (moveEvt && moveEvt.payload) {
        await animateLudoMove(gameState, moveEvt);
    } else {
        syncLudoTokenPositions(details);
        drawLudoBoard(details);
        updateLudoUI(gameState);
    }
}

async function animateLudoMove(gameState, moveEvt) {
    const details = gameState.details || gameState;
    const pColor = moveEvt.payload.color;
    const pieceIdx = moveEvt.payload.pieceIndex;
    const targetStep = (moveEvt.eventType === 'PIECE_ENTERED_TRACK') ? 0 : (moveEvt.eventType === 'PIECE_REACHED_HOME' ? 57 : (moveEvt.payload.step || 0));

    const tokenKey = `${pColor}_${pieceIdx}`;
    const tokenInfo = ludoTokenPositions[tokenKey] || { inYard: true, currentStep: -1 };
    const startStep = tokenInfo.inYard ? -1 : tokenInfo.currentStep;

    isLudoAnimating = true;
    updateLudoUI(gameState);

    const cs = 40;

    try {
        if (startStep === -1 && targetStep === 0) {
            // Exiting Yard to Start Tile (Step 0)
            const yardCoord = getLudoYardCoordinate(pColor, pieceIdx, cs);
            const startCoord = getLudoBoardCoordinate(pColor, 0, cs);

            await new Promise(resolve => {
                runAnimation(400, (t) => {
                    const hop = Math.sin(t * Math.PI) * 20;
                    const x = yardCoord.x + (startCoord.x - yardCoord.x) * t;
                    const y = yardCoord.y + (startCoord.y - yardCoord.y) * t - hop;
                    ludoTokenPositions[tokenKey] = { x, y, currentStep: 0, inYard: false, finished: false };
                    drawLudoBoard(details);
                }, resolve);
            });
        } else if (startStep >= 0 && targetStep > startStep) {
            // Step-by-step tile hopping
            for (let s = startStep + 1; s <= Math.min(targetStep, 56); s++) {
                const p1 = getLudoBoardCoordinate(pColor, s - 1, cs);
                const p2 = getLudoBoardCoordinate(pColor, s, cs);

                await new Promise(resolve => {
                    runAnimation(220, (t) => {
                        const hop = Math.sin(t * Math.PI) * 16;
                        const x = p1.x + (p2.x - p1.x) * t;
                        const y = p1.y + (p2.y - p1.y) * t - hop;
                        ludoTokenPositions[tokenKey] = { x, y, currentStep: s, inYard: false, finished: false };
                        drawLudoBoard(details);
                    }, resolve);
                });
            }

            if (targetStep >= 57) {
                // Animate entering home goal
                const p56 = getLudoBoardCoordinate(pColor, 56, cs);
                const pGoal = getLudoGoalCoordinate(pColor, pieceIdx, cs);

                await new Promise(resolve => {
                    runAnimation(300, (t) => {
                        const hop = Math.sin(t * Math.PI) * 14;
                        const x = p56.x + (pGoal.x - p56.x) * t;
                        const y = p56.y + (pGoal.y - p56.y) * t - hop;
                        ludoTokenPositions[tokenKey] = { x, y, currentStep: 57, inYard: false, finished: true };
                        drawLudoBoard(details);
                    }, resolve);
                });
            }
        }

        // Update final position
        if (targetStep >= 57) {
            const goalCoord = getLudoGoalCoordinate(pColor, pieceIdx, cs);
            ludoTokenPositions[tokenKey] = {
                inYard: false,
                currentStep: 57,
                finished: true,
                x: goalCoord.x,
                y: goalCoord.y
            };
        } else {
            const trackCoord = getLudoBoardCoordinate(pColor, targetStep, cs);
            ludoTokenPositions[tokenKey] = {
                inYard: false,
                currentStep: targetStep,
                finished: false,
                x: trackCoord.x,
                y: trackCoord.y
            };
        }
    } finally {
        isLudoAnimating = false;
        syncLudoTokenPositions(details);
        drawLudoBoard(details);
        updateLudoUI(gameState);
    }
}

window.makeLudoMove = function(pieceIndex) {
    if (state.isSpectator) return;
    sendGameAction({ action: 'MOVE_PIECE', pieceIndex });
};

function drawLudoBoard(details) {
    if (!ludoCtx) return;
    const ctx = ludoCtx;
    const w = 600;
    const h = 600;
    const cs = 40; // cell size (15x15 grid)

    ctx.clearRect(0, 0, w, h);

    // Deep modern board background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Color theme definitions
    const colors = {
        RED: '#ef4444',
        GREEN: '#22c55e',
        YELLOW: '#eab308',
        BLUE: '#3b82f6'
    };
    const darkColors = {
        RED: '#dc2626',
        GREEN: '#16a34a',
        YELLOW: '#ca8a04',
        BLUE: '#2563eb'
    };

    // Current player's assigned color
    let myColor = null;
    if (details && details.playerStates && details.playerStates[state.player.id]) {
        myColor = details.playerStates[state.player.id].color;
    }

    // 1. Draw 4 Corner Home Yards
    drawLudoYard(ctx, 0, 0, cs * 6, cs * 6, colors.RED, darkColors.RED, 'RED', myColor === 'RED', cs);
    drawLudoYard(ctx, cs * 9, 0, cs * 6, cs * 6, colors.GREEN, darkColors.GREEN, 'GREEN', myColor === 'GREEN', cs);
    drawLudoYard(ctx, 0, cs * 9, cs * 6, cs * 6, colors.BLUE, darkColors.BLUE, 'BLUE', myColor === 'BLUE', cs);
    drawLudoYard(ctx, cs * 9, cs * 9, cs * 6, cs * 6, colors.YELLOW, darkColors.YELLOW, 'YELLOW', myColor === 'YELLOW', cs);

    // 2. Draw Track Grid (Center Paths & Cells)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;

    // Standard Track Outline
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            // Only draw cells not covered by yards and center finish
            const inYardArea = (i < 6 && j < 6) || (i >= 9 && j < 6) || (i < 6 && j >= 9) || (i >= 9 && j >= 9);
            const inCenterArea = (i >= 6 && i < 9 && j >= 6 && j < 9);

            if (!inYardArea && !inCenterArea) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(i * cs, j * cs, cs, cs);
                ctx.strokeRect(i * cs, j * cs, cs, cs);
            }
        }
    }

    // 3. Draw Colored Home Pathways & Starting Cells
    // RED Home Column & Start Cell [1, 6]
    ctx.fillStyle = colors.RED;
    for (let i = 1; i < 6; i++) {
        drawColoredTrackCell(ctx, i * cs, 7 * cs, cs, colors.RED);
    }
    drawColoredTrackCell(ctx, 1 * cs, 6 * cs, cs, colors.RED, '★ RED START');

    // GREEN Home Column & Start Cell [8, 1]
    ctx.fillStyle = colors.GREEN;
    for (let j = 1; j < 6; j++) {
        drawColoredTrackCell(ctx, 7 * cs, j * cs, cs, colors.GREEN);
    }
    drawColoredTrackCell(ctx, 8 * cs, 1 * cs, cs, colors.GREEN, '★ GREEN START');

    // YELLOW Home Column & Start Cell [13, 8]
    ctx.fillStyle = colors.YELLOW;
    for (let i = 9; i < 14; i++) {
        drawColoredTrackCell(ctx, i * cs, 7 * cs, cs, colors.YELLOW);
    }
    drawColoredTrackCell(ctx, 13 * cs, 8 * cs, cs, colors.YELLOW, '★ YELLOW START');

    // BLUE Home Column & Start Cell [6, 13]
    ctx.fillStyle = colors.BLUE;
    for (let j = 9; j < 14; j++) {
        drawColoredTrackCell(ctx, 7 * cs, j * cs, cs, colors.BLUE);
    }
    drawColoredTrackCell(ctx, 6 * cs, 13 * cs, cs, colors.BLUE, '★ BLUE START');

    // 4. Safe Star Emblems on Global Track (8 Safe Squares)
    const safeCells = [
        [1, 6], [8, 1], [13, 8], [6, 13],
        [6, 2], [12, 6], [8, 12], [2, 8]
    ];
    safeCells.forEach(([col, row]) => {
        drawSafeStar(ctx, col * cs + cs/2, row * cs + cs/2, 11);
    });

    // 5. Center Home Finish Triangle (Goal Area)
    drawLudoCenterFinish(ctx, cs, colors);

    // 6. Draw Tokens
    if (details && details.playerStates) {
        const tokenList = [];

        Object.values(details.playerStates).forEach(ps => {
            const pColor = ps.color;
            const pieceColor = colors[pColor] || '#000';
            const isUserOwner = state.player && ps.playerId === state.player.id;
            const isTurnOwner = ps.playerId === details.currentPlayerId;

            ps.pieces.forEach((p, idx) => {
                const tokenKey = `${pColor}_${idx}`;
                const isFinished = p.finished || p.isFinished || p.step >= 57;
                const isMovable = !isFinished && !state.isSpectator && isUserOwner && isTurnOwner && 
                                  details.turnPhase === 'MOVING' && 
                                  details.movablePieceIndices && details.movablePieceIndices.includes(idx);
                
                let locKey;
                let baseX, baseY;

                if (ludoTokenPositions[tokenKey] && isLudoAnimating && !isFinished) {
                    locKey = `anim_${tokenKey}`;
                    baseX = ludoTokenPositions[tokenKey].x;
                    baseY = ludoTokenPositions[tokenKey].y;
                } else if (p.inYard || p.step < 0) {
                    locKey = `yard_${pColor}_${idx}`;
                    const yardPos = getLudoYardCoordinate(pColor, idx, cs);
                    baseX = yardPos.x;
                    baseY = yardPos.y;
                } else if (isFinished) {
                    locKey = `goal_${pColor}_${idx}`;
                    const goalPos = getLudoGoalCoordinate(pColor, idx, cs);
                    baseX = goalPos.x;
                    baseY = goalPos.y;
                } else {
                    const coord = getLudoBoardCoordinate(pColor, p.step, cs);
                    locKey = `coord_${Math.round(coord.x)}_${Math.round(coord.y)}`;
                    baseX = coord.x;
                    baseY = coord.y;
                }

                tokenList.push({
                    pColor,
                    idx,
                    tokenKey,
                    piece: p,
                    pieceColor,
                    isUserOwner,
                    isTurnOwner,
                    isMovable,
                    isFinished,
                    locKey,
                    baseX,
                    baseY
                });
            });
        });

        // Group by location key to apply multi-piece offsets
        const grouped = {};
        tokenList.forEach(item => {
            if (!grouped[item.locKey]) grouped[item.locKey] = [];
            grouped[item.locKey].push(item);
        });

        const multiOffsets2 = [
            { x: -6, y: -6, scale: 0.88 },
            { x: 6, y: 6, scale: 0.88 }
        ];
        const multiOffsets3 = [
            { x: 0, y: -7, scale: 0.8 },
            { x: -7, y: 6, scale: 0.8 },
            { x: 7, y: 6, scale: 0.8 }
        ];
        const multiOffsets4 = [
            { x: -7, y: -7, scale: 0.75 },
            { x: 7, y: -7, scale: 0.75 },
            { x: -7, y: 7, scale: 0.75 },
            { x: 7, y: 7, scale: 0.75 }
        ];

        tokenList.forEach(item => {
            const group = grouped[item.locKey];
            let offsetX = 0;
            let offsetY = 0;
            let scale = 1.0;

            if (group && group.length > 1 && !item.locKey.startsWith('anim_') && !item.locKey.startsWith('goal_')) {
                const itemIdx = group.indexOf(item);
                let off;
                if (group.length === 2) {
                    off = multiOffsets2[itemIdx];
                } else if (group.length === 3) {
                    off = multiOffsets3[itemIdx];
                } else {
                    off = multiOffsets4[itemIdx % 4];
                }
                if (off) {
                    offsetX = off.x;
                    offsetY = off.y;
                    scale = off.scale;
                }
            }

            const finalX = item.baseX + offsetX;
            const finalY = item.baseY + offsetY;

            currentRenderedLudoTokens[item.tokenKey] = {
                x: finalX,
                y: finalY,
                baseX: item.baseX,
                baseY: item.baseY,
                scale: scale,
                isMovable: item.isMovable,
                isFinished: item.isFinished,
                idx: item.idx,
                pColor: item.pColor
            };

            drawLudoToken(ctx, finalX, finalY, item.pieceColor, item.isFinished ? '★' : (item.idx + 1), item.isUserOwner, item.isTurnOwner, item.isMovable, scale, item.isFinished);
        });
    }
}

function drawLudoYard(ctx, x, y, w, h, color, darkColor, name, isMyYard, cs) {
    ctx.save();
    
    // Outer Box with Gradient
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, color);
    grad.addColorStop(1, darkColor);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Yard Border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Inner White Container
    const pad = cs;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, innerW, innerH, 14);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // 4 Piece Bases (Circles inside yard)
    const subCs = innerW / 2;
    const yardOffsets = [
        { cx: x + pad + subCs * 0.5, cy: y + pad + subCs * 0.5 },
        { cx: x + pad + subCs * 1.5, cy: y + pad + subCs * 0.5 },
        { cx: x + pad + subCs * 0.5, cy: y + pad + subCs * 1.5 },
        { cx: x + pad + subCs * 1.5, cy: y + pad + subCs * 1.5 },
    ];

    yardOffsets.forEach((pos) => {
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, 18, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
    });

    // Yard Label & "YOUR BASE" Highlight
    if (isMyYard) {
        // Glowing outline for user's side
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

        // "YOU (BASE)" badge inside yard
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`👑 YOUR BASE`, x + w / 2, y + pad + innerH / 2);
    } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, x + w / 2, y + pad + innerH / 2);
    }

    ctx.restore();
}

function drawColoredTrackCell(ctx, x, y, cs, color, badgeText) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cs, cs);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cs, cs);

    // Inner subtle glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 3, y + 3, cs - 6, cs - 6);

    ctx.restore();
}

function drawSafeStar(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size / 2.2;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawLudoCenterFinish(ctx, cs, colors) {
    ctx.save();
    const cx = 7.5 * cs;
    const cy = 7.5 * cs;

    // 4 Triangles
    // Red Left Triangle
    ctx.beginPath();
    ctx.moveTo(cs * 6, cs * 6);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cs * 6, cs * 9);
    ctx.fillStyle = colors.RED;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Green Top Triangle
    ctx.beginPath();
    ctx.moveTo(cs * 6, cs * 6);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cs * 9, cs * 6);
    ctx.fillStyle = colors.GREEN;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Yellow Right Triangle
    ctx.beginPath();
    ctx.moveTo(cs * 9, cs * 6);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cs * 9, cs * 9);
    ctx.fillStyle = colors.YELLOW;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Blue Bottom Triangle
    ctx.beginPath();
    ctx.moveTo(cs * 6, cs * 9);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cs * 9, cs * 9);
    ctx.fillStyle = colors.BLUE;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Center Golden Circle with Crown / Trophy
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆', cx, cy);

    ctx.restore();
}

function drawLudoToken(ctx, x, y, color, label, isUserOwner, isTurnOwner, isMovable, scale = 1.0, isFinished = false) {
    ctx.save();

    const baseRadius = (isFinished ? 12 : 15) * scale;

    // Movable candidate highlighting & pulsing indicator
    if (isMovable && !isFinished) {
        // Outer glowing halo
        ctx.beginPath();
        ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.fill();

        // Pulsing border
        ctx.beginPath();
        ctx.arc(x, y, 19 * scale, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = Math.max(2, 3 * scale);
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small "TAP" badge above candidate token
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        const bw = 26 * scale;
        const bh = 13 * scale;
        ctx.roundRect(x - bw / 2, y - baseRadius - bh - 2, bw, bh, 3);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.max(8, Math.round(9 * scale))}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TAP', x, y - baseRadius - bh / 2 - 2);
    } else if (isTurnOwner && !isFinished) {
        ctx.beginPath();
        ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 5 * scale;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2 * scale;

    // 3D Sphere fill
    ctx.beginPath();
    ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // White rim border (or golden rim if movable or finished)
    ctx.lineWidth = isMovable ? Math.max(2, 3 * scale) : (isFinished ? Math.max(1.5, 2 * scale) : Math.max(1.5, 2.5 * scale));
    ctx.strokeStyle = isFinished ? '#fbbf24' : (isMovable ? '#fef08a' : (isUserOwner ? '#ffffff' : '#e2e8f0'));
    ctx.stroke();

    // Specular 3D highlight
    const highlight = ctx.createRadialGradient(x - 3 * scale, y - 4 * scale, 1, x, y, baseRadius);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    highlight.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius - 1, 0, Math.PI * 2);
    ctx.fill();

    // Piece Label (Number or Star)
    ctx.fillStyle = isFinished ? '#fbbf24' : '#ffffff';
    ctx.font = `bold ${Math.max(9, Math.round((isFinished ? 12 : 11) * scale))}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(label, x, y);

    ctx.restore();
}

function getLudoGoalCoordinate(color, pieceIndex, cs) {
    const offsets = [
        { ox: -7, oy: -7 },
        { ox: 7, oy: -7 },
        { ox: -7, oy: 7 },
        { ox: 7, oy: 7 }
    ];
    const off = offsets[pieceIndex % 4];

    if (color === 'RED') {
        return { x: 6.8 * cs + off.ox * 0.6, y: 7.5 * cs + off.oy * 0.6 };
    } else if (color === 'GREEN') {
        return { x: 7.5 * cs + off.ox * 0.6, y: 6.8 * cs + off.oy * 0.6 };
    } else if (color === 'YELLOW') {
        return { x: 8.2 * cs + off.ox * 0.6, y: 7.5 * cs + off.oy * 0.6 };
    } else if (color === 'BLUE') {
        return { x: 7.5 * cs + off.ox * 0.6, y: 8.2 * cs + off.oy * 0.6 };
    }
    return { x: 7.5 * cs + off.ox, y: 7.5 * cs + off.oy };
}

function getLudoYardCoordinate(color, pieceIndex, cs) {
    const pad = cs;
    const subCs = (cs * 4) / 2;
    let baseX = 0, baseY = 0;

    if (color === 'RED') { baseX = 0; baseY = 0; }
    else if (color === 'GREEN') { baseX = cs * 9; baseY = 0; }
    else if (color === 'YELLOW') { baseX = cs * 9; baseY = cs * 9; }
    else if (color === 'BLUE') { baseX = 0; baseY = cs * 9; }

    const offsets = [
        { ox: pad + subCs * 0.5, oy: pad + subCs * 0.5 },
        { ox: pad + subCs * 1.5, oy: pad + subCs * 0.5 },
        { ox: pad + subCs * 0.5, oy: pad + subCs * 1.5 },
        { ox: pad + subCs * 1.5, oy: pad + subCs * 1.5 },
    ];

    const off = offsets[pieceIndex % 4];
    return { x: baseX + off.ox, y: baseY + off.oy };
}

function getLudoBoardCoordinate(color, step, cs) {
    // 52-cell track coordinate mapping on 15x15 board
    const track = [
        [1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],
        [8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],
        [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
        [7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]
    ];

    if (step >= 0 && step <= 50) {
        let startIdx = 0;
        if (color === 'GREEN') startIdx = 13;
        if (color === 'YELLOW') startIdx = 26;
        if (color === 'BLUE') startIdx = 39;

        const globalIdx = (startIdx + step) % 52;
        const pt = track[globalIdx];
        return { x: pt[0] * cs + cs/2, y: pt[1] * cs + cs/2 };
    }

    // Home Column (51..56)
    const homeStep = step - 51; // 0..5
    if (color === 'RED') return { x: (1 + homeStep) * cs + cs/2, y: 7 * cs + cs/2 };
    if (color === 'GREEN') return { x: 7 * cs + cs/2, y: (1 + homeStep) * cs + cs/2 };
    if (color === 'YELLOW') return { x: (13 - homeStep) * cs + cs/2, y: 7 * cs + cs/2 };
    if (color === 'BLUE') return { x: 7 * cs + cs/2, y: (13 - homeStep) * cs + cs/2 };

    // Final Home Goal (Step 57)
    return { x: 7.5 * cs, y: 7.5 * cs };
}

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
    el.snakeRollDiceBtn.disabled = true;

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
        await new Promise(r => setTimeout(r, 300));
        const pStart = getSnakeLudoPosition(ladderStart);
        const pEnd = getSnakeLudoPosition(ladderEnd);
        await new Promise(resolve => {
            runAnimation(850, (t) => {
                const x = pStart.x + (pEnd.x - pStart.x) * t;
                const y = pStart.y + (pEnd.y - pStart.y) * t;
                snakeTokenPositions[movedPid] = { x, y, currentPos: ladderEnd };
                drawSnakeLudoBoard(details);
            }, resolve);
        });
    } else if (snakeEvt || (details.snakes && details.snakes[forwardTarget])) {
        const snakeHead = forwardTarget;
        const snakeTail = snakeEvt ? snakeEvt.payload.to : details.snakes[forwardTarget];
        await new Promise(r => setTimeout(r, 300));
        const { pHead, cp1, cp2, pTail } = getSnakeControlPoints(snakeHead, snakeTail);
        await new Promise(resolve => {
            runAnimation(950, (t) => {
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

// ======================== LOBBY & UI HELPERS ======================== //

function renderRooms() {
    const filtered = state.selectedGameTab === 'ALL'
        ? state.rooms
        : state.rooms.filter(r => r.gameType === state.selectedGameTab);

    if (filtered.length === 0) {
        el.roomList.innerHTML = '';
        el.noRoomsPlaceholder.style.display = 'block';
        return;
    }

    el.noRoomsPlaceholder.style.display = 'none';
    el.roomList.innerHTML = filtered.map(room => {
        const isAlreadyPlayer = state.player && room.playerIds && room.playerIds.includes(state.player.id);
        const isAlreadySpectator = state.player && room.spectatorIds && room.spectatorIds.includes(state.player.id);
        const playerCount = (room.currentPlayersCount != null) ? room.currentPlayersCount : (room.playerIds ? room.playerIds.length : 0);
        const spectatorCount = (room.spectatorCount != null) ? room.spectatorCount : (room.spectatorIds ? room.spectatorIds.length : 0);
        const isFull = playerCount >= room.maxPlayers;
        const isInProgress = room.status === 'IN_PROGRESS';
        const canJoin = !isAlreadyPlayer && !isFull && (!isInProgress || room.lateJoinAllowed);

        let joinBtn = '';
        if (isAlreadyPlayer) {
            joinBtn = `<button class="btn btn-primary" onclick="joinRoom('${room.roomId}', false)">Resume Game</button>`;
        } else if (canJoin) {
            joinBtn = `<button class="btn btn-primary" onclick="joinRoom('${room.roomId}', false)">Join Game</button>`;
        } else if (isFull) {
            joinBtn = `<button class="btn btn-secondary" disabled>Room Full</button>`;
        } else if (isInProgress) {
            joinBtn = `<button class="btn btn-secondary" disabled>In Progress</button>`;
        }

        let spectateBtn = '';
        if (room.spectatorAllowed) {
            if (isAlreadySpectator) {
                spectateBtn = `<button class="btn btn-secondary" onclick="joinRoom('${room.roomId}', true)">👁️ Watching</button>`;
            } else {
                spectateBtn = `<button class="btn btn-secondary" onclick="joinRoom('${room.roomId}', true)">👁️ Spectate</button>`;
            }
        }

        return `
        <div class="room-card">
            <div class="room-card-header">
                <span class="room-card-title">${escapeHtml(room.name)}</span>
                <span class="room-card-badge">${getGameIcon(room.gameType)} ${formatGameType(room.gameType)}</span>
            </div>
            <div class="room-card-body">
                <div class="room-stats-grid">
                    <div>👥 Players: <strong>${playerCount}/${room.maxPlayers}</strong></div>
                    <div>👁️ Spectators: <strong>${spectatorCount}</strong></div>
                </div>
                <div>Status: <span class="status-pill ${room.status ? room.status.toLowerCase().replace('_', '-') : ''}">${formatStatus(room.status)}</span></div>
            </div>
            <div class="room-card-footer">
                ${spectateBtn}
                ${joinBtn}
            </div>
        </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.joinRoom = joinRoom;

function showScreen(screenId) {
    el.welcomeScreen.style.display = 'none';
    el.lobbyScreen.style.display = 'none';
    el.gameRoomScreen.style.display = 'none';

    document.getElementById(screenId).style.display = 'block';
}

function updateMaxPlayersOptions() {
    const val = el.gameTypeSelect.value;
    if (val === 'TIC_TAC_TOE') {
        el.maxPlayersInput.innerHTML = `<option value="2" selected>2 Players</option>`;
    } else if (val === 'LUDO') {
        el.maxPlayersInput.innerHTML = `
            <option value="2">2 Players</option>
            <option value="4" selected>4 Players</option>
        `;
    } else if (val === 'SNAKE') {
        el.maxPlayersInput.innerHTML = `
            <option value="2">2 Players</option>
            <option value="3">3 Players</option>
            <option value="4" selected>4 Players</option>
        `;
    }
}

function openCreateRoomModal() {
    updateMaxPlayersOptions();
    el.createRoomModal.style.display = 'flex';
}

function closeCreateRoomModal() {
    el.createRoomModal.style.display = 'none';
}

function logEvent(msg, type = 'normal') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${time}] ${msg}`;
    el.eventsLog.appendChild(entry);
    el.eventsLog.scrollTop = el.eventsLog.scrollHeight;
}

function formatGameEvent(evt) {
    if (evt.eventType === 'MARK_PLACED') {
        logEvent(`Player marked row ${evt.payload.row + 1}, col ${evt.payload.column + 1} with ${evt.payload.mark}`);
    } else if (evt.eventType === 'DICE_ROLLED') {
        logEvent(`🎲 ${evt.payload.player || 'Player'} rolled a ${evt.payload.dice}`);
    } else if (evt.eventType === 'LADDER_CLIMBED') {
        logEvent(`🪜 ${evt.payload.player} climbed ladder from ${evt.payload.from} to ${evt.payload.to}!`, 'important');
    } else if (evt.eventType === 'SNAKE_BITTEN') {
        logEvent(`🐍 ${evt.payload.player} bitten by snake at ${evt.payload.from}, slid to ${evt.payload.to}!`, 'error');
    } else if (evt.eventType === 'PLAYER_MOVED') {
        logEvent(`➡️ ${evt.payload.player} moved to square ${evt.payload.to}`);
    } else if (evt.eventType === 'BONUS_TURN') {
        logEvent(`⭐ ${evt.payload.message}`, 'important');
    } else if (evt.eventType === 'PLAYER_WON') {
        logEvent(`🏆 ${evt.payload.winner} won the match!`, 'important');
    } else if (evt.eventType === 'PIECE_CAPTURED') {
        logEvent(`⚔️ Piece captured at cell ${evt.payload.globalPosition}!`, 'important');
    }
}

function showToast(message, type = 'info') {
    el.toast.textContent = message;
    el.toast.className = `toast ${type} fade-in`;
    el.toast.style.display = 'block';
    setTimeout(() => {
        el.toast.style.display = 'none';
    }, 4000);
}
