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

