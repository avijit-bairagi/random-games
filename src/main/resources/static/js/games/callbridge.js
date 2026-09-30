// ======================== CALL BRIDGE RENDERER ======================== //

let cbTrickPauseUntil = 0; // timestamp until which trick arena is frozen showing last trick
let cbRoundEndPauseUntil = 0; // timestamp until which round-end last trick is shown (longer pause)
let cbLastRenderedTrickKey = ''; // key to detect when a new trick starts
let cbClearArenaTimer = null; // cancellable timer for clearing arena after trick animation
let cbLastHandKey = ''; // key to avoid re-rendering hand when cards haven't changed

const SUIT_SYMBOLS = {
    'SPADES': '♠',
    'HEARTS': '♥',
    'DIAMONDS': '♦',
    'CLUBS': '♣'
};

function renderCallBridge(gameState, events) {
    const details = gameState.details || {};
    const phase = details.phase || 'BIDDING';
    const currentRound = details.currentRound || 1;
    const totalRounds = details.totalRounds || 5;
    const winCondition = details.winCondition || 'ROUNDS';
    const pointThreshold = details.pointThreshold || 50;
    const currentPlayerId = details.currentPlayerId;
    const playerOrder = details.playerOrder || (state.currentRoom ? state.currentRoom.playerIds : []);
    const hands = details.hands || {};
    const bids = details.bids || {};
    const tricksWon = details.tricksWon || {};
    const totalScores = details.totalScores || {};
    const currentTrick = details.currentTrick || [];
    const leadSuit = details.leadSuit;
    const trickNumber = details.trickNumber || 1;
    const lastTrickWinner = details.lastTrickWinner;
    const myId = state.player ? state.player.id : null;
    const isMyTurn = myId && currentPlayerId === myId && !state.isSpectator;

    // Update Turn Indicator & Round Header
    const cbRoundText = document.getElementById('cbRoundText');
    if (cbRoundText) {
        if (winCondition === 'POINTS') {
            const myScore = totalScores[myId] || 0;
            cbRoundText.textContent = `Round ${currentRound} · Target: ${pointThreshold} pts`;
        } else {
            cbRoundText.textContent = `Round ${currentRound} / ${totalRounds}`;
        }
    }

    const cbTrickText = document.getElementById('cbTrickText');
    if (cbTrickText) {
        cbTrickText.textContent = `Trick ${trickNumber} / 13`;
    }

    const cbTurnIndicator = document.getElementById('cbTurnIndicator');
    if (cbTurnIndicator) {
        if (gameState.status === 'FINISHED') {
            const winnerId = gameState.winner;
            const winnerName = getPlayerDisplayName(winnerId);
            cbTurnIndicator.textContent = winnerId
                ? `🏆 ${winnerId === myId ? 'You Won the Match!' : 'Winner: ' + escapeHtml(winnerName)}`
                : '🏁 Match Finished';
            cbTurnIndicator.style.color = 'var(--success)';
        } else if (gameState.status === 'WAITING' || gameState.status === 'READY') {
            cbTurnIndicator.textContent = '⏳ Waiting for game to start...';
            cbTurnIndicator.style.color = 'var(--text-muted)';
        } else if (phase === 'BIDDING') {
            const currentName = getPlayerDisplayName(currentPlayerId);
            if (isMyTurn) {
                cbTurnIndicator.textContent = '📢 Your Turn: Make Your Call / Bid (1-13)';
                cbTurnIndicator.style.color = '#f59e0b';
            } else {
                cbTurnIndicator.textContent = `⏳ Waiting for ${escapeHtml(currentName)} to place bid...`;
                cbTurnIndicator.style.color = 'var(--text-muted)';
            }
        } else {
            const currentName = getPlayerDisplayName(currentPlayerId);
            if (isMyTurn) {
                const leadInfo = leadSuit ? ` (Follow ${SUIT_SYMBOLS[leadSuit] || leadSuit})` : ' (Lead any card)';
                cbTurnIndicator.textContent = `🃏 Your Turn to Play a Card${leadInfo}`;
                cbTurnIndicator.style.color = 'var(--primary)';
            } else {
                cbTurnIndicator.textContent = `⏳ Waiting for ${escapeHtml(currentName)} to play...`;
                cbTurnIndicator.style.color = 'var(--text-muted)';
            }
        }
    }

    // Determine Seats Perspective:
    // South = Me (or playerOrder[0] if spectator)
    // West  = (myIndex + 1) % 4
    // North = (myIndex + 2) % 4
    // East  = (myIndex + 3) % 4
    let myIndex = playerOrder.indexOf(myId);
    if (myIndex === -1) myIndex = 0;

    const seatPositions = ['south', 'west', 'north', 'east'];
    const seatPlayerMap = {};
    for (let i = 0; i < 4; i++) {
        const pIndex = (myIndex + i) % playerOrder.length;
        const pId = playerOrder[pIndex];
        const pos = seatPositions[i];
        seatPlayerMap[pos] = pId;
        renderPlayerPod(pos, pId, details);
    }

    // Render Trick Arena (Played cards on table)
    const lastTrick = details.lastTrick || [];
    const trickJustCompleted = currentTrick.length === 0 && lastTrick.length === 4;
    const isLastTrickOfRound = trickNumber === 13;
    const now = Date.now();

    // Build a key for the current trick state so we can detect when a new trick card is played
    const currentTrickKey = currentTrick.map(p => p.playerId + p.card.rank + p.card.suit).join(',');

    if (currentTrick.length > 0) {
        // New trick in progress — cancel any pending clear timer and show immediately
        if (cbClearArenaTimer !== null) {
            clearTimeout(cbClearArenaTimer);
            cbClearArenaTimer = null;
        }
        cbTrickPauseUntil = 0;
        cbLastRenderedTrickKey = currentTrickKey;
        renderTrickArena(currentTrick, seatPlayerMap, lastTrickWinner);
    } else if (trickJustCompleted && now > cbTrickPauseUntil) {
        const pauseDuration = isLastTrickOfRound ? 3000 : 1500;
        cbTrickPauseUntil = now + pauseDuration;
        if (isLastTrickOfRound) cbRoundEndPauseUntil = now + pauseDuration;
        renderTrickArena(lastTrick, seatPlayerMap, lastTrickWinner);
        animateTrickToWinner(lastTrickWinner, seatPlayerMap);
        if (cbClearArenaTimer !== null) clearTimeout(cbClearArenaTimer);
        cbClearArenaTimer = setTimeout(() => {
            cbClearArenaTimer = null;
            renderTrickArena([], seatPlayerMap, null);
        }, pauseDuration);
    } else if (now < cbTrickPauseUntil) {
        // Still in pause window — keep showing last trick
    } else {
        renderTrickArena(currentTrick, seatPlayerMap, lastTrickWinner);
    }

    // Render Bidding Panel
    renderBiddingPanel(phase, isMyTurn);

    // Render Hand
    const myHand = (myId && hands[myId]) ? hands[myId] : [];
    renderHand(myHand, phase, isMyTurn, leadSuit);

    // Render Scoreboard
    renderScoreboard(details, playerOrder);
}

