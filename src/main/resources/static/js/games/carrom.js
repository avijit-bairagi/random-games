// ======================== CARROM RENDERER ======================== //
// Physics constants — MUST stay in sync with CarromGameEngine.java

const CARROM = Object.freeze({
    HALF_BOARD:        380,
    COIN_R:            15,
    STRIKER_R:         18,
    POCKET_R:          25,
    COINS_PER_COLOR:   9,
    COR:               0.80,   // coefficient of restitution
    FRICTION:          0.985,  // per-step velocity multiplier
    REST_SPEED:        0.1,
    MAX_STRIKE_SPEED:  1200,
    SIM_STEPS:         3000,
    DT:                0.016,  // Euler time-step (≈ 1/60 s)
    get STRIKER_SLIDE_HALF() { return this.HALF_BOARD * 0.55; },
    get BASELINE_Y()         { return this.HALF_BOARD - this.COIN_R * 3.5; },
    POCKETS: [
        { x: -380, y: -380 },
        { x:  380, y: -380 },
        { x: -380, y:  380 },
        { x:  380, y:  380 },
    ],
});

// Canvas geometry
const CARROM_MARGIN    = 14;   // wood-border pixel width on each side
const CARROM_BOARD_PX  = 552;  // playing-area pixel size
const CARROM_CANVAS_SZ = CARROM_BOARD_PX + CARROM_MARGIN * 2;  // 580
const CARROM_SCALE     = CARROM_BOARD_PX / (CARROM.HALF_BOARD * 2); // px per board-unit

// Per-session UI state
const carromUI = {
    canvas:          null,
    ctx:             null,
    // Aim state (board coords / degrees)
    strikerX:        0,
    aimAngle:        0,    // degrees, clamped ±45
    power:           0.6,
    draggingStriker: false,
    // Animation
    animFrameId:     null,
    animSnapshots:   null,
    animSnapIdx:     0,
    // Cached game state for re-draw
    lastGameState:   null,
};

// ─────────────────────────────────────────────────────────────────
// Coordinate helpers
// ─────────────────────────────────────────────────────────────────

function carromToCanvas(bx, by) {
    return {
        x: CARROM_MARGIN + (bx + CARROM.HALF_BOARD) * CARROM_SCALE,
        y: CARROM_MARGIN + (by + CARROM.HALF_BOARD) * CARROM_SCALE,
    };
}

function canvasToCarrom(cx, cy) {
    return {
        x: (cx - CARROM_MARGIN) / CARROM_SCALE - CARROM.HALF_BOARD,
        y: (cy - CARROM_MARGIN) / CARROM_SCALE - CARROM.HALF_BOARD,
    };
}

function carromPx(boardUnits) {
    return boardUnits * CARROM_SCALE;
}

// ─────────────────────────────────────────────────────────────────
// Physics (mirrors Java CarromGameEngine, step-for-step identical)
// ─────────────────────────────────────────────────────────────────

/**
 * Returns striker velocity components for a given aiming configuration.
 * Mirrors the angle logic in CarromGameEngine.processAction.
 */
function carromStrikerVel(isPlayer1, angleDeg, power) {
    const a = Math.max(-45, Math.min(45, angleDeg));
    const rad = isPlayer1
        ? (-90 + a) * Math.PI / 180   // player1 shoots toward negative-Y
        : ( 90 + a) * Math.PI / 180;  // player2 shoots toward positive-Y
    const spd = Math.max(0, Math.min(1, power)) * CARROM.MAX_STRIKE_SPEED;
    return { vx: spd * Math.cos(rad), vy: spd * Math.sin(rad) };
}

/**
 * Resolve elastic collision between two equal-mass bodies (mirrors Java).
 */
function carromResolveCollision(a, b) {
    const dx   = b.x - a.x;
    const dy   = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minD = a.radius + b.radius;
    if (dist >= minD || dist === 0) return;

    const nx = dx / dist, ny = dy / dist;
    const ov = (minD - dist) / 2;
    a.x -= nx * ov;  a.y -= ny * ov;
    b.x += nx * ov;  b.y += ny * ov;

    const dvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (dvn > 0) return;
    const imp = -(1 + CARROM.COR) * dvn / 2;
    a.vx -= imp * nx;  a.vy -= imp * ny;
    b.vx += imp * nx;  b.vy += imp * ny;
}

