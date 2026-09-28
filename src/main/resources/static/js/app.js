/**
 * Random Games Platform - Realtime Frontend Client
 */

// State Management
const state = {
    player: null,
    currentRoom: null,
    currentGameState: null,
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
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),
    startGameBtn: document.getElementById('startGameBtn'),
    restartGameBtn: document.getElementById('restartGameBtn'),
    playerCount: document.getElementById('playerCount'),
    maxPlayerCount: document.getElementById('maxPlayerCount'),
    playersList: document.getElementById('playersList'),
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
    snakeTurnIndicator: document.getElementById('snakeTurnIndicator'),
    snakeRollDiceBtn: document.getElementById('snakeRollDiceBtn'),
    snakeDiceResultDisplay: document.getElementById('snakeDiceResultDisplay'),
    snakeScoreboard: document.getElementById('snakeScoreboard'),
    snakeCanvas: document.getElementById('snakeCanvas'),
    snakeCenterDiceOverlay: document.getElementById('snakeCenterDiceOverlay'),
    snakeCenterDiceTitle: document.getElementById('snakeCenterDiceTitle'),
    snakeCenterDiceDisplay: document.getElementById('snakeCenterDiceDisplay'),
    snakeCenterDiceResultText: document.getElementById('snakeCenterDiceResultText'),
    
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
        if (e.target.classList.contains('ttt-cell')) {
            const row = parseInt(e.target.dataset.row);
            const col = parseInt(e.target.dataset.col);
            sendGameAction({ action: 'PLACE_MARK', row, column: col });
        }
    });

    // Ludo Dice button click
    el.ludoRollDiceBtn.addEventListener('click', () => {
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
        el.snakeRollDiceBtn.disabled = true;
        sendGameAction({ action: 'ROLL_DICE' });
    });
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
    try {
        const res = await fetch(`/api/v1/games/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: state.player.id,
                asSpectator
            })
        });

        if (res.ok) {
            const room = await res.json();
            enterRoom(room);
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
    const wsUrl = `${protocol}//${window.location.host}/ws/game?playerId=${state.player.id}${roomQuery}`;

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
        state.wsConnected = true;
        el.wsStatusIndicator.className = 'connection-status connected';
        el.wsStatusText.textContent = 'Connected';
        
        if (state.currentRoom) {
            sendWsMessage('JOIN_ROOM', { asSpectator: false });
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
            const isMe = winner === state.player.id;
            finishMsg = `🏆 Winner: <strong>${isMe ? 'You' : winner}</strong>!`;
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

function enterRoom(room) {
    state.currentRoom = room;
    if (room && room.gameStateSummary) {
        state.currentGameState = room.gameStateSummary;
    }
    snakeTokenPositions = {};
    localStorage.setItem('game_platform_room_id', room.roomId);
    showScreen('gameRoomScreen');
    updateRoomState(room);

    // Inform backend WebSocket that player is active in room
    sendWsMessage('JOIN_ROOM', { asSpectator: false });
}

function updateRoomState(room) {
    state.currentRoom = room;
    if (room && room.roomId) {
        localStorage.setItem('game_platform_room_id', room.roomId);
    }
    if (room && room.gameStateSummary) {
        state.currentGameState = room.gameStateSummary;
    }
    el.roomTitle.textContent = room.name;
    el.roomGameType.textContent = formatGameType(room.gameType);
    el.roomStatusPill.textContent = formatStatus(room.status);
    el.roomStatusPill.className = `status-pill ${room.status ? room.status.toLowerCase().replace('_', '-') : ''}`;

    el.playerCount.textContent = room.playerIds.length;
    el.maxPlayerCount.textContent = room.maxPlayers;

    // Show host start button if host and in WAITING/READY state
    const isHost = state.player && room && state.player.id === room.hostPlayerId;
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
    sendWsMessage('RESTART_GAME');
}

function handleLeaveRoom() {
    if (!state.currentRoom) return;
    sendWsMessage('LEAVE_ROOM');
    localStorage.removeItem('game_platform_room_id');
    state.currentRoom = null;
    showScreen('lobbyScreen');
    fetchRooms();
}

function renderPlayersList(playerIds) {
    let ludoPlayerStates = null;
    const currentGState = state.currentGameState || (state.currentRoom ? state.currentRoom.gameStateSummary : null);
    if (currentGState && currentGState.details && currentGState.details.playerStates) {
        ludoPlayerStates = currentGState.details.playerStates;
    }

    el.playersList.innerHTML = playerIds.map(id => {
        const isSelf = id === state.player.id;
        const isHost = state.currentRoom && id === state.currentRoom.hostPlayerId;
        let colorBadge = '';
        if (ludoPlayerStates && ludoPlayerStates[id]) {
            const c = ludoPlayerStates[id].color;
            const colorDotHex = c === 'RED' ? '#ef4444' : c === 'GREEN' ? '#22c55e' : c === 'YELLOW' ? '#eab308' : '#3b82f6';
            colorBadge = `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${colorDotHex}; margin-right:6px; border:1px solid #fff;"></span><strong style="color:${colorDotHex}; font-size:0.8rem; margin-right:6px;">${c}</strong>`;
        }

        return `
            <li class="player-item">
                <span>${colorBadge}${isHost ? '👑 ' : ''}${isSelf ? '<strong>You</strong>' : id}</span>
                <span class="status-dot"></span>
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
    const isHost = state.player && state.currentRoom && state.player.id === state.currentRoom.hostPlayerId;

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
    }

    if (type === 'TIC_TAC_TOE') {
        renderTicTacToe(gameState);
    } else if (type === 'LUDO') {
        renderLudo(gameState, events);
    } else if (type === 'SNAKE') {
        renderSnake(gameState, events);
    }
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
        el.tttTurnIndicator.textContent = gameState.winner 
            ? `🏆 ${gameState.winner === state.player.id ? 'You Won!' : 'Winner: ' + gameState.winner}`
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
    if (!state.currentRoom || !state.player) {
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
        if (Math.min(dist, badgeDist) <= 34) {
            isHoveringMovable = true;
            break;
        }
    }
    el.ludoCanvas.style.cursor = isHoveringMovable ? 'pointer' : 'default';
}

function handleLudoCanvasTap(e) {
    const now = Date.now();
    if (now - lastLudoTapTime < 200) return; // Debounce rapid pointer/click triggers

    if (!state.currentRoom || !state.player) return;
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
        const effectiveDist = Math.min(dist, badgeDist);

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

    if (details.movablePieceIndices && details.movablePieceIndices.length === 1) {
        const turnKey = `${details.currentPlayerId}_${details.turnNumber || ''}_${details.lastDiceRoll}_${details.movablePieceIndices[0]}`;
        if (lastAutoMovedTurnKey === turnKey) return;

        const pieceIdx = details.movablePieceIndices[0];
        lastAutoMovedTurnKey = turnKey;

        if (ludoAutoMoveTimer) clearTimeout(ludoAutoMoveTimer);
        ludoAutoMoveTimer = setTimeout(() => {
            ludoAutoMoveTimer = null;
            window.makeLudoMove(pieceIdx);
        }, 400);
    }
}

function updateLudoUI(gameState) {
    const details = gameState.details || gameState;
    const isMyTurn = details.currentPlayerId === state.player.id;
    const color = details.currentColor;

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
        const isSingleAuto = isMyTurn && details.turnPhase === 'MOVING' && details.movablePieceIndices && details.movablePieceIndices.length === 1;
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

    // Check for dice roll event
    const diceEvt = events && events.find(e => e.eventType === 'DICE_ROLLED');
    if (diceEvt && diceEvt.payload && diceEvt.payload.dice !== undefined) {
        const rollerState = details.playerStates ? details.playerStates[diceEvt.playerId] : null;
        const rollerColor = rollerState ? rollerState.color : 'Player';
        const rollerName = details.players && details.players[diceEvt.playerId] ? details.players[diceEvt.playerId].username : `${rollerColor}`;
        triggerDiceRollAnimation('LUDO', `${rollerName} (${rollerColor})`, diceEvt.payload.dice, () => {
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
        drawLudoBoard(details);
        updateLudoUI(gameState);
    }
}

async function animateLudoMove(gameState, moveEvt) {
    const details = gameState.details || gameState;
    const pColor = moveEvt.payload.color;
    const pieceIdx = moveEvt.payload.pieceIndex;
    const targetStep = (moveEvt.eventType === 'PIECE_ENTERED_TRACK') ? 0 : moveEvt.payload.step || (moveEvt.eventType === 'PIECE_REACHED_HOME' ? 57 : 0);

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
                    ludoTokenPositions[tokenKey] = { x, y, currentStep: 0, inYard: false };
                    drawLudoBoard(details);
                }, resolve);
            });
        } else if (startStep >= 0 && targetStep > startStep) {
            // Step-by-step tile hopping
            for (let s = startStep + 1; s <= targetStep; s++) {
                const p1 = getLudoBoardCoordinate(pColor, s - 1, cs);
                const p2 = getLudoBoardCoordinate(pColor, s, cs);

                await new Promise(resolve => {
                    runAnimation(220, (t) => {
                        const hop = Math.sin(t * Math.PI) * 16;
                        const x = p1.x + (p2.x - p1.x) * t;
                        const y = p1.y + (p2.y - p1.y) * t - hop;
                        ludoTokenPositions[tokenKey] = { x, y, currentStep: s, inYard: false };
                        drawLudoBoard(details);
                    }, resolve);
                });
            }
        }

        // Update final position
        ludoTokenPositions[tokenKey] = {
            inYard: false,
            currentStep: targetStep,
            ...getLudoBoardCoordinate(pColor, targetStep, cs)
        };
    } finally {
        isLudoAnimating = false;
        drawLudoBoard(details);
        updateLudoUI(gameState);
    }
}

window.makeLudoMove = function(pieceIndex) {
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
    // Red Start [1,6], Green Start [8,1], Yellow Start [13,8], Blue Start [6,13]
    // Star cells: [6,2], [12,6], [8,12], [2,8]
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
        Object.values(details.playerStates).forEach(ps => {
            const pColor = ps.color;
            const pieceColor = colors[pColor] || '#000';
            const isUserOwner = ps.playerId === state.player.id;
            const isTurnOwner = ps.playerId === details.currentPlayerId;

            ps.pieces.forEach((p, idx) => {
                const tokenKey = `${pColor}_${idx}`;
                let x, y;

                if (ludoTokenPositions[tokenKey] && isLudoAnimating) {
                    x = ludoTokenPositions[tokenKey].x;
                    y = ludoTokenPositions[tokenKey].y;
                } else if (p.inYard) {
                    const yardPos = getLudoYardCoordinate(pColor, idx, cs);
                    x = yardPos.x;
                    y = yardPos.y;
                } else {
                    const coord = getLudoBoardCoordinate(pColor, p.step, cs);
                    x = coord.x;
                    y = coord.y;
                }

                currentRenderedLudoTokens[tokenKey] = { x, y };

                const isMovable = isUserOwner && isTurnOwner && details.turnPhase === 'MOVING' && details.movablePieceIndices && details.movablePieceIndices.includes(idx);

                drawLudoToken(ctx, x, y, pieceColor, idx + 1, isUserOwner, isTurnOwner, isMovable);
            });
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

function drawLudoToken(ctx, x, y, color, label, isUserOwner, isTurnOwner, isMovable) {
    ctx.save();

    // Movable candidate highlighting & pulsing indicator
    if (isMovable) {
        // Outer glowing halo
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.fill();

        // Pulsing border
        ctx.beginPath();
        ctx.arc(x, y, 21, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small "TAP" badge above candidate token
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.roundRect(x - 14, y - 28, 28, 14, 4);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TAP', x, y - 21);
    } else if (isTurnOwner) {
        ctx.beginPath();
        ctx.arc(x, y, 19, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 3;

    // 3D Sphere fill
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // White rim border (or golden rim if movable)
    ctx.lineWidth = isMovable ? 3 : 2.5;
    ctx.strokeStyle = isMovable ? '#fef08a' : (isUserOwner ? '#ffffff' : '#e2e8f0');
    ctx.stroke();

    // Specular 3D highlight
    const highlight = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, 15);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    highlight.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();

    // Piece Label (Number)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(label, x, y);

    ctx.restore();
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

function initSnakeCanvas() {
    snakeCtx = el.snakeCanvas.getContext('2d');
    drawSnakeLudoBoard(null);
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
    const curveAmp = Math.min(45, dist * 0.22);
    const cp1 = { x: pHead.x + dx * 0.33 + nx * curveAmp, y: pHead.y + dy * 0.33 + ny * curveAmp };
    const cp2 = { x: pHead.x + dx * 0.66 - nx * curveAmp, y: pHead.y + dy * 0.66 - ny * curveAmp };
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
        return `
            <div class="snake-score-item ${isCurrent ? 'active-turn' : ''}">
                <span class="snake-score-dot" style="background-color: ${p.color}"></span>
                <span>${pid === state.player.id ? 'You (' + p.username + ')' : p.username}: <strong>Square ${p.position}</strong></span>
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

function drawSnakeLudoBoard(details) {
    if (!snakeCtx) return;
    const ctx = snakeCtx;
    const w = 600;
    const h = 600;
    const cs = 60;

    ctx.clearRect(0, 0, w, h);

    // Outer Board Border Glow
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Draw 100 cells with gradients and borders
    const tileColorsA = ['#ffffff', '#f8fafc'];
    const tileColorsB = ['#f1f5f9', '#e2e8f0'];
    const specialColors = {
        1: '#dcfce7',  // Start Greenish
        100: '#fef08a' // Win Gold
    };

    for (let num = 1; num <= 100; num++) {
        const cell = getSnakeLudoCellCenter(num);
        const isEven = (cell.row + cell.col) % 2 === 0;

        ctx.save();
        if (specialColors[num]) {
            ctx.fillStyle = specialColors[num];
        } else {
            const grad = ctx.createLinearGradient(cell.left, cell.top, cell.left + cs, cell.top + cs);
            if (isEven) {
                grad.addColorStop(0, tileColorsA[0]);
                grad.addColorStop(1, tileColorsA[1]);
            } else {
                grad.addColorStop(0, tileColorsB[0]);
                grad.addColorStop(1, tileColorsB[1]);
            }
            ctx.fillStyle = grad;
        }

        ctx.fillRect(cell.left, cell.top, cs, cs);

        // Grid border
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.left + 0.5, cell.top + 0.5, cs - 1, cs - 1);

        // Cell Number
        ctx.fillStyle = num === 100 ? '#b45309' : (num === 1 ? '#15803d' : '#64748b');
        ctx.font = num === 100 ? 'bold 12px Inter, sans-serif' : '600 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(num === 100 ? '👑 100' : (num === 1 ? '▶ 1' : num.toString()), cell.left + 4, cell.top + 4);
        ctx.restore();
    }

    const ladders = (details && details.ladders) ? details.ladders : {
        4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91
    };

    const snakes = (details && details.snakes) ? details.snakes : {
        17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78
    };

    // ======================== DRAW LADDERS ======================== //
    Object.entries(ladders).forEach(([start, end]) => {
        const p1 = getSnakeLudoCellCenter(parseInt(start));
        const p2 = getSnakeLudoCellCenter(parseInt(end));

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

        // Ladder Cast Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;

        // Wooden Side Rails
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';

        // Left rail
        ctx.beginPath();
        ctx.moveTo(p1.x + px * railOffset, p1.y + py * railOffset);
        ctx.lineTo(p2.x + px * railOffset, p2.y + py * railOffset);
        ctx.stroke();

        // Right rail
        ctx.beginPath();
        ctx.moveTo(p1.x - px * railOffset, p1.y - py * railOffset);
        ctx.lineTo(p2.x - px * railOffset, p2.y - py * railOffset);
        ctx.stroke();

        ctx.shadowColor = 'transparent';

        // Inner Wood Grain Highlight
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1.x + px * railOffset - 1, p1.y + py * railOffset - 1);
        ctx.lineTo(p2.x + px * railOffset - 1, p2.y + py * railOffset - 1);
        ctx.moveTo(p1.x - px * railOffset + 1, p1.y - py * railOffset + 1);
        ctx.lineTo(p2.x - px * railOffset + 1, p2.y - py * railOffset + 1);
        ctx.stroke();

        // Rungs
        const numRungs = Math.max(3, Math.floor(dist / 22));
        for (let i = 1; i < numRungs; i++) {
            const t = i / numRungs;
            const cx = p1.x + dx * t;
            const cy = p1.y + dy * t;

            // Rung Bar
            ctx.strokeStyle = '#a16207';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(cx + px * railOffset, cy + py * railOffset);
            ctx.lineTo(cx - px * railOffset, cy - py * railOffset);
            ctx.stroke();

            // Rung Metallic Studs / Caps
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(cx + px * railOffset, cy + py * railOffset, 2, 0, Math.PI * 2);
            ctx.arc(cx - px * railOffset, cy - py * railOffset, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });

    // ======================== DRAW SNAKES ======================== //
    const snakePalette = [
        { main: '#15803d', dark: '#14532d', belly: '#86efac', spots: '#166534' }, // Emerald
        { main: '#dc2626', dark: '#991b1b', belly: '#fca5a5', spots: '#7f1d1d' }, // Crimson
        { main: '#9333ea', dark: '#581c87', belly: '#d8b4fe', spots: '#3b0764' }, // Purple
        { main: '#ea580c', dark: '#9a3412', belly: '#fdba74', spots: '#7c2d12' }, // Orange Cobra
        { main: '#0284c7', dark: '#075985', belly: '#7dd3fc', spots: '#0c4a6e' }, // Blue Viper
        { main: '#059669', dark: '#064e3b', belly: '#6ee7b7', spots: '#022c22' }  // Teal
    ];

    let colorIdx = 0;
    Object.entries(snakes).forEach(([head, tail]) => {
        const pHead = getSnakeLudoCellCenter(parseInt(head));
        const pTail = getSnakeLudoCellCenter(parseInt(tail));
        const theme = snakePalette[colorIdx++ % snakePalette.length];

        const dx = pTail.x - pHead.x;
        const dy = pTail.y - pHead.y;
        const dist = Math.hypot(dx, dy);
        
        // Multi-curved Sinuous Body Control Points
        const midX1 = pHead.x + dx * 0.35 + (pHead.x > pTail.x ? 32 : -32);
        const midY1 = pHead.y + dy * 0.35 + 16;
        const midX2 = pHead.x + dx * 0.70 + (pHead.x > pTail.x ? -24 : 24);
        const midY2 = pHead.y + dy * 0.70 + 8;

        ctx.save();

        // 1. Snake Cast Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;

        // 2. Snake Outer Body Stroke
        ctx.strokeStyle = theme.dark;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pHead.x, pHead.y);
        ctx.bezierCurveTo(midX1, midY1, midX2, midY2, pTail.x, pTail.y);
        ctx.stroke();

        ctx.shadowColor = 'transparent';

        // 3. Snake Main Vibrant Color
        ctx.strokeStyle = theme.main;
        ctx.lineWidth = 10;
        ctx.stroke();

        // 4. Snake Belly Ridge
        ctx.strokeStyle = theme.belly;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 5. Snake Patterned Diamond Spots along body
        const steps = Math.max(4, Math.floor(dist / 26));
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            // Cubic bezier formula
            const bx = Math.pow(1 - t, 3) * pHead.x + 3 * Math.pow(1 - t, 2) * t * midX1 + 3 * (1 - t) * Math.pow(t, 2) * midX2 + Math.pow(t, 3) * pTail.x;
            const by = Math.pow(1 - t, 3) * pHead.y + 3 * Math.pow(1 - t, 2) * t * midY1 + 3 * (1 - t) * Math.pow(t, 2) * midY2 + Math.pow(t, 3) * pTail.y;

            ctx.fillStyle = theme.spots;
            ctx.beginPath();
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 6. Snake Tapered Tail Tip
        ctx.fillStyle = theme.dark;
        ctx.beginPath();
        ctx.arc(pTail.x, pTail.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // 7. Snake Head & Hood
        const angle = Math.atan2(midY1 - pHead.y, midX1 - pHead.x) + Math.PI; // Face outwards
        
        ctx.save();
        ctx.translate(pHead.x, pHead.y);
        ctx.rotate(angle);

        // Forked Tongue
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(18, 0);
        ctx.lineTo(22, -3);
        ctx.moveTo(18, 0);
        ctx.lineTo(22, 3);
        ctx.stroke();

        // Head Shape
        ctx.fillStyle = theme.main;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme.dark;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes (Shining Yellow with Black Slits)
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(3, -5, 3.2, 0, Math.PI * 2);
        ctx.arc(3, 5, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(3, -5, 1.2, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(3, 5, 1.2, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nostril dots
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(8, -2, 0.8, 0, Math.PI * 2);
        ctx.arc(8, 2, 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();
    });

    // ======================== DRAW PLAYER TOKENS ======================== //
    if (details && details.players) {
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
            { x: -12, y: 12 },
            { x: 12, y: -12 },
            { x: 12, y: 12 }
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

            ctx.save();

            // Token outer shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
            ctx.shadowBlur = 7;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 3;

            // Token Sphere Base
            const radGrad = ctx.createRadialGradient(px - 4, py - 4, 2, px, py, 14);
            radGrad.addColorStop(0, '#ffffff');
            radGrad.addColorStop(0.3, p.color || '#ef4444');
            radGrad.addColorStop(1, '#0f172a');

            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(px, py, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Active Turn Pulsing Glow
            if (details.currentPlayerId === p.playerId) {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(px, py, 18, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Player Initials
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const initial = (p.username || p.playerId || 'P').substring(0, 2).toUpperCase();
            ctx.fillText(initial, px, py);

            ctx.restore();
        });
    }
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
        const isFull = room.currentPlayersCount >= room.maxPlayers;
        const isInProgress = room.status === 'IN_PROGRESS';
        const canJoin = !isFull && (!isInProgress || room.lateJoinAllowed);
        let joinBtn = '';
        if (canJoin) {
            joinBtn = `<button class="btn btn-primary" onclick="joinRoom('${room.roomId}', false)">Join Game</button>`;
        } else if (isFull) {
            joinBtn = `<button class="btn btn-secondary" disabled>Room Full</button>`;
        } else if (isInProgress) {
            joinBtn = `<button class="btn btn-secondary" disabled>In Progress</button>`;
        }
        const spectateBtn = room.spectatorAllowed ? `<button class="btn btn-secondary" onclick="joinRoom('${room.roomId}', true)">Spectate</button>` : '';

        return `
        <div class="room-card">
            <div class="room-card-header">
                <span class="room-card-title">${room.name}</span>
                <span class="room-card-badge">${getGameIcon(room.gameType)} ${formatGameType(room.gameType)}</span>
            </div>
            <div class="room-card-body">
                <div>Players: <strong>${room.currentPlayersCount}/${room.maxPlayers}</strong></div>
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