function getPlayerDisplayName(playerId) {
    if (!playerId) return '';
    if (state.player && playerId === state.player.id) return state.player.username;
    if (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[playerId]) {
        return state.currentRoom.playerNames[playerId];
    }
    return playerId;
}

function renderPlayerPod(position, playerId, details) {
    const podEl = document.getElementById(`cbPod_${position}`);
    if (!podEl) return;

    if (!playerId) {
        podEl.style.display = 'none';
        return;
    }

    podEl.style.display = 'flex';
    const isCurrent = details.currentPlayerId === playerId;
    if (isCurrent && details.phase !== 'GAME_OVER') {
        podEl.classList.add('active-turn');
    } else {
        podEl.classList.remove('active-turn');
    }

    const isMe = state.player && playerId === state.player.id;
    const name = getPlayerDisplayName(playerId);
    const isDealer = details.dealerId === playerId;
    const isStarter = details.starterPlayerId === playerId;

    let badge = '';
    if (isDealer) badge += ' 🎲';
    if (isStarter) badge += ' ⚡';

    const nameEl = podEl.querySelector('.cb-pod-name');
    if (nameEl) {
        nameEl.innerHTML = `${isMe ? '<strong>👤 You</strong>' : escapeHtml(name)}${badge}`;
    }

    const bidVal = (details.bids && details.bids[playerId] != null) ? details.bids[playerId] : '-';
    const wonVal = (details.tricksWon && details.tricksWon[playerId] != null) ? details.tricksWon[playerId] : 0;
    const scoreVal = (details.totalScores && details.totalScores[playerId] != null) ? details.totalScores[playerId] : 0.0;

    const bidEl = podEl.querySelector('.cb-stat-bid');
    if (bidEl) bidEl.textContent = bidVal;

    const wonEl = podEl.querySelector('.cb-stat-won');
    if (wonEl) wonEl.textContent = `${wonVal}/${bidVal !== '-' ? bidVal : '?'}`;

    const scoreEl = podEl.querySelector('.cb-stat-score');
    if (scoreEl) scoreEl.textContent = scoreVal;
}