/**
 * Build a mutable body array from a coin list + striker initial conditions.
 */
function carromBuildBodies(coins, strikerBX, strikerBY, svx, svy) {
    const bodies = coins.map(c => ({
        id:      c.id,
        type:    c.type,
        x:       c.x,
        y:       c.y,
        vx:      0,
        vy:      0,
        radius:  CARROM.COIN_R,
        pocketed: false,
    }));
    bodies.push({
        id:      'STRIKER',
        type:    'STRIKER',
        x:       strikerBX,
        y:       strikerBY,
        vx:      svx,
        vy:      svy,
        radius:  CARROM.STRIKER_R,
        pocketed: false,
    });
    return bodies;
}

/**
 * Run the full physics simulation and collect snapshots every N steps.
 * Identical logic to CarromGameEngine.simulate() and carromResolveCollision().
 */
function carromRunSim(bodies, snapshotEvery = 3) {
    const snapshots = [];

    for (let step = 0; step < CARROM.SIM_STEPS; step++) {
        let anyMoving = false;

        // Integrate positions + friction
        for (const b of bodies) {
            if (b.pocketed) continue;
            const spd = Math.hypot(b.vx, b.vy);
            if (spd < CARROM.REST_SPEED) { b.vx = 0; b.vy = 0; continue; }
            anyMoving = true;
            b.x += b.vx * CARROM.DT;
            b.y += b.vy * CARROM.DT;
            b.vx *= CARROM.FRICTION;
            b.vy *= CARROM.FRICTION;
        }

        if (!anyMoving) break;

        // Wall reflections
        for (const b of bodies) {
            if (b.pocketed) continue;
            const H = CARROM.HALF_BOARD;
            if (b.x + b.radius > H)  { b.x =  H - b.radius; b.vx = -Math.abs(b.vx) * CARROM.COR; }
            if (b.x - b.radius < -H) { b.x = -H + b.radius; b.vx =  Math.abs(b.vx) * CARROM.COR; }
            if (b.y + b.radius > H)  { b.y =  H - b.radius; b.vy = -Math.abs(b.vy) * CARROM.COR; }
            if (b.y - b.radius < -H) { b.y = -H + b.radius; b.vy =  Math.abs(b.vy) * CARROM.COR; }
        }

        // Body–body collisions
        for (let i = 0; i < bodies.length - 1; i++) {
            if (bodies[i].pocketed) continue;
            for (let j = i + 1; j < bodies.length; j++) {
                if (bodies[j].pocketed) continue;
                carromResolveCollision(bodies[i], bodies[j]);
            }
        }

        // Pocket detection
        for (const b of bodies) {
            if (b.pocketed) continue;
            for (const p of CARROM.POCKETS) {
                if (Math.hypot(b.x - p.x, b.y - p.y) < CARROM.POCKET_R + b.radius * 0.5) {
                    b.pocketed = true; b.vx = 0; b.vy = 0; break;
                }
            }
        }

        if (step % snapshotEvery === 0) {
            snapshots.push(bodies.map(b => ({ ...b })));
        }
    }

    snapshots.push(bodies.map(b => ({ ...b }))); // final frame
    return snapshots;
}

// ─────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────

