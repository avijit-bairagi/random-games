// ======================== TWENTY-NINE (29) RENDERER ======================== //

const TN_SUIT_SYMBOLS = { 'HEARTS': '♥', 'DIAMONDS': '♦', 'CLUBS': '♣', 'SPADES': '♠' };
const TN_SUIT_COLORS  = { 'HEARTS': '#e53e3e', 'DIAMONDS': '#e53e3e', 'CLUBS': '#1a202c', 'SPADES': '#1a202c' };

let tnTrickPauseUntil = 0;
let tnClearArenaTimer = null;
let tnLastHandKey = '';

function renderTwentyNine(gameState, events) {
    const details = gameState.details || {};
    const phase = details.phase || 'BIDDING';
    const playerOrder = details.playerOrder || (state.currentRoom ? state.currentRoom.playerIds : []);
    const hands = details.hands || {};
    const currentPlayerId = details.currentPlayerId;
    const myId = state.player ? state.player.id : null;
    const isMyTurn = myId && currentPlayerId === myId && !state.isSpectator;

    // --- Turn Indicator ---
    const tnTurnIndicator = document.getElementById('tnTurnIndicator');
    if (tnTurnIndicator) {
        if (gameState.status === 'FINISHED') {
            const winnerTeam = tnGetWinnerTeam(gameState.winner, playerOrder);
            const myTeam = tnTeamOf(myId, playerOrder);
            const iWon = winnerTeam && myTeam === winnerTeam;
            tnTurnIndicator.textContent = iWon ? '🏆 Your Team Won the Match!' : `🏁 Match Finished — Team ${winnerTeam || '?'} Wins!`;
            tnTurnIndicator.style.color = iWon ? 'var(--success)' : 'var(--text-muted)';
        } else if (phase === 'BIDDING') {
            if (isMyTurn) {
                const minBid = (details.currentBid || 14) + 1;
                tnTurnIndicator.textContent = `📢 Your Turn: Bid ${minBid}–28 or Pass`;
                tnTurnIndicator.style.color = '#f59e0b';
            } else {
                const name = tnGetPlayerName(currentPlayerId);
                tnTurnIndicator.textContent = `⏳ Waiting for ${escapeHtml(name)} to bid...`;
                tnTurnIndicator.style.color = 'var(--text-muted)';
            }
        } else if (phase === 'SELECT_TRUMP') {
            if (isMyTurn) {
                tnTurnIndicator.textContent = '🂠 Your Turn: Select Secret Trump Suit';
                tnTurnIndicator.style.color = '#8b5cf6';
            } else {
                const name = tnGetPlayerName(details.highestBidderId);
                tnTurnIndicator.textContent = `⏳ Waiting for ${escapeHtml(name)} to select trump...`;
                tnTurnIndicator.style.color = 'var(--text-muted)';
            }
        } else if (phase === 'PLAYING') {
            if (isMyTurn) {
                const leadInfo = details.leadSuit ? ` (Follow ${TN_SUIT_SYMBOLS[details.leadSuit] || details.leadSuit})` : ' (Lead any card)';
                tnTurnIndicator.textContent = `🃏 Your Turn to Play a Card${leadInfo}`;
                tnTurnIndicator.style.color = 'var(--primary)';
            } else {
                const name = tnGetPlayerName(currentPlayerId);
                tnTurnIndicator.textContent = `⏳ Waiting for ${escapeHtml(name)} to play...`;
                tnTurnIndicator.style.color = 'var(--text-muted)';
            }
        } else if (phase === 'ROUND_END') {
            tnTurnIndicator.textContent = '📊 Round Over — See Summary';
            tnTurnIndicator.style.color = '#8b5cf6';
        } else if (phase === 'GAME_OVER') {
            tnTurnIndicator.textContent = '🏁 Match Over';
            tnTurnIndicator.style.color = 'var(--text-muted)';
        }
    }

    // --- Header info ---
    const tnBidText = document.getElementById('tnBidText');
    if (tnBidText) {
        if (details.highestBidderId) {
            const bidderName = tnGetPlayerName(details.highestBidderId);
            tnBidText.textContent = `Bid: ${details.currentBid} (${escapeHtml(bidderName)})`;
        } else {
            tnBidText.textContent = 'Bid: -';
        }
    }

    const tnTrumpBadge = document.getElementById('tnTrumpBadge');
    const tnTrumpCardContainer = document.getElementById('tnTrumpCardContainer');
    const tnTrumpCard = document.getElementById('tnTrumpCard');

    if (tnTrumpBadge) {
        if (details.trumpSuit && (phase === 'PLAYING' || phase === 'ROUND_END' || phase === 'GAME_OVER')) {
            tnTrumpBadge.style.display = 'inline-block';
            if (details.trumpRevealed) {
                const sym = TN_SUIT_SYMBOLS[details.trumpSuit] || details.trumpSuit;
                const color = TN_SUIT_COLORS[details.trumpSuit] || 'inherit';
                // Show the "2 of trump suit" indicator card visible to all
                tnTrumpBadge.innerHTML = `<span style="color:${color}">${sym} Trump: ${details.trumpSuit}</span>`
                    + ` <span class="tn-trump-indicator-card" style="display:inline-flex;align-items:center;gap:2px;`
                    + `background:#fff;border:1.5px solid ${color};border-radius:4px;padding:1px 5px;`
                    + `font-size:0.8rem;color:${color};font-weight:700;margin-left:4px;">2${sym}</span>`;
                
                // Also update the big trump card at top right
                if (tnTrumpCardContainer && tnTrumpCard) {
                    tnTrumpCardContainer.style.display = 'block';
                    tnTrumpCard.innerHTML = `
                        <div class="tn-card-rank" style="color:${color}">2</div>
                        <div class="tn-card-suit" style="color:${color}">${sym}</div>
                    `;
                    tnTrumpCard.style.border = `2px solid ${color}`;
                }
            } else {
                // Only show trump to the bidder
                const isBidder = myId && myId === details.highestBidderId;
                if (isBidder) {
                    const sym = TN_SUIT_SYMBOLS[details.trumpSuit] || details.trumpSuit;
                    const color = TN_SUIT_COLORS[details.trumpSuit] || 'inherit';
                    tnTrumpBadge.textContent = `🔒 Your Trump: ${sym} ${details.trumpSuit}`;
                    tnTrumpBadge.style.color = TN_SUIT_COLORS[details.trumpSuit] || '#8b5cf6';
                    
                    // Show to bidder even if not revealed yet, but with a lock/hidden style maybe?
                    // The requirement says "Show the trump size bigger like the deck cards at top right"
                    // Usually secret trump is shown to the bidder only.
                    if (tnTrumpCardContainer && tnTrumpCard) {
                        tnTrumpCardContainer.style.display = 'block';
                        tnTrumpCard.innerHTML = `
                            <div class="tn-card-rank" style="color:${color}">?</div>
                            <div class="tn-card-suit" style="color:${color}">${sym}</div>
                            <div style="font-size:0.6rem; color:var(--text-muted); position:absolute; bottom:2px;">SECRET</div>
                        `;
                        tnTrumpCard.style.border = `2px dashed ${color}`;
                    }
                } else {
                    tnTrumpBadge.textContent = '🔒 Trump: Hidden';
                    tnTrumpBadge.style.color = 'var(--text-muted)';
                    if (tnTrumpCardContainer) tnTrumpCardContainer.style.display = 'none';
                }
            }
        } else {
            tnTrumpBadge.style.display = 'none';
            if (tnTrumpCardContainer) tnTrumpCardContainer.style.display = 'none';
        }
    }

    const tnTrickText = document.getElementById('tnTrickText');
    if (tnTrickText && phase === 'PLAYING') {
        tnTrickText.textContent = `Trick ${details.trickNumber || 1} / 8`;
    }

    const tnDoubleBadge = document.getElementById('tnDoubleBadge');
    if (tnDoubleBadge) {
        if (details.redoubled) {
            tnDoubleBadge.style.display = 'inline-block';
            tnDoubleBadge.textContent = '✖️✖️ Redoubled';
            tnDoubleBadge.style.color = '#e53e3e';
        } else if (details.doubled) {
            tnDoubleBadge.style.display = 'inline-block';
            tnDoubleBadge.textContent = '✖️ Doubled';
            tnDoubleBadge.style.color = '#f59e0b';
        } else {
            tnDoubleBadge.style.display = 'none';
        }
    }

    // --- Seat layout ---
    let myIndex = playerOrder.indexOf(myId);
    if (myIndex === -1) myIndex = 0;
    const seatPositions = ['south', 'west', 'north', 'east'];
    const seatPlayerMap = {};
    for (let i = 0; i < 4; i++) {
        const pIndex = (myIndex + i) % playerOrder.length;
        seatPlayerMap[seatPositions[i]] = playerOrder[pIndex];
    }

    for (const pos of seatPositions) {
        tnRenderPlayerPod(pos, seatPlayerMap[pos], details, playerOrder);
    }

    // --- Trick Arena ---
    const currentTrick = details.currentTrick || [];
    const lastTrick = details.lastTrick || [];
    const trickJustCompleted = currentTrick.length === 0 && lastTrick.length === 4;
    const now = Date.now();

    if (currentTrick.length > 0) {
        if (tnClearArenaTimer !== null) { clearTimeout(tnClearArenaTimer); tnClearArenaTimer = null; }
        tnTrickPauseUntil = 0;
        tnRenderTrickArena(currentTrick, seatPlayerMap, details.lastTrickWinner);
    } else if (trickJustCompleted && now > tnTrickPauseUntil) {
        const pauseDuration = details.trickNumber > 8 ? 3000 : 1500;
        tnTrickPauseUntil = now + pauseDuration;
        tnRenderTrickArena(lastTrick, seatPlayerMap, details.lastTrickWinner);
        if (tnClearArenaTimer !== null) clearTimeout(tnClearArenaTimer);
        tnClearArenaTimer = setTimeout(() => {
            tnClearArenaTimer = null;
            tnRenderTrickArena([], seatPlayerMap, null);
        }, pauseDuration);
    } else if (now < tnTrickPauseUntil) {
        // keep showing
    } else {
        tnRenderTrickArena(currentTrick, seatPlayerMap, details.lastTrickWinner);
    }

    // --- Panels ---
    tnRenderBiddingPanel(phase, isMyTurn, details);
    tnRenderTrumpPanel(phase, isMyTurn, details);
    tnRenderDoubleRedoubleButtons(details, playerOrder, myId, phase);

    // --- Hand ---
    const myHand = (myId && hands[myId]) ? hands[myId] : [];
    tnRenderHand(myHand, phase, isMyTurn, details);

    // --- Scoreboard ---
    tnRenderScoreboard(details, playerOrder);

    // --- Round Summary Modal ---
    tnHandleRoundSummaryModal(details, playerOrder, myId);
}