function renderTrickArena(trick, seatPlayerMap, lastTrickWinner) {
    const arenaEl = document.getElementById('cbTrickArena');
    if (!arenaEl) return;

    const positions = ['north', 'south', 'east', 'west'];
    positions.forEach(pos => {
        const slotEl = document.getElementById(`cbSlot_${pos}`);
        if (!slotEl) return;
        slotEl.innerHTML = '';
        const pId = seatPlayerMap[pos];
        if (!pId) return;

        // Check if this player has played a card in the trick
        const play = trick.find(item => item.playerId === pId);
        if (play && play.card) {
            slotEl.appendChild(createCardElement(play.card));
            const label = document.createElement('div');
            label.className = 'cb-slot-player-label';
            label.textContent = getPlayerDisplayName(pId);
            slotEl.appendChild(label);
        }
    });

    // Remove any stale banner
    const bannerEl = document.getElementById('cbLastTrickBanner');
    if (bannerEl) bannerEl.remove();
}

function animateTrickToWinner(winnerId, seatPlayerMap) {
    if (!winnerId) return;
    const arenaEl = document.getElementById('cbTrickArena');
    if (!arenaEl) return;

    // Find which seat the winner occupies
    let winnerSeat = null;
    for (const [seat, pid] of Object.entries(seatPlayerMap)) {
        if (pid === winnerId) { winnerSeat = seat; break; }
    }
    if (!winnerSeat) return;

    // Get winner pod position relative to arena center
    const arenaRect = arenaEl.getBoundingClientRect();
    const podEl = document.getElementById(`cbPod_${winnerSeat}`);
    if (!podEl) return;
    const podRect = podEl.getBoundingClientRect();

    const targetX = (podRect.left + podRect.width / 2) - (arenaRect.left + arenaRect.width / 2);
    const targetY = (podRect.top + podRect.height / 2) - (arenaRect.top + arenaRect.height / 2);

    const slots = ['north', 'south', 'east', 'west'];

    // Phase 1: gather all cards to center (0,0) over 0.4s
    slots.forEach(pos => {
        const slotEl = document.getElementById(`cbSlot_${pos}`);
        if (!slotEl || !slotEl.querySelector('.cb-card')) return;
        const cardEl = slotEl.querySelector('.cb-card');
        // Calculate offset from slot center to arena center
        const slotRect = slotEl.getBoundingClientRect();
        const fromX = (arenaRect.left + arenaRect.width / 2) - (slotRect.left + slotRect.width / 2);
        const fromY = (arenaRect.top + arenaRect.height / 2) - (slotRect.top + slotRect.height / 2);
        cardEl.style.transition = 'transform 0.35s ease-in';
        cardEl.style.transform = `translate(${fromX}px, ${fromY}px) scale(0.9)`;
    });

    // Phase 2: after gather, fly the pile to winner pod
    setTimeout(() => {
        slots.forEach(pos => {
            const slotEl = document.getElementById(`cbSlot_${pos}`);
            if (!slotEl || !slotEl.querySelector('.cb-card')) return;
            const cardEl = slotEl.querySelector('.cb-card');
            // Now translate from arena center to winner pod
            const slotRect = slotEl.getBoundingClientRect();
            const fromX = (arenaRect.left + arenaRect.width / 2) - (slotRect.left + slotRect.width / 2);
            const fromY = (arenaRect.top + arenaRect.height / 2) - (slotRect.top + slotRect.height / 2);
            cardEl.style.transition = 'transform 0.45s ease-in, opacity 0.45s ease-in';
            cardEl.style.transform = `translate(${fromX + targetX}px, ${fromY + targetY}px) scale(0.2)`;
            cardEl.style.opacity = '0';
        });
    }, 380);
}