function carromDrawBoard(ctx) {
    const M = CARROM_MARGIN, B = CARROM_BOARD_PX, S = CARROM_CANVAS_SZ;

    // Wood border
    const wg = ctx.createLinearGradient(0, 0, S, S);
    wg.addColorStop(0,   '#8b5c2a');
    wg.addColorStop(0.4, '#a06832');
    wg.addColorStop(1,   '#5c3416');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.roundRect(0, 0, S, S, 10);
    ctx.fill();

    // Inner wood edge detail
    ctx.strokeStyle = 'rgba(200,130,60,0.25)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(3, 3, S - 6, S - 6, 8);
    ctx.stroke();

    // Playing surface
    const sg = ctx.createRadialGradient(S / 2, S / 2, 30, S / 2, S / 2, S * 0.75);
    sg.addColorStop(0,   '#ede0b2');
    sg.addColorStop(0.7, '#d4b87a');
    sg.addColorStop(1,   '#c0a05a');
    ctx.fillStyle = sg;
    ctx.fillRect(M, M, B, B);

    // Board inner border line
    ctx.strokeStyle = 'rgba(100,55,15,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(M + 5, M + 5, B - 10, B - 10);

    // Diagonal corner lines (pocket guides)
    ctx.strokeStyle = 'rgba(100,55,15,0.25)';
    ctx.lineWidth   = 1;
    const guideLen  = 72;
    [[M + 5, M + 5,  1,  1], [M + B - 5, M + 5,  -1,  1],
     [M + 5, M + B - 5,  1, -1], [M + B - 5, M + B - 5, -1, -1]]
        .forEach(([x, y, dx, dy]) => {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + dx * guideLen, y + dy * guideLen);
            ctx.stroke();
        });

    // Centre circle (outer)
    const cen = carromToCanvas(0, 0);
    ctx.beginPath();
    ctx.arc(cen.x, cen.y, carromPx(48), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120,70,20,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Centre circle (inner / queen ring)
    ctx.beginPath();
    ctx.arc(cen.x, cen.y, carromPx(14), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,50,50,0.35)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Baseline guides (striker sliding range)
    const blY1 = carromToCanvas(0,  CARROM.BASELINE_Y).y;
    const blY2 = carromToCanvas(0, -CARROM.BASELINE_Y).y;
    const sh   = carromPx(CARROM.STRIKER_SLIDE_HALF);
    const cx   = S / 2;

    ctx.strokeStyle = 'rgba(100,55,15,0.35)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx - sh, blY1); ctx.lineTo(cx + sh, blY1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - sh, blY2); ctx.lineTo(cx + sh, blY2); ctx.stroke();
    ctx.setLineDash([]);

    // Pockets
    for (const p of CARROM.POCKETS) {
        const pc = carromToCanvas(p.x, p.y);
        const pr = carromPx(CARROM.POCKET_R);
        // Pocket shadow / depth
        const pg = ctx.createRadialGradient(pc.x, pc.y, pr * 0.1, pc.x, pc.y, pr);
        pg.addColorStop(0, '#0a0400');
        pg.addColorStop(1, '#1a0800');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(pc.x, pc.y, pr, 0, Math.PI * 2);
        ctx.fill();
        // Pocket rim
        ctx.strokeStyle = 'rgba(60,30,5,0.8)';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(pc.x, pc.y, pr, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function carromDrawCoin(ctx, x, y, type, radius, alpha) {
    if (alpha === undefined) alpha = 1;
    const pos = carromToCanvas(x, y);
    const r   = carromPx(radius);
    ctx.save();
    ctx.globalAlpha = alpha;

    if (type === 'QUEEN') {
        const g = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.08, pos.x, pos.y, r);
        g.addColorStop(0, '#ff8888');
        g.addColorStop(0.6, '#dd2222');
        g.addColorStop(1, '#990000');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6a0000'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.stroke();
        // Crown dot
        ctx.fillStyle = 'rgba(255,255,200,0.85)';
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r * 0.28, 0, Math.PI * 2); ctx.fill();

    } else if (type === 'BLACK') {
        const g = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.05, pos.x, pos.y, r);
        g.addColorStop(0, '#666');
        g.addColorStop(0.5, '#222');
        g.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(120,120,120,0.4)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();

    } else if (type === 'WHITE') {
        const g = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.05, pos.x, pos.y, r);
        g.addColorStop(0, '#fffff5');
        g.addColorStop(0.5, '#e8d8b0');
        g.addColorStop(1, '#c8b888');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(180,160,100,0.5)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();

    } else if (type === 'STRIKER') {
        const g = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.08, pos.x, pos.y, r);
        g.addColorStop(0, '#b0ccff');
        g.addColorStop(0.5, '#4a7de8');
        g.addColorStop(1, '#1a3d8f');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1030a0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