function tnGetPlayerName(playerId) {
    if (!playerId) return '';
    if (state.player && playerId === state.player.id) return state.player.username || playerId;
    if (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[playerId]) {
        return state.currentRoom.playerNames[playerId];
    }
    return playerId;
}

function tnTeamOf(playerId, playerOrder) {
    const idx = playerOrder.indexOf(playerId);
    return (idx === 0 || idx === 2) ? 'A' : 'B';
}

function tnGetWinnerTeam(winnerStr, playerOrder) {
    if (!winnerStr || !playerOrder) return null;
    const ids = winnerStr.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return null;
    return tnTeamOf(ids[0], playerOrder);
}

function tnRenderPlayerPod(position, playerId, details, playerOrder) {
    const podEl = document.getElementById(`tnPod_${position}`);
    if (!podEl) return;
    if (!playerId) { podEl.style.display = 'none'; return; }
    podEl.style.display = 'flex';

    const isMe = state.player && playerId === state.player.id;
    const name = tnGetPlayerName(playerId);
    const isDealer = details.dealerId === playerId;
    const isBidder = details.highestBidderId === playerId;
    const passed = (details.passedPlayers || []).includes(playerId);
    let badge = '';
    if (passed) badge += ' ✋';
    if (isDealer && !passed) badge += ' 🎲';
    if (isBidder && !passed) badge += ' 📢';

    const isCurrent = details.currentPlayerId === playerId && details.phase !== 'GAME_OVER' && !passed;
    podEl.classList.toggle('active-turn', isCurrent);
    podEl.classList.toggle('tn-passed', passed);

    const nameEl = podEl.querySelector('.tn-pod-name');
    if (nameEl) nameEl.innerHTML = `${isMe ? '<strong>👤 You</strong>' : escapeHtml(name)}${badge}`;

    const team = tnTeamOf(playerId, playerOrder);
    const teamEl = podEl.querySelector('.tn-stat-team');
    if (teamEl) {
        teamEl.textContent = team;
        teamEl.style.color = team === 'A' ? '#3b82f6' : '#f59e0b';
    }

    const gp = details.gamePoints || {};
    const gpEl = podEl.querySelector('.tn-stat-gp');
    if (gpEl) gpEl.textContent = gp[team] != null ? gp[team] : 0;
}