function createCardElement(card) {
    const cardEl = document.createElement('div');
    const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
    const suitSymbol = SUIT_SYMBOLS[card.suit] || card.suit;

    cardEl.className = `cb-card ${isRed ? 'red-suit' : 'black-suit'}`;
    cardEl.innerHTML = `
        <div class="cb-card-corner-top">
            <span>${card.rank}</span>
            <span>${suitSymbol}</span>
        </div>
        <div class="cb-card-center-suit">${suitSymbol}</div>
        <div class="cb-card-corner-bottom">
            <span>${card.rank}</span>
            <span>${suitSymbol}</span>
        </div>
    `;
    return cardEl;
}

function renderBiddingPanel(phase, isMyTurn) {
    const panel = document.getElementById('cbBiddingPanel');
    if (!panel) return;

    if (phase === 'BIDDING' && isMyTurn) {
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
    }
}

function makeBid(bidNumber) {
    sendGameAction({
        action: 'BID',
        bid: bidNumber
    });
}

function renderHand(handCards, phase, isMyTurn, leadSuit) {
    const handContainer = document.getElementById('cbHandContainer');
    if (!handContainer) return;

    if (!handCards || handCards.length === 0) {
        if (state.isSpectator) {
            handContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.9rem; align-self:center;">👁️ Spectating match. Cards are hidden.</span>`;
        } else {
            handContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.9rem; align-self:center;">No cards in hand.</span>`;
        }
        return;
    }

    const canPlay = phase === 'PLAYING' && isMyTurn;
    const hasLeadSuit = leadSuit && handCards.some(c => c.suit.toUpperCase() === leadSuit.toUpperCase());

    // Avoid re-rendering hand if cards and playability haven't changed (prevents layout pop)
    const handKey = handCards.map(c => c.rank + c.suit).join(',') + '|' + canPlay + '|' + (leadSuit || '');
    if (handKey === cbLastHandKey && handContainer.children.length > 0) return;
    cbLastHandKey = handKey;
    handContainer.innerHTML = '';

    handCards.forEach((card, index) => {
        const cardEl = createCardElement(card);
        cardEl.classList.add('cb-hand-card');
        cardEl.style.zIndex = index + 1;

        let isPlayable = false;
        if (canPlay) {
            if (!leadSuit || !hasLeadSuit || card.suit.toUpperCase() === leadSuit.toUpperCase()) {
                isPlayable = true;
            }
        }

        if (canPlay) {
            if (isPlayable) {
                cardEl.classList.add('playable');
                cardEl.addEventListener('click', () => {
                    sendGameAction({
                        action: 'PLAY_CARD',
                        card: {
                            suit: card.suit,
                            rank: card.rank,
                            value: card.value
                        }
                    });
                });
            } else {
                cardEl.classList.add('unplayable');
            }
        }

        handContainer.appendChild(cardEl);
    });
}

function renderScoreboard(details, playerOrder) {
    const sbContainer = document.getElementById('cbScoreTableBody');
    if (!sbContainer) return;
    sbContainer.innerHTML = '';

    const roundScores = details.roundScores || [];
    const totalScores = details.totalScores || {};

    // Header player names
    for (let i = 0; i < 4; i++) {
        const thEl = document.getElementById(`cbScoreHeaderP${i + 1}`);
        if (thEl && playerOrder[i]) {
            const isMe = state.player && playerOrder[i] === state.player.id;
            thEl.textContent = isMe ? 'You' : getPlayerDisplayName(playerOrder[i]);
        }
    }

    // Round Rows
    roundScores.forEach((rMap, idx) => {
        const tr = document.createElement('tr');
        let rowHtml = `<td>Round ${idx + 1}</td>`;
        for (let i = 0; i < 4; i++) {
            const pId = playerOrder[i];
            const sc = (rMap && rMap[pId] != null) ? rMap[pId] : '-';
            rowHtml += `<td>${sc}</td>`;
        }
        tr.innerHTML = rowHtml;
        sbContainer.appendChild(tr);
    });

    // Total Row
    const totalTr = document.createElement('tr');
    let totalHtml = `<td><strong>Total</strong></td>`;
    for (let i = 0; i < 4; i++) {
        const pId = playerOrder[i];
        const tot = (totalScores && totalScores[pId] != null) ? totalScores[pId] : '0';
        totalHtml += `<td><strong>${tot}</strong></td>`;
    }
    totalTr.innerHTML = totalHtml;
    sbContainer.appendChild(totalTr);
}
