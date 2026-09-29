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