function tnRenderTrickArena(trick, seatPlayerMap, lastTrickWinner) {
    const positions = ['north', 'south', 'east', 'west'];
    for (const pos of positions) {
        const slot = document.getElementById(`tnSlot_${pos}`);
        if (slot) slot.innerHTML = '';
    }
    if (!trick || trick.length === 0) return;

    for (const played of trick) {
        const pos = Object.keys(seatPlayerMap).find(p => seatPlayerMap[p] === played.playerId);
        if (!pos) continue;
        const slot = document.getElementById(`tnSlot_${pos}`);
        if (!slot) continue;
        const isWinner = played.playerId === lastTrickWinner;
        slot.innerHTML = tnCardHtml(played.card, false, false, isWinner ? 'winner-glow' : '');
    }
}

function tnRenderBiddingPanel(phase, isMyTurn, details) {
    const panel = document.getElementById('tnBiddingPanel');
    if (!panel) return;
    if (phase !== 'BIDDING' || !isMyTurn) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';

    const minBid = (details.currentBid || 14) + 1;
    const buttonsDiv = document.getElementById('tnBiddingButtons');
    if (buttonsDiv) {
        let html = '';
        for (let b = minBid; b <= 28; b++) {
            html += `<button class="tn-bid-btn" onclick="tnBid(${b})">${b}</button>`;
        }
        buttonsDiv.innerHTML = html;
    }

    // Show pass only if someone has already bid
    const passBtn = document.getElementById('tnPassBtn');
    if (passBtn) passBtn.style.display = 'inline-block';

    // Show double/redouble buttons during bidding phase
    const myId = state.player ? state.player.id : null;
    const myTeam = myId ? tnTeamOf(myId, details.playerOrder) : null;
    const bidderTeam = details.highestBidderId ? tnTeamOf(details.highestBidderId, details.playerOrder) : null;

    const doubleBtn = document.getElementById('tnDoubleBtn');
    const redoubleBtn = document.getElementById('tnRedoubleBtn');

    // Double: opposing team can double during BIDDING phase (before trump is set)
    if (doubleBtn) doubleBtn.style.display = (phase === 'BIDDING' && details.highestBidderId && !details.doubled && bidderTeam !== myTeam) ? 'inline-block' : 'none';

    // Redouble: bidding team can redouble only if opponent has already doubled, during BIDDING phase
    if (redoubleBtn) redoubleBtn.style.display = (phase === 'BIDDING' && details.doubled && !details.redoubled && bidderTeam === myTeam) ? 'inline-block' : 'none';
}