function carromDrawAimGuide(ctx, strikerBX, strikerBY, angleDeg, power, isPlayer1) {
    const { vx, vy } = carromStrikerVel(isPlayer1, angleDeg, power);
    const spd = Math.hypot(vx, vy);
    if (spd < 1) return;
    const dx = vx / spd, dy = vy / spd;
    const src = carromToCanvas(strikerBX, strikerBY);
    const len = 55 + power * 100;

    // Dashed aim line
    ctx.save();
    ctx.setLineDash([6, 5]);
    const col = `rgba(100,200,255,${0.45 + power * 0.45})`;
    ctx.strokeStyle = col;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(src.x + dx * len, src.y + dy * len);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    const ex = src.x + dx * len, ey = src.y + dy * len;
    const ha = Math.atan2(dy, dx);
    const hl = 10, hw = Math.PI / 6;
    ctx.fillStyle = `rgba(100,200,255,${0.7 + power * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - hl * Math.cos(ha - hw), ey - hl * Math.sin(ha - hw));
    ctx.lineTo(ex - hl * Math.cos(ha + hw), ey - hl * Math.sin(ha + hw));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/**
 * Draw the full scene: board + coins + (optional) striker & aim guide.
 * @param {object} gameState - current server game state
 * @param {Array|null} overrideCoins - if set, use these coin positions instead
 * @param {boolean} showStriker - show the aim/striker UI
 */
function carromDrawScene(gameState, overrideCoins, showStriker) {
    const canvas = carromUI.canvas;
    if (!canvas) return;
    const ctx = carromUI.ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    carromDrawBoard(ctx);

    const details     = (gameState && gameState.details) || {};
    const isPlayer1   = !!(state.player && details.player1Id === state.player.id);
    const isMyTurn    = !!(state.player && details.currentPlayerId === state.player.id);
    const gameRunning = gameState && gameState.status === 'IN_PROGRESS';

    // Coins
    const coins = overrideCoins || details.coins || [];
    for (const c of coins) {
        if (c.id === 'STRIKER') {
            carromDrawCoin(ctx, c.x, c.y, 'STRIKER', CARROM.STRIKER_R, 0.7);
        } else {
            carromDrawCoin(ctx, c.x, c.y, c.type, CARROM.COIN_R);
        }
    }

    // Striker aim UI
    if (showStriker && isMyTurn && !state.isSpectator && gameRunning) {
        const strikerBY = isPlayer1 ? CARROM.BASELINE_Y : -CARROM.BASELINE_Y;
        const strikerBX = Math.max(-CARROM.STRIKER_SLIDE_HALF, Math.min(CARROM.STRIKER_SLIDE_HALF, carromUI.strikerX));

        // Slide range highlight
        const sl = carromToCanvas(-CARROM.STRIKER_SLIDE_HALF, strikerBY);
        const sr = carromToCanvas( CARROM.STRIKER_SLIDE_HALF, strikerBY);
        ctx.save();
        ctx.strokeStyle = 'rgba(100,200,255,0.3)';
        ctx.lineWidth   = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sl.x, sl.y); ctx.lineTo(sr.x, sr.y); ctx.stroke();
        ctx.restore();

        carromDrawAimGuide(ctx, strikerBX, strikerBY, carromUI.aimAngle, carromUI.power, isPlayer1);
        carromDrawCoin(ctx, strikerBX, strikerBY, 'STRIKER', CARROM.STRIKER_R, 0.9);
    }
}

// ─────────────────────────────────────────────────────────────────
// Animation
// ─────────────────────────────────────────────────────────────────

function carromStopAnim() {
    if (carromUI.animFrameId) { cancelAnimationFrame(carromUI.animFrameId); carromUI.animFrameId = null; }
}

function carromStartAnim(gameState, strikerBX, strikerBY, angleDeg, power) {
    carromStopAnim();

    const isPlayer1 = !!(state.player && gameState.details.player1Id === state.player.id);
    const { vx, vy } = carromStrikerVel(isPlayer1, angleDeg, power);
    const bodies     = carromBuildBodies(gameState.details.coins || [], strikerBX, strikerBY, vx, vy);

    // Pre-compute all snapshots (fast, synchronous)
    const snapshots = carromRunSim(bodies, 3);

    carromUI.animSnapshots = snapshots;
    carromUI.animSnapIdx   = 0;

    function tick() {
        if (carromUI.animSnapIdx >= carromUI.animSnapshots.length) {
            carromUI.animFrameId = null;
            // Show server-authoritative state once animation is done
            carromDrawScene(carromUI.lastGameState, null, false);
            // Re-enable controls
            const btn = document.getElementById('carromStrikeBtn');
            if (btn) btn.disabled = false;
            carromUpdateControls(carromUI.lastGameState);
            return;
        }
        const snap = carromUI.animSnapshots[carromUI.animSnapIdx++];
        // Convert animated bodies to the same format as coins
        const animCoins = snap.filter(b => b.id !== 'STRIKER' && !b.pocketed)
                              .map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y }));
        const strikerBody = snap.find(b => b.id === 'STRIKER' && !b.pocketed);
        if (strikerBody) animCoins.push({ id: 'STRIKER', type: 'STRIKER', x: strikerBody.x, y: strikerBody.y });
        carromDrawScene(gameState, animCoins, false);
        carromUI.animFrameId = requestAnimationFrame(tick);
    }
    carromUI.animFrameId = requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────────────────────────
// Input handling
// ─────────────────────────────────────────────────────────────────

function carromGetPos(e) {
    const canvas = carromUI.canvas;
    const rect   = canvas.getBoundingClientRect();
    const sx     = canvas.width  / rect.width;
    const sy     = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return {
        cx: (src.clientX - rect.left) * sx,
        cy: (src.clientY - rect.top)  * sy,
    };
}

function carromIsMyTurn() {
    if (state.isSpectator) return false;
    const gs = state.currentGameState;
    return gs && gs.status === 'IN_PROGRESS' &&
           state.player && gs.details.currentPlayerId === state.player.id;
}

function carromHandlePointerDown(e) {
    if (!carromIsMyTurn() || carromUI.animFrameId) return;
    const { cx, cy }  = carromGetPos(e);
    const boardPos     = canvasToCarrom(cx, cy);
    const gs           = state.currentGameState;
    const isPlayer1    = state.player && gs.details.player1Id === state.player.id;
    const strikerBY    = isPlayer1 ? CARROM.BASELINE_Y : -CARROM.BASELINE_Y;
    const clampedSX    = Math.max(-CARROM.STRIKER_SLIDE_HALF, Math.min(CARROM.STRIKER_SLIDE_HALF, carromUI.strikerX));
    const sc           = carromToCanvas(clampedSX, strikerBY);
    // If click is near the striker disc — drag mode
    if (Math.hypot(cx - sc.x, cy - sc.y) < carromPx(CARROM.STRIKER_R) * 2.2) {
        carromUI.draggingStriker = true;
    }
}

function carromHandlePointerMove(e) {
    if (!carromIsMyTurn() || carromUI.animFrameId) return;
    e.preventDefault();
    const { cx, cy } = carromGetPos(e);
    const board       = canvasToCarrom(cx, cy);
    const gs          = state.currentGameState;
    const isPlayer1   = state.player && gs.details.player1Id === state.player.id;
    const strikerBY   = isPlayer1 ? CARROM.BASELINE_Y : -CARROM.BASELINE_Y;

    if (carromUI.draggingStriker) {
        carromUI.strikerX = Math.max(-CARROM.STRIKER_SLIDE_HALF, Math.min(CARROM.STRIKER_SLIDE_HALF, board.x));
    } else {
        // Aim toward where mouse is pointing (relative to striker)
        const strikerBX = Math.max(-CARROM.STRIKER_SLIDE_HALF, Math.min(CARROM.STRIKER_SLIDE_HALF, carromUI.strikerX));
        const dx = board.x - strikerBX;
        const dy = board.y - strikerBY;
        if (Math.hypot(dx, dy) > 5) {
            const absAngle  = Math.atan2(dy, dx);
            const fwdAngle  = isPlayer1 ? -Math.PI / 2 : Math.PI / 2;
            let   delta     = absAngle - fwdAngle;
            while (delta >  Math.PI) delta -= 2 * Math.PI;
            while (delta < -Math.PI) delta += 2 * Math.PI;
            carromUI.aimAngle = Math.max(-45, Math.min(45, delta * 180 / Math.PI));
        }
    }

    // Sync sliders
    carromSyncSliders();
    carromDrawScene(gs, null, true);
}

function carromHandlePointerUp() {
    carromUI.draggingStriker = false;
}

function carromSyncSliders() {
    const sxSlider = document.getElementById('carromStrikerXSlider');
    const aSlider  = document.getElementById('carromAngleSlider');
    if (sxSlider) sxSlider.value = ((carromUI.strikerX / CARROM.STRIKER_SLIDE_HALF) * 50 + 50).toFixed(0);
    if (aSlider)  aSlider.value  = carromUI.aimAngle.toFixed(0);
    const sxVal = document.getElementById('carromStrikerXVal');
    const aVal  = document.getElementById('carromAngleVal');
    if (sxVal) sxVal.textContent = carromUI.strikerX.toFixed(0);
    if (aVal)  aVal.textContent  = carromUI.aimAngle.toFixed(0) + '°';
}

// ─────────────────────────────────────────────────────────────────
// Controls callbacks (bound to HTML sliders / buttons)
// ─────────────────────────────────────────────────────────────────

function carromOnStrikerXChange(val) {
    carromUI.strikerX = ((val - 50) / 50) * CARROM.STRIKER_SLIDE_HALF;
    const el2 = document.getElementById('carromStrikerXVal');
    if (el2) el2.textContent = carromUI.strikerX.toFixed(0);
    if (state.currentGameState) carromDrawScene(state.currentGameState, null, true);
}

function carromOnAngleChange(val) {
    carromUI.aimAngle = parseFloat(val);
    const el2 = document.getElementById('carromAngleVal');
    if (el2) el2.textContent = val + '°';
    if (state.currentGameState) carromDrawScene(state.currentGameState, null, true);
}

function carromOnPowerChange(val) {
    carromUI.power = parseInt(val) / 100;
    const el2 = document.getElementById('carromPowerPct');
    if (el2) el2.textContent = val + '%';
    if (state.currentGameState) carromDrawScene(state.currentGameState, null, true);
}

function carromStrike() {
    if (!carromIsMyTurn() || carromUI.animFrameId) return;
    const gs = state.currentGameState;
    if (!gs || gs.status !== 'IN_PROGRESS') return;

    const isPlayer1 = !!(state.player && gs.details.player1Id === state.player.id);
    const strikerBX = Math.max(-CARROM.STRIKER_SLIDE_HALF, Math.min(CARROM.STRIKER_SLIDE_HALF, carromUI.strikerX));
    const strikerBY = isPlayer1 ? CARROM.BASELINE_Y : -CARROM.BASELINE_Y;

    // Disable strike button while animating
    const btn = document.getElementById('carromStrikeBtn');
    if (btn) btn.disabled = true;

    // Start local physics animation immediately (responsive feel)
    carromStartAnim(gs, strikerBX, strikerBY, carromUI.aimAngle, carromUI.power);

    // Send authoritative action to server
    sendGameAction({
        action:   'STRIKE',
        strikerX: strikerBX,
        angle:    carromUI.aimAngle,
        power:    carromUI.power,
    });
}

// ─────────────────────────────────────────────────────────────────
// Controls panel visibility + sync
// ─────────────────────────────────────────────────────────────────

function carromUpdateControls(gameState) {
    const panel = document.getElementById('carromControlsPanel');
    if (!panel) return;
    const myTurn = !!(state.player && gameState && gameState.details &&
                      gameState.details.currentPlayerId === state.player.id &&
                      gameState.status === 'IN_PROGRESS' && !state.isSpectator);
    panel.style.display = myTurn ? 'flex' : 'none';
}

// ─────────────────────────────────────────────────────────────────
// Canvas init
// ─────────────────────────────────────────────────────────────────

function initCarromCanvas() {
    const canvas = document.getElementById('carromCanvas');
    if (!canvas || carromUI.canvas === canvas) return;
    carromUI.canvas  = canvas;
    carromUI.ctx     = canvas.getContext('2d');
    canvas.width     = CARROM_CANVAS_SZ;
    canvas.height    = CARROM_CANVAS_SZ;

    // Mouse
    canvas.addEventListener('mousedown',  carromHandlePointerDown);
    canvas.addEventListener('mousemove',  carromHandlePointerMove, { passive: false });
    canvas.addEventListener('mouseup',    carromHandlePointerUp);
    canvas.addEventListener('mouseleave', carromHandlePointerUp);

    // Touch
    canvas.addEventListener('touchstart',  e => { e.preventDefault(); carromHandlePointerDown(e); }, { passive: false });
    canvas.addEventListener('touchmove',   e => { e.preventDefault(); carromHandlePointerMove(e); }, { passive: false });
    canvas.addEventListener('touchend',    carromHandlePointerUp,    { passive: false });
}

// ─────────────────────────────────────────────────────────────────
// Main render function (called by app.js updateGameState)
// ─────────────────────────────────────────────────────────────────

function renderCarrom(gameState) {
    if (!el.carromBoardContainer) return;
    carromUI.lastGameState = gameState;

    const details   = gameState.details || {};
    const isPlayer1 = !!(state.player && details.player1Id === state.player.id);
    const isMyTurn  = !!(state.player && details.currentPlayerId === state.player.id);
    const myColor   = isPlayer1 ? details.player1Color : details.player2Color;

    // ---- Init canvas once ----
    if (!carromUI.canvas) initCarromCanvas();

    // ---- Turn indicator ----
    const turnEl = document.getElementById('carromTurnIndicator');
    if (turnEl) {
        if (gameState.status === 'FINISHED') {
            const wid    = gameState.winner;
            const isWin  = wid && state.player && wid === state.player.id;
            const wname  = (state.currentRoom?.playerNames?.[wid]) || wid || 'Unknown';
            turnEl.textContent  = wid ? (isWin ? '🏆 You Win!' : `🏆 ${escapeHtml(wname)} Wins!`) : '🏁 Game Over';
            turnEl.style.color  = isWin ? 'var(--success)' : 'var(--danger)';
        } else if (gameState.status === 'DRAW') {
            turnEl.textContent = '🤝 Game Drawn — Max turns reached.';
            turnEl.style.color = 'var(--warning)';
        } else if (isMyTurn && !state.isSpectator) {
            const extra = details.dueToReturnQueen ? ' ⚠️ Queen will be returned!' : '';
            turnEl.textContent = `🎯 Your turn! Aim and strike.${extra}`;
            turnEl.style.color = 'var(--primary)';
        } else {
            const oppId   = isPlayer1 ? details.player2Id : details.player1Id;
            const oppName = (state.currentRoom?.playerNames?.[oppId]) || 'Opponent';
            turnEl.textContent = `⏳ ${escapeHtml(oppName)}'s turn...`;
            turnEl.style.color = 'var(--text-muted)';
        }
    }

    // ---- Colour badge ----
    const colorBadge = document.getElementById('carromMyColorBadge');
    const colorText  = document.getElementById('carromMyColorText');
    if (colorBadge && myColor && !state.isSpectator) {
        colorBadge.style.display = 'inline-flex';
        if (colorText) {
            colorText.textContent = myColor;
            colorText.style.color = myColor === 'BLACK' ? '#aaa' : '#e8d5a3';
        }
    } else if (colorBadge) {
        colorBadge.style.display = 'none';
    }

    // ---- Scores ----
    const p1El = document.getElementById('carromP1Score');
    const p2El = document.getElementById('carromP2Score');
    if (p1El) p1El.textContent = details.player1Pocketed || 0;
    if (p2El) p2El.textContent = details.player2Pocketed || 0;

    // ---- Score coin pips ----
    ['1', '2'].forEach(n => {
        const pipsEl  = document.getElementById(`carromP${n}Pips`);
        const pocketed = n === '1' ? (details.player1Pocketed || 0) : (details.player2Pocketed || 0);
        const color    = n === '1' ? details.player1Color : details.player2Color;
        if (pipsEl && color) {
            const cls = color.toLowerCase();
            pipsEl.innerHTML = Array.from({ length: pocketed }, () =>
                `<div class="carrom-mini-coin ${cls}"></div>`
            ).join('');
        }
    });

    // ---- Queen status ----
    const qEl = document.getElementById('carromQueenStatus');
    if (qEl) {
        if (details.queenPocketed) {
            if (details.queenCoveredBy) {
                qEl.textContent = '♛ Queen pocketed — cover required!';
                qEl.style.color = 'var(--warning)';
            } else if (details.dueToReturnQueen) {
                qEl.textContent = '♛ Queen returning to board…';
                qEl.style.color = 'var(--warning)';
            } else {
                qEl.textContent = '♛ Queen covered ✓';
                qEl.style.color = 'var(--success)';
            }
        } else {
            qEl.textContent = '♛ Queen on board';
            qEl.style.color = 'var(--text-muted)';
        }
    }

    // ---- Last strike message ----
    const msgEl = document.getElementById('carromLastMessage');
    if (msgEl) {
        const ls = details.lastStrike;
        if (ls && ls.message) {
            msgEl.textContent = ls.message;
            msgEl.style.color = ls.foul ? 'var(--danger)' : 'var(--text-muted)';
        } else {
            msgEl.textContent = '';
        }
    }

    // ---- Controls panel ----
    carromUpdateControls(gameState);
    carromSyncSliders();

    // ---- Draw (unless mid-animation) ----
    if (!carromUI.animFrameId) {
        carromDrawScene(gameState, null, true);
    }
}
