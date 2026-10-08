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
    } else if (val === 'CHESS') {
        el.maxPlayersInput.innerHTML = `<option value="2" selected>2 Players</option>`;
    } else if (val === 'CALL_BRIDGE') {
        el.maxPlayersInput.innerHTML = `<option value="4" selected>4 Players</option>`;
    } else if (val === 'TWENTY_NINE') {
        el.maxPlayersInput.innerHTML = `<option value="4" selected>4 Players</option>`;
    } else if (val === 'CARROM') {
        el.maxPlayersInput.innerHTML = `
            <option value="2" selected>2 Players</option>
            <option value="4">4 Players</option>
        `;
    }
    const cbGroup = document.getElementById('cbWinConditionGroup');
    if (cbGroup) cbGroup.style.display = val === 'CALL_BRIDGE' ? 'block' : 'none';
    const tnGroup = document.getElementById('tnConfigGroup');
    if (tnGroup) tnGroup.style.display = val === 'TWENTY_NINE' ? 'block' : 'none';
}

function updateCbWinConditionInput() {
    const val = document.getElementById('cbWinConditionSelect')?.value;
    const roundsGroup = document.getElementById('cbRoundsGroup');
    const pointsGroup = document.getElementById('cbPointsGroup');
    if (roundsGroup) roundsGroup.style.display = val === 'POINTS' ? 'none' : 'block';
    if (pointsGroup) pointsGroup.style.display = val === 'POINTS' ? 'block' : 'none';
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
    } else if (evt.eventType === 'BID_PLACED') {
        logEvent(`🃏 ${evt.payload.player} bid ${evt.payload.bid} trick(s)`);
    } else if (evt.eventType === 'BIDDING_COMPLETED') {
        logEvent(`✅ All bids placed — game begins!`, 'important');
    } else if (evt.eventType === 'CARD_PLAYED') {
        const c = evt.payload.card;
        const cardStr = c ? `${c.rank} of ${c.suit}` : 'a card';
        logEvent(`🃏 ${evt.payload.player} played ${cardStr}`);
    } else if (evt.eventType === 'TRICK_WON') {
        const winnerName = (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[evt.payload.winnerId])
            ? state.currentRoom.playerNames[evt.payload.winnerId]
            : evt.payload.winnerId;
        logEvent(`🏅 Trick ${evt.payload.trickNumber} won by ${winnerName}!`, 'important');
    } else if (evt.eventType === 'ROUND_FINISHED') {
        logEvent(`🔄 Round ${evt.payload.round} finished!`, 'important');
    } else if (evt.eventType === 'CARDS_DEALT') {
        logEvent(`🃏 Cards dealt for round ${evt.payload.round}`);
    } else if (evt.eventType === 'CARROM_STRIKE') {
        const pts = evt.payload.pointsScored;
        const pocketed = (evt.payload.pocketedTypes || []).join(', ');
        const extra = evt.payload.extraTurn ? ' (Extra turn!)' : '';
        if (evt.payload.pocketedStriker) {
            logEvent(`🎯 Strike! Striker pocketed — penalty!`, 'error');
        } else if (pocketed) {
            logEvent(`🎯 Strike! Pocketed: ${pocketed}. Points: ${pts > 0 ? '+' : ''}${pts}${extra}`, pts > 0 ? 'important' : 'normal');
        } else {
            logEvent(`🎯 Strike! No pieces pocketed.`);
        }
    } else if (evt.eventType === 'PLAYER_FORFEIT') {
        logEvent(`🚪 A player forfeited the game.`, 'error');
    } else if (evt.eventType === 'BID_PASSED') {
        logEvent(`⏭️ A player passed the bid.`);
    } else if (evt.eventType === 'DEALER_FORCED_BID') {
        logEvent(`🎲 Dealer forced to bid 15!`, 'important');
    } else if (evt.eventType === 'BIDDING_COMPLETE') {
        const winnerName = (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[evt.payload.highestBidderId])
            ? state.currentRoom.playerNames[evt.payload.highestBidderId] : evt.payload.highestBidderId;
        logEvent(`✅ Bidding complete! ${winnerName} won with bid ${evt.payload.currentBid}`, 'important');
    } else if (evt.eventType === 'TRUMP_SELECTED') {
        logEvent(`🂠 Trump suit selected (secret)`, 'important');
    } else if (evt.eventType === 'TRUMP_REVEALED') {
        logEvent(`🂠 Trump revealed: ${evt.payload.trumpSuit}!`, 'important');
    } else if (evt.eventType === 'DOUBLED') {
        logEvent(`✖️ A player doubled the bid!`, 'important');
    } else if (evt.eventType === 'REDOUBLED') {
        logEvent(`✖️✖️ A player redoubled!`, 'important');
    } else if (evt.eventType === 'NEW_ROUND') {
        logEvent(`🔄 New round started!`, 'important');
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