function tnRenderTrumpPanel(phase, isMyTurn, details) {
    const panel = document.getElementById('tnTrumpPanel');
    if (!panel) return;
    const show = phase === 'SELECT_TRUMP' && isMyTurn && details.highestBidderId === (state.player && state.player.id);
    panel.style.display = show ? 'block' : 'none';
}

function tnRenderDoubleRedoubleButtons(details, playerOrder, myId, phase) {
    const doubleBtn = document.getElementById('tnDoubleBtn');
    const redoubleBtn = document.getElementById('tnRedoubleBtn');
    const revealBtn = document.getElementById('tnRevealTrumpBtn');

    if (!myId || state.isSpectator) {
        if (doubleBtn) doubleBtn.style.display = 'none';
        if (redoubleBtn) redoubleBtn.style.display = 'none';
        if (revealBtn) revealBtn.style.display = 'none';
        return;
    }

    const myTeam = tnTeamOf(myId, playerOrder);
    const bidderTeam = details.highestBidderId ? tnTeamOf(details.highestBidderId, playerOrder) : null;

    // Double: opposing team can double only during BIDDING phase (before trump is set and tricks played)
    if (doubleBtn) doubleBtn.style.display = (phase === 'BIDDING' && details.highestBidderId && !details.doubled && bidderTeam !== myTeam) ? 'inline-block' : 'none';

    // Redouble: bidding team can redouble only if opponent has already doubled, during BIDDING phase
    if (redoubleBtn) redoubleBtn.style.display = (phase === 'BIDDING' && details.doubled && !details.redoubled && bidderTeam === myTeam) ? 'inline-block' : 'none';

    // Reveal trump: only the player who can't follow suit (trumpRequestPending set by server)
    if (revealBtn) revealBtn.style.display = phase === 'PLAYING' && !details.trumpRevealed
        && details.trumpRequestPending && details.trumpRequesterPlayerId === myId ? 'inline-block' : 'none';
}

