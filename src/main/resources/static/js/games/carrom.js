// ======================== CARROM GAME RENDERER ======================== //

const carrom = (() => {
    // Board constants (normalized [0,1] space, same as server)
    const PIECE_RADIUS  = 0.033;
    const STRIKER_RADIUS = 0.042;
    const POCKET_RADIUS  = 0.055;
    const POCKETS = [[0.07,0.07],[0.93,0.07],[0.07,0.93],[0.93,0.93]];
    const FRICTION  = 0.983;
    const MIN_SPEED = 0.0004;
    const BOARD_MARGIN = 0.04;

    // Striker baseline — always at BOTTOM for all players (front-face view)
    const STRIKER_BASELINE_Y = 0.87;
    const STRIKER_MIN_X = 0.28;
    const STRIKER_MAX_X = 0.72;

    // Drag: pull up to 30% of board width for full power
    const MAX_DRAG_NORM = 0.30;
    const MAX_SPEED     = 0.030;

    // Striker slide state: true when user is sliding striker left/right (not dragging to shoot)
    let isSliding = false;

    let canvas = null;
    let ctx    = null;
    let animationId = null;
    let isAnimating = false;

    let simPieces  = [];
    let simStriker = null;
    let onAnimationDone = null;
    let frozenPieces = null;  // holds final piece positions after animation, until server update

    // Drag / slingshot state
    let dragState = null;
    let strikerNX = 0.5;   // normalized X of striker on baseline

    let lastGameState = null;

    // ---- Canvas helpers ----

    function getCanvas() {
        if (!canvas) {
            canvas = document.getElementById('carromCanvas');
            ctx = canvas ? canvas.getContext('2d') : null;
        }
        return canvas;
    }

    function getBoardSize() {
        const c = getCanvas();
        return c ? c.width : 520;
    }

    function toPixel(norm, size) { return norm * size; }

    // ---- Board drawing ----

    function drawBoard(size) {
        if (!ctx) return;
        const m  = BOARD_MARGIN * size;   // outer margin (frame width)
        const cx = size / 2, cy = size / 2;

        // ── Outer wood frame — dark walnut matching the reference image ──
        const frameGrad = ctx.createLinearGradient(0, 0, size, size);
        frameGrad.addColorStop(0,    '#7a4828');
        frameGrad.addColorStop(0.25, '#8a5530');
        frameGrad.addColorStop(0.50, '#6e4020');
        frameGrad.addColorStop(0.75, '#8a5530');
        frameGrad.addColorStop(1,    '#6a3e1e');
        ctx.fillStyle = frameGrad;
        ctx.beginPath();
        roundRect(ctx, 0, 0, size, size, size * 0.06);
        ctx.fill();

        // Subtle wood grain lines on frame
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = '#ffd8a8';
        ctx.lineWidth = 1.2;
        for (let i = -size; i < size * 2; i += size * 0.025) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + size * 0.06, size);
            ctx.stroke();
        }
        ctx.restore();

        // ── Playing surface — warm peachy-beige matching the reference image ──
        // Warm peachy-tan surface matching the template
        const surfGrad = ctx.createRadialGradient(cx * 0.9, cy * 0.85, 0, cx, cy, size * 0.65);
        surfGrad.addColorStop(0,    '#f5d8b8');
        surfGrad.addColorStop(0.40, '#ecc89e');
        surfGrad.addColorStop(0.75, '#ddb888');
        surfGrad.addColorStop(1,    '#c9a070');
        ctx.fillStyle = surfGrad;
        ctx.fillRect(m, m, size - 2*m, size - 2*m);

        // Subtle inner vignette — darker at edges
        const vigGrad = ctx.createRadialGradient(cx, cy, size * 0.20, cx, cy, size * 0.60);
        vigGrad.addColorStop(0,   'rgba(0,0,0,0)');
        vigGrad.addColorStop(0.65, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1,   'rgba(60,30,5,0.22)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(m, m, size - 2*m, size - 2*m);

        // ── Outer border line (just inside the frame edge) ──
        ctx.strokeStyle = '#7a4820';
        ctx.lineWidth = Math.max(2, size * 0.005);
        ctx.strokeRect(m, m, size - 2*m, size - 2*m);

        // ── Double inner border lines (the two parallel lines seen in image) ──
        const inset1 = size * 0.078;
        const il1 = m + inset1, ir1 = size - m - inset1;
        const it1 = m + inset1, ib1 = size - m - inset1;
        ctx.strokeStyle = '#7a4820';
        ctx.lineWidth = Math.max(1.5, size * 0.004);
        ctx.strokeRect(il1, it1, ir1 - il1, ib1 - it1);

        const inset2 = inset1 + size * 0.020;
        const il2 = m + inset2, ir2 = size - m - inset2;
        const it2 = m + inset2, ib2 = size - m - inset2;
        ctx.strokeStyle = '#7a4820';
        ctx.lineWidth = Math.max(1.5, size * 0.004);
        ctx.strokeRect(il2, it2, ir2 - il2, ib2 - it2);

        // ── Corner pockets ──
        // In the image: dark circle at each corner of the FRAME,
        // with a salmon/pink quarter-circle decoration just inside the playing area
        const pocketR = POCKET_RADIUS * size;
        const corners = [
            { px: m, py: m, arcStart: 0,           arcEnd: Math.PI/2 },
            { px: size-m, py: m, arcStart: Math.PI/2,   arcEnd: Math.PI },
            { px: m, py: size-m, arcStart: -Math.PI/2,  arcEnd: 0 },
            { px: size-m, py: size-m, arcStart: Math.PI, arcEnd: 3*Math.PI/2 }
        ];

        corners.forEach(({ px, py, arcStart, arcEnd }) => {
            // Salmon quarter-circle decoration
            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, pocketR * 1.65, arcStart, arcEnd);
            ctx.lineTo(px, py);
            ctx.closePath();
            ctx.fillStyle = 'rgba(195,120,90,0.72)';
            ctx.fill();
            ctx.restore();

            // Dark pocket hole — positioned at the frame corner
            const pGrad = ctx.createRadialGradient(px, py, pocketR * 0.08, px, py, pocketR);
            pGrad.addColorStop(0,   '#1a0a04');
            pGrad.addColorStop(0.5, '#0d0604');
            pGrad.addColorStop(1,   '#050302');
            ctx.beginPath();
            ctx.arc(px, py, pocketR, 0, Math.PI*2);
            ctx.fillStyle = pGrad;
            ctx.fill();

            // Pocket rim
            ctx.beginPath();
            ctx.arc(px, py, pocketR, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(40,18,5,0.90)';
            ctx.lineWidth = Math.max(1.5, size * 0.003);
            ctx.stroke();
        });

        // ── Large outer center circle ──
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.22, 0, Math.PI*2);
        ctx.strokeStyle = '#8a5230';
        ctx.lineWidth = Math.max(1.5, size * 0.004);
        ctx.stroke();

        // ── Inner center circle (just a ring, no fill — pieces sit inside) ──
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.115, 0, Math.PI*2);
        ctx.strokeStyle = '#8a5230';
        ctx.lineWidth = Math.max(1.5, size * 0.003);
        ctx.stroke();

        // ── Center dot ──
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.008, 0, Math.PI*2);
        ctx.fillStyle = '#8a5230';
        ctx.fill();

        // ── Striker zones on all 4 sides ──
        // Standard: two parallel lines ~3.8cm apart, red terminal circles at each end
        // Scaled: lineHalfGap ≈ 1.9cm on a 74cm board ≈ 0.026 of board size
        const lineHalfGap = size * 0.026;  // half the ~3.8cm gap between the two parallel lines
        const lineColor   = 'rgba(100,55,25,0.90)';
        const lw          = Math.max(1.5, size * 0.003);
        // Terminal circle radius: 3.18–3.8cm diameter → radius ~1.7cm → ~0.023 of board
        const termCircleR = size * 0.028;

        // Helper: draw one striker zone given endpoints and perpendicular direction
        function drawStrikerZone(zx1, zy1, zx2, zy2, perpX, perpY) {
            // Line 1
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(zx1 + perpX * lineHalfGap, zy1 + perpY * lineHalfGap);
            ctx.lineTo(zx2 + perpX * lineHalfGap, zy2 + perpY * lineHalfGap);
            ctx.stroke();

            // Line 2
            ctx.beginPath();
            ctx.moveTo(zx1 - perpX * lineHalfGap, zy1 - perpY * lineHalfGap);
            ctx.lineTo(zx2 - perpX * lineHalfGap, zy2 - perpY * lineHalfGap);
            ctx.stroke();

            // Terminal (base) circles — red filled, at both ends of the baseline
            [[zx1, zy1], [zx2, zy2]].forEach(([ex, ey]) => {
                // Salmon/pink filled circle matching corner pocket decorations
                const cg = ctx.createRadialGradient(ex - termCircleR*0.3, ey - termCircleR*0.3, termCircleR*0.05, ex, ey, termCircleR);
                cg.addColorStop(0, 'rgba(230,160,130,0.95)');
                cg.addColorStop(0.5, 'rgba(195,115,90,0.90)');
                cg.addColorStop(1, 'rgba(155,80,55,0.85)');
                ctx.beginPath();
                ctx.arc(ex, ey, termCircleR, 0, Math.PI*2);
                ctx.fillStyle = cg;
                ctx.fill();
                // Rim
                ctx.beginPath();
                ctx.arc(ex, ey, termCircleR, 0, Math.PI*2);
                ctx.strokeStyle = 'rgba(120,60,30,0.6)';
                ctx.lineWidth = Math.max(1, size * 0.002);
                ctx.stroke();
            });
        }

        const zMin = size * STRIKER_MIN_X;
        const zMax = size * STRIKER_MAX_X;

        // Bottom side (baseline Y = STRIKER_BASELINE_Y)
        const baseY = size * STRIKER_BASELINE_Y;
        drawStrikerZone(zMin, baseY, zMax, baseY, 0, 1);

        // Top side (mirrored)
        const topY = size * (1 - STRIKER_BASELINE_Y);
        drawStrikerZone(zMin, topY, zMax, topY, 0, 1);

        // Left side
        const leftX = size * (1 - STRIKER_BASELINE_Y);
        drawStrikerZone(leftX, zMin, leftX, zMax, 1, 0);

        // Right side
        const rightX = size * STRIKER_BASELINE_Y;
        drawStrikerZone(rightX, zMin, rightX, zMax, 1, 0);
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }


    // ---- Piece / Striker drawing ----

    function drawPiece(px, py, type, size) {
        if (!ctx) return;
        const x = toPixel(px, size);
        const y = toPixel(py, size);
        const r = PIECE_RADIUS * size;

        // Drop shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur  = r * 0.8;
        ctx.shadowOffsetX = r * 0.15;
        ctx.shadowOffsetY = r * 0.2;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);

        if (type === 'RED') {
            const g = ctx.createRadialGradient(x-r*0.35, y-r*0.35, r*0.05, x+r*0.1, y+r*0.1, r);
            g.addColorStop(0, '#ff6060');
            g.addColorStop(0.5, '#cc1010');
            g.addColorStop(1, '#7a0000');
            ctx.fillStyle = g;
        } else if (type === 'BLACK') {
            const g = ctx.createRadialGradient(x-r*0.35, y-r*0.35, r*0.05, x+r*0.1, y+r*0.1, r);
            g.addColorStop(0, '#777');
            g.addColorStop(0.5, '#2a2a2a');
            g.addColorStop(1, '#080808');
            ctx.fillStyle = g;
        } else {
            const g = ctx.createRadialGradient(x-r*0.35, y-r*0.35, r*0.05, x+r*0.1, y+r*0.1, r);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.5, '#e0e0e0');
            g.addColorStop(1, '#b0b0b0');
            ctx.fillStyle = g;
        }
        ctx.fill();
        ctx.restore();

        // Rim
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.strokeStyle = type === 'BLACK' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.25)';
        ctx.lineWidth = Math.max(1, r * 0.12);
        ctx.stroke();

        // Inner ring detail (like real carrom pieces)
        ctx.beginPath();
        ctx.arc(x, y, r * 0.62, 0, Math.PI*2);
        ctx.strokeStyle = type === 'BLACK' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
        ctx.lineWidth = Math.max(0.5, r * 0.07);
        ctx.stroke();

        // Highlight shine
        ctx.beginPath();
        ctx.arc(x - r*0.30, y - r*0.30, r*0.25, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.fill();

        // Small secondary shine
        ctx.beginPath();
        ctx.arc(x - r*0.10, y - r*0.10, r*0.10, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
    }

    function drawStriker(px, py, size, isGrabbed) {
        if (!ctx) return;
        const x = toPixel(px, size);
        const y = toPixel(py, size);
        const r = STRIKER_RADIUS * size;

        // Outer glow when grabbed
        if (isGrabbed) {
            ctx.beginPath();
            ctx.arc(x, y, r * 1.8, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,220,50,0.18)';
            ctx.fill();
        }

        // Drop shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur  = r * 1.0;
        ctx.shadowOffsetX = r * 0.15;
        ctx.shadowOffsetY = r * 0.2;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        const g = ctx.createRadialGradient(x-r*0.35, y-r*0.35, r*0.05, x+r*0.1, y+r*0.1, r);
        g.addColorStop(0, isGrabbed ? '#fffbe0' : '#ffe88a');
        g.addColorStop(0.5, isGrabbed ? '#ffd040' : '#d4a017');
        g.addColorStop(1, '#8b6000');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();

        // Rim
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.strokeStyle = isGrabbed ? 'rgba(255,210,0,0.95)' : 'rgba(0,0,0,0.4)';
        ctx.lineWidth = isGrabbed ? 3 : Math.max(1.5, r * 0.1);
        ctx.stroke();

        // Inner ring detail
        ctx.beginPath();
        ctx.arc(x, y, r * 0.62, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.stroke();

        // Shine
        ctx.beginPath();
        ctx.arc(x - r*0.30, y - r*0.30, r*0.25, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fill();

        // Small secondary shine
        ctx.beginPath();
        ctx.arc(x - r*0.10, y - r*0.10, r*0.10, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        ctx.fill();

        // Dashed hint ring when idle
        if (!isGrabbed) {
            ctx.beginPath();
            ctx.arc(x, y, r + 6, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,220,50,0.50)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // ---- Slingshot visual ----

    function drawDragSlingshot(size) {
        if (!ctx || !dragState || !dragState.active) return;

        const sx = toPixel(strikerNX, size);
        const sy = toPixel(STRIKER_BASELINE_Y, size);

        const dx = dragState.currentX - sx;
        const dy = dragState.currentY - sy;
        const dragDist = Math.sqrt(dx*dx + dy*dy);
        const maxDragPx = MAX_DRAG_NORM * size;
        const power = Math.min(dragDist / maxDragPx, 1.0);

        // Shot direction is OPPOSITE to drag
        const shotDx = -dx, shotDy = -dy;
        const shotLen = Math.sqrt(shotDx*shotDx + shotDy*shotDy);
        if (shotLen < 3) return;

        const snx = shotDx / shotLen, sny = shotDy / shotLen;

        ctx.save();

        // Rubber band line (drag point to striker)
        const bandColor = `rgba(255,${Math.floor(220 - power*140)},40,0.9)`;
        ctx.strokeStyle = bandColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(dragState.currentX, dragState.currentY);
        ctx.stroke();

        // Shot direction guide line (dashed)
        const aimLen = size * 0.32 * power;
        const ex = sx + snx * aimLen;
        const ey = sy + sny * aimLen;
        ctx.setLineDash([8, 5]);
        ctx.strokeStyle = `rgba(255,${Math.floor(220 - power*140)},40,0.65)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow head
        const arrowAngle = Math.atan2(sny, snx);
        ctx.fillStyle = `rgba(255,${Math.floor(220 - power*140)},40,0.95)`;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(arrowAngle + Math.PI/2);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(6, 6);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Power arc around striker
        ctx.beginPath();
        ctx.arc(sx, sy, STRIKER_RADIUS * size + 9, -Math.PI/2, -Math.PI/2 + Math.PI*2*power);
        ctx.strokeStyle = power > 0.7 ? 'rgba(255,60,40,0.85)' : 'rgba(255,200,40,0.85)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Power % label
        ctx.fillStyle = power > 0.7 ? '#ff4028' : '#ffe028';
        ctx.font = `bold ${Math.round(size * 0.030)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(power * 100)}%`, sx, sy - STRIKER_RADIUS * size - 16);

        ctx.restore();
    }

    // ---- Static render ----

    function renderStatic(gameState) {
        const c = getCanvas();
        if (!c || !ctx) return;
        const size = c.width;
        ctx.clearRect(0, 0, size, size);
        drawBoard(size);

        const details = gameState.details || gameState;
        // Use frozen (post-animation) positions until server sends updated state
        const pieces  = frozenPieces || details.pieces || [];
        pieces.forEach(p => { if (!p.pocketed) drawPiece(p.x, p.y, p.type, size); });

        const isMyTurn = details.currentPlayerId === (state.player && state.player.id);

        if (gameState.status === 'IN_PROGRESS') {
            const isGrabbed = !!(dragState && dragState.active);
            drawStriker(strikerNX, STRIKER_BASELINE_Y, size, isGrabbed && isMyTurn);
            if (isMyTurn) drawDragSlingshot(size);
        }
    }

    // ---- Physics animation ----

    function startAnimation(pieces, sNX, sNY, angleDeg, power, callback) {
        if (animationId) cancelAnimationFrame(animationId);
        isAnimating = true;
        onAnimationDone = callback;

        const angleRad = angleDeg * Math.PI / 180;
        const speed    = MAX_SPEED * power;

        simStriker = {
            type: 'STRIKER', isStriker: true,
            x: sNX, y: sNY,
            vx: Math.cos(angleRad) * speed,
            vy: -Math.sin(angleRad) * speed,
            pocketed: false
        };

        simPieces = pieces
            .filter(p => !p.pocketed)
            .map(p => ({ type: p.type, x: p.x, y: p.y, vx: 0, vy: 0, pocketed: false, isStriker: false }));

        animateFrame();
    }

    function animateFrame() {
        const c = getCanvas();
        if (!c || !ctx) { isAnimating = false; if (onAnimationDone) onAnimationDone(); return; }
        const size = c.width;

        const allSim = [simStriker, ...simPieces];
        let anyMoving = false;

        // Move & wall bounce
        allSim.forEach(sp => {
            if (sp.pocketed) return;
            const spd = Math.sqrt(sp.vx*sp.vx + sp.vy*sp.vy);
            if (spd > MIN_SPEED) {
                anyMoving = true;
                sp.x += sp.vx;
                sp.y += sp.vy;
                sp.vx *= FRICTION;
                sp.vy *= FRICTION;
                const r = sp.isStriker ? STRIKER_RADIUS : PIECE_RADIUS;
                const wall = BOARD_MARGIN + r;
                if (sp.x < wall)        { sp.x = wall;        sp.vx =  Math.abs(sp.vx) * 0.85; }
                if (sp.x > 1 - wall)    { sp.x = 1 - wall;    sp.vx = -Math.abs(sp.vx) * 0.85; }
                if (sp.y < wall)        { sp.y = wall;        sp.vy =  Math.abs(sp.vy) * 0.85; }
                if (sp.y > 1 - wall)    { sp.y = 1 - wall;    sp.vy = -Math.abs(sp.vy) * 0.85; }
            } else {
                sp.vx = 0; sp.vy = 0;
            }
        });

        // Elastic collisions (multiple passes for stability)
        for (let pass = 0; pass < 3; pass++) {
            for (let i = 0; i < allSim.length; i++) {
                const a = allSim[i];
                if (a.pocketed) continue;
                for (let j = i+1; j < allSim.length; j++) {
                    const b = allSim[j];
                    if (b.pocketed) continue;
                    resolveElasticCollision(a, b);
                }
            }
        }

        // Pocket detection
        allSim.forEach(sp => {
            if (sp.pocketed) return;
            POCKETS.forEach(([px, py]) => {
                const dx = sp.x - px, dy = sp.y - py;
                if (Math.sqrt(dx*dx + dy*dy) < POCKET_RADIUS * 0.85) {
                    sp.pocketed = true;
                    sp.vx = 0; sp.vy = 0;
                }
            });
        });

        // Draw frame
        ctx.clearRect(0, 0, size, size);
        drawBoard(size);
        simPieces.forEach(sp => { if (!sp.pocketed) drawPiece(sp.x, sp.y, sp.type, size); });
        if (!simStriker.pocketed) drawStriker(simStriker.x, simStriker.y, size, false);

        if (anyMoving) {
            animationId = requestAnimationFrame(animateFrame);
        } else {
            isAnimating = false;
            animationId = null;
            frozenPieces = null;  // always snap to server-authoritative positions after animation
            if (onAnimationDone) onAnimationDone();
        }
    }

    // Proper 2D elastic collision (equal mass)
    function resolveElasticCollision(a, b) {
        const ra = a.isStriker ? STRIKER_RADIUS : PIECE_RADIUS;
        const rb = b.isStriker ? STRIKER_RADIUS : PIECE_RADIUS;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = ra + rb;
        if (dist >= minDist || dist < 0.0001) return;

        // Separate overlapping pieces
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist, ny = dy / dist;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        // Relative velocity along collision normal
        const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
        const dot  = dvx * nx + dvy * ny;
        if (dot <= 0) return; // already separating

        // Equal-mass elastic: exchange velocity components along normal
        // with slight energy loss (restitution 0.92)
        const restitution = 0.92;
        const impulse = dot * restitution;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
    }

    // ---- Canvas interaction ----

    function getEventPos(e) {
        const c = getCanvas();
        const rect = c.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (c.width  / rect.width),
            y: (e.clientY - rect.top)  * (c.height / rect.height)
        };
    }

    function getTouchPos(touch) {
        return getEventPos({ clientX: touch.clientX, clientY: touch.clientY });
    }

    function isMyTurnNow() {
        const details = lastGameState && (lastGameState.details || lastGameState);
        return details
            && details.currentPlayerId === (state.player && state.player.id)
            && lastGameState.status === 'IN_PROGRESS'
            && !isAnimating;
    }

    function isNearStriker(px, py, size) {
        const sx = strikerNX * size;
        const sy = STRIKER_BASELINE_Y * size;
        // Generous hit area: 3× striker radius
        const r  = STRIKER_RADIUS * size * 3.0;
        const dx = px - sx, dy = py - sy;
        return Math.sqrt(dx*dx + dy*dy) < r;
    }

    function isInStrikerZone(px, py, size) {
        // Check if point is within the striker zone band (bottom baseline)
        const ny  = STRIKER_BASELINE_Y * size;
        const bx1 = STRIKER_MIN_X * size;
        const bx2 = STRIKER_MAX_X * size;
        return Math.abs(py - ny) < size * 0.10 && px >= bx1 - size * 0.05 && px <= bx2 + size * 0.05;
    }

    function onPointerDown(px, py) {
        if (!isMyTurnNow()) return;
        const size = getBoardSize();

        if (isNearStriker(px, py, size)) {
            // Check if the initial movement is more horizontal (slide) or vertical (drag to shoot)
            // We'll decide on first move; for now start as potential drag
            isSliding = false;
            dragState = {
                active: true,
                startX: strikerNX * size,
                startY: STRIKER_BASELINE_Y * size,
                currentX: px,
                currentY: py,
                downX: px,
                downY: py
            };
            renderStatic(lastGameState);
        } else if (isInStrikerZone(px, py, size)) {
            // Tap anywhere in striker zone to reposition striker
            strikerNX = Math.max(STRIKER_MIN_X, Math.min(STRIKER_MAX_X, px / size));
            isSliding = false;
            dragState = null;
            renderStatic(lastGameState);
        }
    }

    function onPointerMove(px, py) {
        if (!dragState || !dragState.active) return;

        const size = getBoardSize();
        const movedX = Math.abs(px - dragState.downX);
        const movedY = Math.abs(py - dragState.downY);

        // Determine slide vs shoot on first significant movement
        if (!isSliding && movedX > 4 && movedX > movedY * 1.5) {
            // Predominantly horizontal movement → slide striker left/right
            isSliding = true;
        } else if (!isSliding && movedY > 6) {
            // Predominantly vertical movement → slingshot drag to shoot
            isSliding = false;
        }

        if (isSliding) {
            // Slide striker along baseline
            strikerNX = Math.max(STRIKER_MIN_X, Math.min(STRIKER_MAX_X, px / size));
            dragState.startX = strikerNX * size;
            dragState.startY = STRIKER_BASELINE_Y * size;
            dragState.currentX = px;
            dragState.currentY = dragState.startY; // keep on baseline
        } else {
            dragState.currentX = px;
            dragState.currentY = py;
        }

        if (lastGameState) renderStatic(lastGameState);
    }

    function onPointerUp(px, py) {
        if (!dragState || !dragState.active) return;

        const wasSliding = isSliding;
        isSliding = false;

        if (wasSliding) {
            // Finished sliding — just update position, no shot
            dragState = null;
            if (lastGameState) renderStatic(lastGameState);
            return;
        }

        dragState.currentX = px;
        dragState.currentY = py;

        const size = getBoardSize();
        const sx   = strikerNX * size;
        const sy   = STRIKER_BASELINE_Y * size;
        const dx   = dragState.currentX - sx;
        const dy   = dragState.currentY - sy;
        const dragDist  = Math.sqrt(dx*dx + dy*dy);
        const maxDragPx = MAX_DRAG_NORM * size;
        const power     = Math.min(dragDist / maxDragPx, 1.0);

        dragState = null;

        if (power < 0.08) {
            if (lastGameState) renderStatic(lastGameState);
            return;
        }

        // Shot direction is OPPOSITE to drag
        const shotDx   = -dx, shotDy = -dy;
        const angleDeg = Math.atan2(-shotDy, shotDx) * 180 / Math.PI;

        fireStrike(strikerNX, STRIKER_BASELINE_Y, angleDeg, power);
    }

    function fireStrike(sNX, sNY, angleDeg, power) {
        const details = lastGameState && (lastGameState.details || lastGameState);
        if (!details) return;

        const pieces = (details.pieces || []).filter(p => !p.pocketed);
        startAnimation(pieces, sNX, sNY, angleDeg, power, () => {
            if (lastGameState) renderStatic(lastGameState);
            updateHint(true);
        });

        if (typeof sendGameAction === 'function') {
            sendGameAction({ actionType: 'STRIKE', strikerX: sNX, angle: angleDeg, power });
        }

        updateHint(false);
    }

    function updateHint(enabled) {
        const hint = document.getElementById('carromDragHint');
        if (hint) {
            hint.textContent = enabled
                ? '👆 Grab the striker and pull back, then release to shoot'
                : '⏳ Waiting for result...';
        }
    }

    function setupCanvasInteraction() {
        const c = getCanvas();
        if (!c) return;

        c.addEventListener('mousedown', e => { const p = getEventPos(e); onPointerDown(p.x, p.y); });
        c.addEventListener('mousemove', e => {
            const p = getEventPos(e);
            if (!dragState || !dragState.active) {
                // Only update cursor when not dragging
                if (isMyTurnNow()) {
                    c.style.cursor = isNearStriker(p.x, p.y, getBoardSize()) ? 'grab' : 'default';
                } else {
                    c.style.cursor = 'default';
                }
            }
            onPointerMove(p.x, p.y);
        });
        // Track drag and fire shot anywhere on the page (so dragging outside canvas works)
        document.addEventListener('mousemove', e => {
            if (dragState && dragState.active) {
                const p = getEventPos(e);
                onPointerMove(p.x, p.y);
            }
        });
        document.addEventListener('mouseup', e => {
            if (dragState && dragState.active) {
                const p = getEventPos(e);
                onPointerUp(p.x, p.y);
            }
        });

        c.addEventListener('touchstart', e => {
            e.preventDefault();
            const p = getTouchPos(e.touches[0]);
            onPointerDown(p.x, p.y);
        }, { passive: false });
        c.addEventListener('touchmove', e => {
            e.preventDefault();
            const p = getTouchPos(e.touches[0]);
            onPointerMove(p.x, p.y);
        }, { passive: false });
        c.addEventListener('touchend', e => {
            e.preventDefault();
            const p = getTouchPos(e.changedTouches[0]);
            onPointerUp(p.x, p.y);
        }, { passive: false });
    }

    // ---- Public render ----

    function renderCarrom(gameState) {
        const prevState = lastGameState;
        lastGameState = gameState;
        frozenPieces = null;  // server sent new state — clear frozen positions
        const details  = gameState.details || gameState;
        const isMyTurn = details.currentPlayerId === (state.player && state.player.id);

        // If the incoming state has a lastStrike from another player (opponent's move),
        // replay the animation so the opponent sees the pieces move visually.
        const ls = details.lastStrike;
        const prevDetails = prevState && (prevState.details || prevState);
        const prevPieces  = prevDetails && prevDetails.pieces;
        const isMine = ls && ls.playerId === (state.player && state.player.id);
        let startedOpponentAnimation = false;
        if (ls && !isMine && !isAnimating && prevPieces && prevPieces.length > 0) {
            // Determine striker baseline Y for the opponent who struck
            const players = gameState.players || [];
            const playerColors = details.playerColors || {};
            const strikerColor = playerColors[ls.playerId] || 'BLACK';
            let strikerY;
            if (players.length === 4) {
                const idx = players.indexOf(ls.playerId);
                strikerY = [0.88, 0.5, 0.12, 0.5][idx] ?? 0.88;
            } else {
                strikerY = strikerColor === 'BLACK' ? 0.88 : 0.12;
            }
            startAnimation(prevPieces, ls.strikerX, strikerY, ls.angle, ls.power, () => {
                if (lastGameState) renderStatic(lastGameState);
                // After opponent animation, show "your turn" hint
                const hint = document.getElementById('carromDragHint');
                if (hint) hint.textContent = '👆 Grab the striker and pull back, then release to shoot';
            });
            startedOpponentAnimation = true;
        }

        // Turn indicator
        const turnEl = document.getElementById('carromTurnIndicator');
        if (turnEl) {
            if (gameState.status === 'FINISHED') {
                const winnerName = (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[gameState.winner])
                    || (gameState.winner === (state.player && state.player.id) ? (state.player && state.player.username) : gameState.winner);
                turnEl.textContent = gameState.winner
                    ? `🏆 ${gameState.winner === (state.player && state.player.id) ? 'You Won!' : 'Winner: ' + escapeHtml(winnerName)}`
                    : 'Game Finished';
                turnEl.style.color = 'var(--success, #22c55e)';
            } else if (gameState.status === 'WAITING' || gameState.status === 'READY') {
                turnEl.textContent = gameState.status === 'READY'
                    ? '⚡ Ready! Host can start the game'
                    : '⏳ Waiting for players to join...';
                turnEl.style.color = 'var(--text-muted)';
            } else {
                turnEl.textContent = isMyTurn ? '🎯 Your Turn — Pull & Release!' : "⏳ Opponent's Turn...";
                turnEl.style.color = isMyTurn ? 'var(--primary, #6366f1)' : 'var(--text-muted)';
            }
        }

        // Drag hint
        const hint = document.getElementById('carromDragHint');
        if (hint) {
            if (gameState.status === 'IN_PROGRESS') {
                hint.style.display = 'block';
                if (!isAnimating) {
                    hint.textContent = isMyTurn
                        ? '👆 Grab the striker and pull back, then release to shoot'
                        : '👀 Watch your opponent...';
                }
            } else {
                hint.style.display = 'none';
            }
        }

        // Color badge
        const myColor   = details.playerColors && state.player ? details.playerColors[state.player.id] : null;
        const colorBadge = document.getElementById('carromMyColorBadge');
        if (colorBadge && myColor) {
            colorBadge.style.display = 'block';
            const colorSpan = document.getElementById('carromMyColorText');
            if (colorSpan) {
                colorSpan.textContent = myColor;
                colorSpan.className   = 'carrom-color-highlight ' + myColor.toLowerCase();
            }
        }

        // Queen badge
        const queenBadge = document.getElementById('carromQueenBadge');
        if (queenBadge) {
            if (details.queenPocketed) {
                queenBadge.style.display = 'inline-block';
                queenBadge.textContent   = details.queenCovered ? '👑 Queen Covered' : '👑 Queen Pocketed — Cover it!';
                queenBadge.className     = 'carrom-queen-badge' + (details.queenCovered ? ' covered' : '');
            } else {
                queenBadge.style.display = 'none';
            }
        }

        updateScoreboard(gameState);

        if (!isAnimating && !startedOpponentAnimation) renderStatic(gameState);
    }

    function updateScoreboard(gameState) {
        const container = document.getElementById('carromScoreboard');
        if (!container) return;
        const details      = gameState.details || gameState;
        const scores       = details.scores || {};
        const playerColors = details.playerColors || {};
        const players      = gameState.players || [];

        container.innerHTML = players.map(pid => {
            const name  = (state.currentRoom && state.currentRoom.playerNames && state.currentRoom.playerNames[pid])
                || (pid === (state.player && state.player.id) ? (state.player && state.player.username) : pid);
            const score = scores[pid] || 0;
            const color = playerColors[pid] || 'BLACK';
            const isActive  = details.currentPlayerId === pid;
            const dotColor  = color === 'BLACK' ? '#333' : color === 'WHITE' ? '#eee' : '#ef4444';
            return `<div class="carrom-score-card${isActive ? ' active-player' : ''}">
                <div class="carrom-score-name">
                    <span class="carrom-score-color-dot" style="background:${dotColor};border:1px solid #888;"></span>
                    ${escapeHtml(name)}${pid === (state.player && state.player.id) ? ' (You)' : ''}
                </div>
                <div class="carrom-score-value">${score}</div>
            </div>`;
        }).join('');
    }

    function initCarromCanvas() {
        const c = getCanvas();
        if (!c) return;
        const container = c.parentElement;
        const maxSize   = Math.min(container ? container.clientWidth : 520, 520);
        c.width  = maxSize;
        c.height = maxSize;
        setupCanvasInteraction();
        if (lastGameState) renderStatic(lastGameState);
    }

    return { renderCarrom, initCarromCanvas };
})();

function renderCarrom(gameState) {
    carrom.renderCarrom(gameState);
}

function initCarromCanvas() {
    carrom.initCarromCanvas();
}