function tnRenderHand(hand, phase, isMyTurn, details) {
    const container = document.getElementById('tnHandContainer');
    if (!container) return;

    const handKey = JSON.stringify(hand.map(c => c.suit + c.rank)) + phase + isMyTurn;
    if (handKey === tnLastHandKey) return;
    tnLastHandKey = handKey;

    if (!hand || hand.length === 0) {
        container.innerHTML = '<div class="tn-no-cards">No cards in hand</div>';
        return;
    }

    const canPlay = phase === 'PLAYING' && isMyTurn;
    const leadSuit = details.leadSuit;

    container.innerHTML = hand.map(card => {
        let playable = false;
        if (canPlay) {
            if (!leadSuit) {
                playable = true;
            } else {
                const hasLeadSuit = hand.some(c => c.suit.toUpperCase() === leadSuit.toUpperCase());
                playable = !hasLeadSuit || card.suit.toUpperCase() === leadSuit.toUpperCase();
            }
        }
        return tnCardHtml(card, canPlay, playable, '', true);
    }).join('');

    if (canPlay) {
        container.querySelectorAll('.tn-card.playable').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                const suit = cardEl.dataset.suit;
                const rank = cardEl.dataset.rank;
                const pts = parseInt(cardEl.dataset.points || '0');
                const tr = parseInt(cardEl.dataset.trickrank || '0');
                tnPlayCard({ suit, rank, points: pts, trickRank: tr });
            });
        });
    }
}

function tnCardHtml(card, canPlay, playable, extraClass = '', showPoints = false) {
    if (!card) return '';
    const suit = card.suit || '';
    const rank = card.rank || '';
    const sym = TN_SUIT_SYMBOLS[suit.toUpperCase()] || suit;
    const color = TN_SUIT_COLORS[suit.toUpperCase()] || '#000';
    const pts = card.points || 0;
    const ptsLabel = pts > 0 ? `<span class="tn-card-pts">${pts}pt</span>` : '';
    const playableClass = canPlay ? (playable ? 'playable' : 'unplayable') : '';
    const clickable = canPlay && playable ? 'style="cursor:pointer;"' : '';
    return `<div class="tn-card ${playableClass} ${extraClass}"
        data-suit="${suit}" data-rank="${rank}" data-points="${pts}" data-trickrank="${card.trickRank || 0}"
        ${clickable}>
        <div class="tn-card-rank" style="color:${color}">${rank}</div>
        <div class="tn-card-suit" style="color:${color}">${sym}</div>
        ${showPoints ? ptsLabel : ''}
    </div>`;
}

function tnRenderScoreboard(details, playerOrder) {
    const tbody = document.getElementById('tnScoreTableBody');
    if (!tbody) return;
    const gp = details.gamePoints || {};
    const rcp = details.roundCardPoints || {};
    const playerNames = state.currentRoom && state.currentRoom.playerNames ? state.currentRoom.playerNames : {};

    let html = '';
    for (const team of ['A', 'B']) {
        const members = team === 'A' ? [playerOrder[0], playerOrder[2]] : [playerOrder[1], playerOrder[3]];
        const names = members.filter(Boolean).map(id => escapeHtml(playerNames[id] || id)).join(' & ');
        html += `<tr>
            <td>Team ${team}: ${names}</td>
            <td style="text-align:center;font-weight:700">${gp[team] || 0}</td>
            <td style="text-align:center">${rcp[team] || 0}</td>
        </tr>`;
    }
    tbody.innerHTML = html;
}

// ======================== ACTIONS ======================== //

function tnBid(amount) {
    if (state.isSpectator) return;
    sendGameAction({ action: 'BID', actionType: 'BID', bid: amount });
}

function tnPass() {
    if (state.isSpectator) return;
    sendGameAction({ action: 'PASS', actionType: 'PASS' });
}

function tnSelectTrump(suit) {
    if (state.isSpectator) return;
    sendGameAction({ action: 'SELECT_TRUMP', actionType: 'SELECT_TRUMP', trumpSuit: suit });
}

function tnDouble() {
    if (state.isSpectator) return;
    sendGameAction({ action: 'DOUBLE', actionType: 'DOUBLE' });
}

function tnRedouble() {
    if (state.isSpectator) return;
    sendGameAction({ action: 'REDOUBLE', actionType: 'REDOUBLE' });
}

function tnRequestTrump() {
    if (state.isSpectator) return;
    sendGameAction({ action: 'REQUEST_TRUMP', actionType: 'REQUEST_TRUMP' });
}

function tnPlayCard(card) {
    if (state.isSpectator) return;
    sendGameAction({ action: 'PLAY_CARD', actionType: 'PLAY_CARD', card });
}

function tnContinue() {
    sendGameAction({ action: 'CONTINUE', actionType: 'CONTINUE' });
    tnCloseRoundSummary();
}

function tnCloseRoundSummary() {
    const modal = document.getElementById('tnRoundSummaryModal');
    if (modal) modal.style.display = 'none';
}

let tnLastRoundSummaryShown = null;

function tnHandleRoundSummaryModal(details, playerOrder, myId) {
    const modal = document.getElementById('tnRoundSummaryModal');
    if (!modal) return;

    if (details.phase !== 'ROUND_END' || !details.roundSummary) {
        // Hide modal if we moved past ROUND_END
        if (details.phase !== 'ROUND_END') {
            modal.style.display = 'none';
            tnLastRoundSummaryShown = null;
        }
        return;
    }

    const s = details.roundSummary;
    // Avoid re-rendering if same summary
    const summaryKey = JSON.stringify(s);
    if (tnLastRoundSummaryShown === summaryKey) return;
    tnLastRoundSummaryShown = summaryKey;

    const bidderTeam = s.bidderTeam || '?';
    const opposingTeam = s.opposingTeam || '?';
    const bid = s.bid || 0;
    const bidderPts = s.bidderCardPoints || 0;
    const opposingPts = s.opposingCardPoints || 0;
    const succeeded = s.bidderSucceeded;
    const multiplier = s.multiplier || 1;
    const doubled = s.doubled;
    const redoubled = s.redoubled;
    const gp = s.gamePoints || {};
    const trumpSuit = s.trumpSuit || '?';
    const trumpSym = TN_SUIT_SYMBOLS[trumpSuit] || trumpSuit;
    const bidderName = tnGetPlayerName(s.highestBidderId);

    const myTeam = myId ? tnTeamOf(myId, playerOrder) : null;
    const resultText = succeeded
        ? `✅ Team ${bidderTeam} fulfilled the bid!`
        : `❌ Team ${bidderTeam} failed the bid!`;
    const resultColor = succeeded ? '#22c55e' : '#ef4444';

    let multiplierText = '';
    if (redoubled) multiplierText = ' <span style="color:#e53e3e">✖️✖️ Redoubled (×4)</span>';
    else if (doubled) multiplierText = ' <span style="color:#f59e0b">✖️ Doubled (×2)</span>';

    const gpRows = ['A', 'B'].map(t => {
        const isMe = t === myTeam;
        return `<tr style="${isMe ? 'font-weight:700' : ''}">
            <td>Team ${t}</td>
            <td style="text-align:center">${gp[t] || 0}</td>
        </tr>`;
    }).join('');

    const body = document.getElementById('tnRoundSummaryBody');
    if (body) {
        body.innerHTML = `
            <div style="text-align:center;font-size:1.2rem;font-weight:700;color:${resultColor};margin-bottom:12px">${resultText}</div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
                <tr><td>Bidder</td><td style="text-align:right"><strong>${escapeHtml(bidderName)}</strong> (Team ${bidderTeam})</td></tr>
                <tr><td>Bid</td><td style="text-align:right"><strong>${bid}</strong></td></tr>
                <tr><td>Trump</td><td style="text-align:right">${trumpSym} ${trumpSuit}</td></tr>
                <tr><td>Team ${bidderTeam} card points</td><td style="text-align:right"><strong>${bidderPts}</strong></td></tr>
                <tr><td>Team ${opposingTeam} card points</td><td style="text-align:right"><strong>${opposingPts}</strong></td></tr>
                <tr><td>Multiplier</td><td style="text-align:right"><strong>×${multiplier}</strong>${multiplierText}</td></tr>
            </table>
            <div style="font-weight:700;margin-bottom:6px">Game Points After Round:</div>
            <table style="width:100%;border-collapse:collapse">
                <tr style="background:rgba(0,0,0,0.1)"><th style="text-align:left">Team</th><th style="text-align:center">Points</th></tr>
                ${gpRows}
            </table>
        `;
    }

    const continueBtn = document.getElementById('tnRoundSummaryContinueBtn');
    if (continueBtn) {
        continueBtn.style.display = state.isSpectator ? 'none' : 'inline-block';
    }

    modal.style.display = 'flex';
}
