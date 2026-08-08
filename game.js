const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dialogBox = document.getElementById('dialog-box');
const promptEl = document.getElementById('prompt');
const titleScreen = document.getElementById('title-screen');
const gameOverScreen = document.getElementById('game-over');
const musicToggle = document.getElementById('music-toggle');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Vertical hallway
const HALL_WIDTH = 140;
const HALL_LEFT = (WIDTH - HALL_WIDTH) / 2;
const HALL_RIGHT = HALL_LEFT + HALL_WIDTH;
const HALL_LENGTH = 1000;

// Doors are flush in the wall - fully on the other side, seen face-on
// They do NOT extend into the hallway at all
const DOOR_W = 44;
const DOOR_H = 60;

// Camera
let camera = { y: 0 };

// Game state
let gameState = 'title';
let player = {
    x: WIDTH / 2 - 12,
    y: HALL_LENGTH - 80,
    width: 24,
    height: 36,
    speed: 3.0,
    facing: 'up',
    animTimer: 0
};
let nearDoor = null;
let currentDoorIsDead = false;
let musicEnabled = true;

// Cutscene / murderer chase state
let cutsceneState = null; // 'murderer-appears', 'exclamation', 'step1', 'step2', 'chase'
let cutsceneTimer = 0;
let murdererY = 0;
let murdererSpeed = 0.4;
let playerDead = false;

// Level 1.2 - Room 405
let roomState = null; // 'room', 'bathroom', 'balcony', 'book-closeup', 'book-open', 'fade-white'
let roomPlayerX = 0;
let roomPlayerY = 0;
let roomPlayerFacing = 'up';
let roomNearItem = null;
let doorPoundTimer = 0;
let doorPoundCount = 0;
let doorPoundPause = false;
let doorPoundDelay = 120;
let fadeWhiteAlpha = 0;

// Character selection
let selectedCharIndex = 0;
let selectedChar = null;
let charSelectState = 'captain-intro'; // 'captain-intro', 'selecting', 'captain-outro', 'fade-out'
let fadeAlpha = 0;
let charSlideOffset = 0;
let charSelectEnteredAt = 0;

const CHARACTERS = [
    { name: 'Gay', type: 'default', speedoColor: '#ff1493', speedoShade: '#cc0077' },
    { name: 'Gay', type: 'default', speedoColor: '#00cc44', speedoShade: '#009933' },
    { name: 'Another Gay', type: 'default', speedoColor: '#3366ff', speedoShade: '#2244cc' },
    { name: 'This one has red hair (diversity)', type: 'redhead', speedoColor: '#ff1493', speedoShade: '#cc0077' },
    { name: 'Bear', type: 'bear', speedoColor: '#222222', speedoShade: '#111111' },
    { name: 'Twink', type: 'twink', speedoColor: '#ffdd00', speedoShade: '#ccaa00' },
    { name: 'Daddy', type: 'daddy', speedoColor: '#445566', speedoShade: '#334455' },
    { name: 'The only woman on the entire ship', type: 'woman', speedoColor: '#ff1493', speedoShade: '#cc0077' },
];

const COLORS = {
    wall: '#2a1a3a',
    wallAccent: '#3d2a5c',
    wallTrim: '#4a2a1a',
    carpet: '#4a0e2e',
    carpetPattern: '#5c1438',
    carpetEdge: '#3a0a22',
    door: '#8B4513',
    doorDark: '#6d3a0a',
    doorFrame: '#d4a574',
    doorKnob: '#ffd700',
    skin: '#d4a076',
    skinShadow: '#b8886a',
    speedo: '#ff1493',
    speedoShade: '#cc0077',
    croptop: '#00ccff',
    croptopShade: '#0099cc',
    hair: '#3a2a1a',
    sign: '#f5f0e0',
    signBorder: '#6b4423',
    jeans: '#2b4570',
    jeansDark: '#1e3350',
    shoe: '#222',
};

// Side doors: positioned on the wall. The doorframe opening is in the wall,
// and the door faces into the hallway (we see it edge-on from above).
// End door: on the north wall, we see it face-on.
const doors = [
    { y: 750, side: 'left', sign: 'Birthday Bitch \u{1F382}', color: '#ff69b4', number: '401' },
    { y: 450, side: 'left', sign: 'No clothes beyond\nthis point \u{1F608}', color: '#e74c3c', number: '403' },
    { y: 600, side: 'right', sign: 'First time \ncruiser!', color: '#9b59b6', number: '402' },
    { y: 300, side: 'right', sign: 'Beware Of Twink\n(he bites) \u{1F62C}', color: '#f39c12', number: '404' },
    { y: 0, side: 'end', sign: null, color: '#2c3e50', ajar: true, dead: true, number: '405' },
];

// Input
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    handleAction(e.key);
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function handleAction(key) {
    if (gameState === 'title') { showLevelSelect(); return; }
    if (gameState === 'levelselect') { return; }
    if (gameState === 'charselect') { handleCharSelectAction(key); return; }
    if (gameState === 'dialog' || gameState === 'room-dialog') { closeDialog(); return; }
    if (gameState === 'playing' && (key.toLowerCase() === 'e' || key === ' ' || key === 'examine') && nearDoor !== null) {
        openDoorDialog(); return;
    }
    if (gameState === 'room' && (key.toLowerCase() === 'e' || key === ' ' || key === 'examine') && roomNearItem !== null) {
        examineRoomItem(); return;
    }
    if (gameState === 'book-closeup' && (key.toLowerCase() === 'e' || key === ' ' || key === 'examine')) {
        openBook(); return;
    }
    if (gameState === 'gameover') { location.reload(); }
    if (gameState === 'level2') { handleLevel2Action(key); return; }
    if (gameState === 'level2-complete') { location.reload(); }
}

function showLevelSelect() {
    gameState = 'levelselect';
    titleScreen.style.display = 'none';
    document.getElementById('level-select').style.display = 'flex';
}

function selectLevel(level) {
    document.getElementById('level-select').style.display = 'none';
    if (level === 0) {
        startCharSelect();
    } else if (level === 1) {
        startCharSelect();
    } else if (level === 2) {
        selectedChar = selectedChar || CHARACTERS[0];
        startLevel2();
    }
}

function startCharSelect() {
    gameState = 'charselect';
    charSelectState = 'captain-intro';
    charSelectEnteredAt = Date.now();
    titleScreen.style.display = 'none';
    if (musicEnabled) GameMusic.startMusic('hallway');
}

function handleCharSelectAction(key) {
    if (Date.now() - charSelectEnteredAt < 300) return;
    const k = key.toLowerCase();
    if (charSelectState === 'captain-intro') {
        charSelectState = 'selecting';
        return;
    }
    if (charSelectState === 'selecting') {
        if (k === 'arrowleft' || k === 'a') {
            selectedCharIndex = (selectedCharIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
            charSlideOffset = -120;
        } else if (k === 'arrowright' || k === 'd') {
            selectedCharIndex = (selectedCharIndex + 1) % CHARACTERS.length;
            charSlideOffset = 120;
        } else if (k === 'enter' || k === ' ' || k === 'e' || k === 'examine') {
            selectedChar = CHARACTERS[selectedCharIndex];
            charSelectState = 'captain-outro';
        }
        return;
    }
    if (charSelectState === 'captain-outro') {
        charSelectState = 'fade-out';
        return;
    }
}

function startLevel1() {
    gameState = 'playing';
    GameMusic.stopMusic();
    if (musicEnabled) GameMusic.startMusic('charselect');
}

function closeDialog() {
    if (gameState === 'room-dialog') {
        gameState = 'room';
        dialogBox.classList.remove('visible');
    } else if (currentDoorIsDead) {
        currentDoorIsDead = false;
        gameState = 'cutscene';
        cutsceneState = 'murderer-appears';
        cutsceneTimer = 0;
        murdererY = player.y + 200;
        dialogBox.classList.remove('visible');
    } else {
        gameState = 'playing';
        dialogBox.classList.remove('visible');
    }
}

function openDoorDialog() {
    gameState = 'dialog';
    currentDoorIsDead = doors[nearDoor].dead || false;
    if (currentDoorIsDead) {
        dialogBox.innerHTML = '<span style="color:#ff4444; font-size:16px;">You\'ve discovered a dead body!!</span><br><br><span style="color:#aaa">Press any key...</span>';
        GameMusic.stopMusic();
        if (musicEnabled) GameMusic.startMusic('panic');
    } else {
        const sign = doors[nearDoor].sign.replace(/\n/g, '<br>');
        dialogBox.innerHTML = '<span style="color:#ffcc00;">The sign reads:</span><br><br>"' + sign + '"<br><br><span style="color:#aaa">Press any key to close</span>';
    }
    dialogBox.classList.add('visible');
    promptEl.classList.remove('visible');
}

// Mobile controls
const dpadBtns = document.querySelectorAll('.dpad-btn');
const dirMap = { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' };
dpadBtns.forEach(btn => {
    const dir = btn.dataset.dir;
    const key = dirMap[dir];
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); keys[key] = true; btn.classList.add('active');
        if (gameState === 'charselect') {
            if (charSelectState === 'selecting') handleAction(key);
            else handleAction('tap');
        }
    });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; btn.classList.remove('active'); });
    btn.addEventListener('touchcancel', () => { keys[key] = false; btn.classList.remove('active'); });
});

const btnExamine = document.getElementById('btn-examine');
btnExamine.addEventListener('touchstart', (e) => {
    e.preventDefault(); btnExamine.classList.add('active');
    if (gameState === 'charselect') handleAction('examine');
    else if (gameState === 'dialog' || gameState === 'room-dialog') closeDialog();
    else handleAction('examine');
});
btnExamine.addEventListener('touchend', (e) => { e.preventDefault(); btnExamine.classList.remove('active'); });

// Swipe and tap support on canvas for character selection
let touchStartX = null;
let touchStartY = null;
let touchHandledAsArrow = false;
canvas.addEventListener('touchstart', (e) => {
    if (gameState === 'charselect' && charSelectState === 'selecting') {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchHandledAsArrow = false;
        const rect = canvas.getBoundingClientRect();
        const scaleX = WIDTH / rect.width;
        const scaleY = HEIGHT / rect.height;
        const cx = (e.touches[0].clientX - rect.left) * scaleX;
        const cy = (e.touches[0].clientY - rect.top) * scaleY;
        const arrowY = HEIGHT / 2 - 30;
        if (Math.abs(cx - (WIDTH / 2 - 100)) < 30 && Math.abs(cy - arrowY) < 30) {
            handleAction('arrowleft');
            touchHandledAsArrow = true;
        } else if (Math.abs(cx - (WIDTH / 2 + 100)) < 30 && Math.abs(cy - arrowY) < 30) {
            handleAction('arrowright');
            touchHandledAsArrow = true;
        }
    } else if (gameState === 'charselect') {
        e.preventDefault();
        handleAction('tap');
    }
});
canvas.addEventListener('touchend', (e) => {
    if (touchStartX !== null && !touchHandledAsArrow && gameState === 'charselect' && charSelectState === 'selecting') {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 30) {
            handleAction(dx < 0 ? 'arrowright' : 'arrowleft');
        }
    }
    touchStartX = null;
    touchHandledAsArrow = false;
});

document.getElementById('start-btn').addEventListener('click', () => handleAction('tap'));
document.getElementById('start-btn').addEventListener('touchstart', (e) => { e.preventDefault(); handleAction('tap'); });
document.getElementById('restart-btn').addEventListener('click', () => handleAction('tap'));
document.getElementById('restart-btn').addEventListener('touchstart', (e) => { e.preventDefault(); handleAction('tap'); });
dialogBox.addEventListener('click', () => handleAction('tap'));
dialogBox.addEventListener('touchstart', (e) => { e.preventDefault(); handleAction('tap'); });
canvas.addEventListener('click', (e) => {
    if (gameState === 'charselect') {
        if (charSelectState === 'selecting') {
            const rect = canvas.getBoundingClientRect();
            const scaleX = WIDTH / rect.width;
            const scaleY = HEIGHT / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top) * scaleY;
            const arrowY = HEIGHT / 2 - 30;
            if (Math.abs(cx - (WIDTH / 2 - 100)) < 30 && Math.abs(cy - arrowY) < 30) {
                handleAction('arrowleft');
            } else if (Math.abs(cx - (WIDTH / 2 + 100)) < 30 && Math.abs(cy - arrowY) < 30) {
                handleAction('arrowright');
            }
        } else if (charSelectState === 'captain-intro' || charSelectState === 'captain-outro') {
            handleAction('tap');
        }
    }
});

musicToggle.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    musicToggle.textContent = musicEnabled ? 'Music: ON' : 'Music: OFF';
    if (musicEnabled) {
        if (gameState === 'charselect') GameMusic.startMusic('hallway');
        else if (gameState === 'playing') GameMusic.startMusic('charselect');
        else if (gameState === 'level2') GameMusic.startMusic('charselect');
        else if (gameState === 'gameover' || gameState === 'cutscene' || gameState === 'chase' || gameState === 'room') GameMusic.startMusic('panic');
    } else {
        GameMusic.stopMusic();
    }
});

// Helpers
function sy(worldY) { return worldY - camera.y; }

// Drawing
function drawHallway() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const startY = Math.max(0, sy(0));
    const endY = Math.min(HEIGHT, sy(HALL_LENGTH));

    // Walls
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, startY, HALL_LEFT, endY - startY);
    ctx.fillRect(HALL_RIGHT, startY, WIDTH - HALL_RIGHT, endY - startY);

    // Wall horizontal lines
    for (let wy = 0; wy < HALL_LENGTH; wy += 48) {
        const s = sy(wy);
        if (s < -4 || s > HEIGHT) continue;
        ctx.fillStyle = COLORS.wallAccent;
        ctx.fillRect(0, s, HALL_LEFT, 2);
        ctx.fillRect(HALL_RIGHT, s, WIDTH - HALL_RIGHT, 2);
    }

    // Wall trim (inner edge)
    ctx.fillStyle = COLORS.wallTrim;
    ctx.fillRect(HALL_LEFT - 4, startY, 4, endY - startY);
    ctx.fillRect(HALL_RIGHT, startY, 4, endY - startY);

    // Carpet floor
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(HALL_LEFT, startY, HALL_WIDTH, endY - startY);

    // Carpet pattern
    for (let cy = 0; cy < HALL_LENGTH; cy += 32) {
        const s = sy(cy);
        if (s < -32 || s > HEIGHT) continue;
        ctx.fillStyle = COLORS.carpetPattern;
        ctx.fillRect(HALL_LEFT + 20, s + 8, 12, 12);
        ctx.fillRect(HALL_RIGHT - 32, s + 8, 12, 12);
        ctx.fillStyle = COLORS.carpetEdge;
        ctx.fillRect(HALL_LEFT + HALL_WIDTH / 2 - 4, s + 12, 8, 8);
    }

    // Carpet edge runners
    ctx.fillStyle = '#6a1a3e';
    ctx.fillRect(HALL_LEFT + 3, startY, 2, endY - startY);
    ctx.fillRect(HALL_RIGHT - 5, startY, 2, endY - startY);

    // North wall (the end door is embedded in this)
    const northWallTop = sy(-30);
    const northWallBottom = sy(30);
    if (northWallBottom > 0 && northWallTop < HEIGHT) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(HALL_LEFT, northWallTop, HALL_WIDTH, 60);
        ctx.fillStyle = COLORS.wallTrim;
        ctx.fillRect(HALL_LEFT, northWallBottom - 4, HALL_WIDTH, 4);
        ctx.fillStyle = COLORS.wallAccent;
        ctx.fillRect(HALL_LEFT, northWallTop + 10, HALL_WIDTH, 2);
        ctx.fillRect(HALL_LEFT, northWallTop + 30, HALL_WIDTH, 2);
    }

    // Sconces
    for (let wy = 120; wy < HALL_LENGTH; wy += 180) {
        const s = sy(wy);
        if (s < -20 || s > HEIGHT + 20) continue;
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(HALL_LEFT - 2, s, 4, 4);
        ctx.fillRect(HALL_RIGHT - 2, s, 4, 4);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.10)';
        ctx.beginPath(); ctx.arc(HALL_LEFT, s + 2, 20, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(HALL_RIGHT, s + 2, 20, 0, Math.PI * 2); ctx.fill();
    }
}

function drawDoor(door, index) {
    if (door.side === 'end') {
        drawEndDoor(door, index);
        return;
    }

    const doorScreenY = sy(door.y);
    if (doorScreenY < -DOOR_H - 40 || doorScreenY > HEIGHT + 40) return;

    const dsY = doorScreenY;

    // Door is entirely inside the wall (flush, on the OTHER side)
    // We see it face-on, recessed into the wall
    let dx;
    if (door.side === 'left') {
        dx = HALL_LEFT - DOOR_W - 4; // fully inside left wall
    } else {
        dx = HALL_RIGHT + 4; // fully inside right wall
    }

    // Dark recess behind the door
    ctx.fillStyle = '#0f0a1a';
    ctx.fillRect(dx - 2, dsY - 2, DOOR_W + 4, DOOR_H + 4);

    // Door frame
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(dx - 3, dsY - 3, DOOR_W + 6, DOOR_H + 6);

    // Door body
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(dx, dsY, DOOR_W, DOOR_H);

    // Panels
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(dx + 4, dsY + 4, DOOR_W - 8, 22);
    ctx.fillRect(dx + 4, dsY + 30, DOOR_W - 8, 26);

    // Doorknob (on the side closest to hallway)
    ctx.fillStyle = COLORS.doorKnob;
    if (door.side === 'left') {
        ctx.fillRect(dx + DOOR_W - 10, dsY + DOOR_H / 2, 4, 4);
    } else {
        ctx.fillRect(dx + 6, dsY + DOOR_H / 2, 4, 4);
    }

    // Sign on door
    drawSignOnDoor(dx, dsY, DOOR_W, door);

    // Highlight when near
    if (nearDoor === index) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx - 4, dsY - 4, DOOR_W + 8, DOOR_H + 8);
        const bob = Math.sin(Date.now() * 0.005) * 3;
        ctx.fillStyle = '#ffcc00';
        const ax = dx + DOOR_W / 2;
        const ay = dsY - 14 + bob;
        ctx.beginPath();
        ctx.moveTo(ax, ay + 8);
        ctx.lineTo(ax - 5, ay);
        ctx.lineTo(ax + 5, ay);
        ctx.fill();
    }
}

function drawSignOnDoor(doorX, doorY, doorW, door) {
    // Room number above sign
    if (door.number) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(door.number, doorX + doorW / 2, doorY + 6);
    }

    const signW = 34;
    const signH = 20;
    const signX = doorX + (doorW - signW) / 2;
    const signY = doorY + 8;

    ctx.fillStyle = COLORS.sign;
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = COLORS.signBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signX, signY, signW, signH);
    // Pin
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(signX + signW / 2, signY + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Text lines
    ctx.fillStyle = door.color;
    ctx.fillRect(signX + 4, signY + 7, signW - 8, 3);
    ctx.fillRect(signX + 4, signY + 12, signW - 12, 3);
    ctx.fillRect(signX + 4, signY + 16, signW - 14, 2);
}

function drawEndDoor(door, index) {
    // End door on north wall. Corpse lying horizontal below door.
    // Head on the LEFT, feet on the RIGHT (behind door).
    const edw = 56;
    const edh = 66;
    const edx = WIDTH / 2 - edw / 2;
    const edy = sy(-10);

    if (edy > HEIGHT + 20 || edy + edh < -40) return;

    // Frame
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(edx - 4, edy - 4, edw + 8, edh + 8);

    // Room number above door
    if (door.number) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(door.number, edx + edw / 2, edy - 8);
    }

    // Open doorway (dark)
    ctx.fillStyle = '#030305';
    ctx.fillRect(edx, edy, edw, edh);

    // CORPSE horizontal - head LEFT, feet RIGHT (behind door)
    const bodyY = edy + edh + 4;

    // Door covers the right side (no legs visible)
    const doorCoverX = edx + 20;
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(doorCoverX, edy, edw - 20, edh);
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(doorCoverX + 4, edy + 5, edw - 28, 26);
    ctx.fillRect(doorCoverX + 4, edy + 36, edw - 28, 26);
    ctx.fillStyle = COLORS.doorKnob;
    ctx.fillRect(doorCoverX + 4, edy + edh / 2, 3, 3);
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(doorCoverX - 2, edy, 3, edh);

    // Belt / waist at door edge
    ctx.fillStyle = '#222';
    ctx.fillRect(edx + 12, bodyY + 2, 14, 16);
    ctx.fillStyle = '#888';
    ctx.fillRect(edx + 18, bodyY + 7, 3, 4);

    // Torso (red t-shirt)
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(edx - 12, bodyY + 0, 28, 20);
    ctx.fillStyle = '#aa2222';
    ctx.fillRect(edx - 12, bodyY + 10, 28, 2);

    // Arm splayed below body
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx - 2, bodyY + 18, 6, 10);

    // Neck
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx - 20, bodyY + 5, 10, 10);

    // Head (on its side)
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(edx - 36, bodyY + 2, 18, 16);

    // Blood pool under head
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(edx - 38, bodyY + 16, 30, 4);
    ctx.fillStyle = '#660000';
    ctx.fillRect(edx - 32, bodyY + 19, 20, 3);

    if (nearDoor === index) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(edx - 42, edy - 6, edw + 52, edh + 34);
        const bob = Math.sin(Date.now() * 0.005) * 3;
        ctx.fillStyle = '#ffcc00';
        const ax = edx + edw / 2;
        const ay = edy - 14 + bob;
        ctx.beginPath();
        ctx.moveTo(ax, ay + 8);
        ctx.lineTo(ax - 5, ay);
        ctx.lineTo(ax + 5, ay);
        ctx.fill();
    }
}

function drawDeadBodyScene() {
    // Close-up: corpse sideways - head/arms out left, legs covered by door on right
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    // Floor
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let x = 0; x < WIDTH; x += 28) {
        for (let y = 0; y < HEIGHT; y += 28) {
            ctx.fillStyle = COLORS.carpetPattern;
            ctx.fillRect(x + 4, y + 4, 10, 10);
        }
    }

    // Wall at top
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, 0, WIDTH, 80);
    ctx.fillStyle = COLORS.wallTrim;
    ctx.fillRect(0, 76, WIDTH, 4);

    // Door frame in the wall
    const doorX = cx - 60;
    const doorY = 10;
    const doorW = 120;
    const doorH = 70;

    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(doorX - 6, doorY - 4, doorW + 12, doorH + 8);
    // Open doorway (dark room behind)
    ctx.fillStyle = '#020204';
    ctx.fillRect(doorX, doorY, doorW, doorH);

    // CORPSE - lying sideways/horizontal on the floor
    // Head and arms to the LEFT, legs go to the RIGHT behind the door
    const bodyY = doorY + doorH + 10;

    // Legs (rightmost, will be covered by door)
    ctx.fillStyle = COLORS.jeans;
    ctx.fillRect(cx + 20, bodyY + 4, 50, 16); // thigh
    ctx.fillRect(cx + 68, bodyY + 6, 40, 14); // shin
    // Second leg
    ctx.fillRect(cx + 20, bodyY + 22, 50, 14);
    ctx.fillRect(cx + 68, bodyY + 24, 40, 12);
    // Knee details
    ctx.fillStyle = COLORS.jeansDark;
    ctx.fillRect(cx + 46, bodyY + 4, 6, 16);
    ctx.fillRect(cx + 46, bodyY + 22, 6, 14);
    // Shoes
    ctx.fillStyle = COLORS.shoe;
    ctx.fillRect(cx + 106, bodyY + 6, 14, 12);
    ctx.fillRect(cx + 106, bodyY + 24, 14, 11);

    // DOOR covers the legs (right half, drawn on top)
    const doorCoverX = cx + 10;
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(doorCoverX, doorY, doorW - (doorCoverX - doorX), doorH);
    // Panels
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(doorCoverX + 6, doorY + 6, 40, 26);
    ctx.fillRect(doorCoverX + 6, doorY + 38, 40, 26);
    // Doorknob
    ctx.fillStyle = COLORS.doorKnob;
    ctx.fillRect(doorCoverX + 6, doorY + doorH / 2, 5, 5);
    // Edge shadow
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(doorCoverX - 3, doorY, 4, doorH);

    // Belt / waist (at the door edge)
    ctx.fillStyle = '#222';
    ctx.fillRect(cx + 4, bodyY + 6, 20, 28);
    ctx.fillStyle = '#888';
    ctx.fillRect(cx + 12, bodyY + 14, 4, 6);

    // Torso (red t-shirt, visible)
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(cx - 40, bodyY + 2, 48, 36);
    ctx.fillStyle = '#aa2222';
    ctx.fillRect(cx - 40, bodyY + 18, 48, 3);
    ctx.fillRect(cx - 20, bodyY + 4, 3, 32);

    // Neck
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(cx - 50, bodyY + 10, 14, 18);

    // Head (on its side, face visible)
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(cx - 78, bodyY + 4, 30, 24);
    // Face
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(cx - 82, bodyY + 10, 10, 14);
    // Eye (closed, X)
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - 80, bodyY + 14, 4, 2);
    ctx.fillRect(cx - 79, bodyY + 13, 2, 4);

    // Arms splayed
    ctx.fillStyle = COLORS.skin;
    // Upper arm
    ctx.fillRect(cx - 50, bodyY - 10, 8, 14);
    // Lower arm/hand reaching forward
    ctx.fillRect(cx - 60, bodyY - 14, 14, 8);
    // Other arm below body
    ctx.fillRect(cx - 36, bodyY + 36, 8, 16);
    ctx.fillRect(cx - 42, bodyY + 48, 12, 8);

    // Blood pool under head/torso
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(cx - 84, bodyY + 22, 60, 10);
    ctx.fillStyle = '#660000';
    ctx.fillRect(cx - 74, bodyY + 30, 40, 8);
    ctx.fillStyle = '#4b0000';
    ctx.fillRect(cx - 64, bodyY + 36, 24, 5);
}

function drawPlayer() {
    const px = Math.floor(player.x);
    const pyScreen = sy(Math.floor(player.y));
    const w = player.width;
    const h = player.height;
    const moving = isMoving() && gameState === 'playing' || gameState === 'chase';
    const bounce = Math.sin(player.animTimer * 0.15) * (moving ? 1.5 : 0);
    const legSwing = moving ? Math.sin(player.animTimer * 0.22) * 3 : 0;
    const armSwing = moving ? Math.sin(player.animTimer * 0.18) * 2 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + w / 2, pyScreen + h, w / 2 + 1, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const char = selectedChar || CHARACTERS[0];
    const f = player.facing;
    if (f === 'up') drawCharBack(px, pyScreen, bounce, legSwing, armSwing, char);
    else if (f === 'down') drawCharFront(px, pyScreen, bounce, legSwing, armSwing, char);
    else if (f === 'left') drawCharSide(px, pyScreen, bounce, legSwing, armSwing, -1, char);
    else drawCharSide(px, pyScreen, bounce, legSwing, armSwing, 1, char);
}

// Character-aware drawing functions for gameplay
function drawCharBack(px, py, bounce, legSwing, armSwing, char) {
    if (char.type === 'bear') { drawBearBack(px, py, bounce, legSwing, armSwing, char); return; }
    if (char.type === 'twink') { drawTwinkBack(px, py, bounce, legSwing, armSwing, char); return; }
    if (char.type === 'daddy') { drawDaddyBack(px, py, bounce, legSwing, armSwing, char); return; }
    if (char.type === 'woman') { drawWomanBack(px, py, bounce, legSwing, armSwing, char); return; }
    drawDefaultBack(px, py, bounce, legSwing, armSwing, char);
}
function drawCharFront(px, py, bounce, legSwing, armSwing, char) {
    if (char.type === 'bear') { drawBearFront(px, py, bounce, legSwing, armSwing, char); return; }
    if (char.type === 'twink') { drawTwinkFront(px, py, bounce, legSwing, armSwing, char); return; }
    if (char.type === 'daddy') { drawDaddyFront(px, py, bounce, legSwing, armSwing, char); return; }
    if (char.type === 'woman') { drawWomanFront(px, py, bounce, legSwing, armSwing, char); return; }
    drawDefaultFront(px, py, bounce, legSwing, armSwing, char);
}
function drawCharSide(px, py, bounce, legSwing, armSwing, dir, char) {
    if (char.type === 'bear') { drawBearSide(px, py, bounce, legSwing, armSwing, dir, char); return; }
    if (char.type === 'twink') { drawTwinkSide(px, py, bounce, legSwing, armSwing, dir, char); return; }
    if (char.type === 'daddy') { drawDaddySide(px, py, bounce, legSwing, armSwing, dir, char); return; }
    if (char.type === 'woman') { drawWomanSide(px, py, bounce, legSwing, armSwing, dir, char); return; }
    drawDefaultSide(px, py, bounce, legSwing, armSwing, dir, char);
}

// Default character (same as original, but with configurable speedo and hair color)
function drawDefaultBack(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    const hairColor = char.type === 'redhead' ? '#cc3300' : COLORS.hair;
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 22 + b, 14, 6);
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 4, py + 20 + b, 16, 3);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 10, py + 22 + b, 4, 6);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 24 + b, 1, 3);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 16 + b, 16, 5);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 7, py + 18 + b, 2, 1);
    ctx.fillRect(px + 15, py + 18 + b, 2, 1);

    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 3, py + 7 + b, 18, 10);
    ctx.fillStyle = COLORS.croptopShade;
    ctx.fillRect(px + 3, py + 15 + b, 18, 2);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 8 + b + armSwing, 3, 12);
    ctx.fillRect(px + 20, py + 8 + b - armSwing, 3, 12);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py - 2 + b, 12, 10);
    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 5, py - 6 + b, 14, 6);
    ctx.fillRect(px + 6, py - 8 + b, 12, 3);
    ctx.fillRect(px + 4, py - 4 + b, 3, 5);
    ctx.fillRect(px + 17, py - 4 + b, 3, 5);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 9, py + 6 + b, 6, 3);
}

function drawDefaultFront(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    const hairColor = char.type === 'redhead' ? '#cc3300' : COLORS.hair;
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 5, py + 21 + b, 14, 7);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 5, py + 21 + b, 14, 2);
    ctx.fillRect(px + 4, py + 20 + b, 4, 2);
    ctx.fillRect(px + 16, py + 20 + b, 4, 2);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 16 + b, 16, 6);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 10, py + 17 + b, 1, 3);
    ctx.fillRect(px + 13, py + 17 + b, 1, 3);

    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 3, py + 7 + b, 18, 10);
    ctx.fillStyle = COLORS.croptopShade;
    ctx.fillRect(px + 7, py + 7 + b, 10, 2);
    ctx.fillStyle = '#00ddff';
    ctx.fillRect(px + 3, py + 15 + b, 18, 2);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 8 + b - armSwing, 3, 12);
    ctx.fillRect(px + 20, py + 8 + b + armSwing, 3, 12);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py - 2 + b, 12, 10);
    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 5, py - 6 + b, 14, 6);
    ctx.fillRect(px + 6, py - 8 + b, 12, 3);
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 7, py + b, 4, 3);
    ctx.fillRect(px + 13, py + b, 4, 3);
    ctx.fillRect(px + 11, py + 1 + b, 2, 2);
    ctx.fillStyle = '#446';
    ctx.fillRect(px + 8, py + 1 + b, 2, 1);
    ctx.fillRect(px + 14, py + 1 + b, 2, 1);
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 9, py + 5 + b, 6, 2);
}

function drawDefaultSide(px, py, bounce, legSwing, armSwing, dir, char) {
    const b = bounce;
    const hairColor = char.type === 'redhead' ? '#cc3300' : COLORS.hair;
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 26 + b, 5, 10 + legSwing);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 26 + b, 5, 10 - legSwing);

    ctx.fillStyle = COLORS.skin;
    const buttX = dir === 1 ? px + 4 : px + 14;
    ctx.fillRect(buttX, py + 21 + b, 7, 7);
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 6, py + 21 + b, 12, 6);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 6, py + 21 + b, 12, 2);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 16 + b, 12, 6);

    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 5, py + 7 + b, 14, 10);
    ctx.fillStyle = COLORS.croptopShade;
    ctx.fillRect(px + 5, py + 15 + b, 14, 2);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 8 + b + armSwing, 3, 12);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py - 2 + b, 10, 10);
    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 6, py - 6 + b, 12, 6);
    ctx.fillRect(px + 7, py - 8 + b, 10, 3);
    ctx.fillStyle = '#111';
    const glassX = dir === 1 ? px + 13 : px + 7;
    ctx.fillRect(glassX, py + b, 5, 3);
    ctx.fillStyle = '#446';
    ctx.fillRect(glassX + 1, py + 1 + b, 2, 1);
    ctx.fillStyle = COLORS.skin;
    const noseX = dir === 1 ? px + 17 : px + 5;
    ctx.fillRect(noseX, py + 2 + b, 2, 3);
}

// Bear - taller, fat, body hair
function drawBearBack(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    // Offset up since bear is taller
    const oy = -10;
    // Thick legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py + 26 + b + oy, 8, 12 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b + oy, 8, 12 - legSwing);
    // Leg hair
    ctx.fillStyle = 'rgba(60,40,20,0.5)';
    for (let i = 0; i < 5; i++) { ctx.fillRect(px + 4 + i * 2, py + 28 + b + oy + i * 2, 1, 2); }
    for (let i = 0; i < 5; i++) { ctx.fillRect(px + 14 + i * 2, py + 28 + b + oy + i * 2, 1, 2); }

    // Big butt/speedo
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 2, py + 20 + b + oy, 20, 8);
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 1, py + 18 + b + oy, 22, 4);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 8, py + 20 + b + oy, 8, 8);

    // Big belly/torso (no crop top - just skin + body hair)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 4 + b + oy, 22, 16);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 3, py + 14 + b + oy, 18, 4);
    // Body hair
    ctx.fillStyle = 'rgba(60,40,20,0.6)';
    for (let i = 0; i < 8; i++) {
        ctx.fillRect(px + 3 + i * 2, py + 6 + b + oy + (i % 3), 1, 2);
        ctx.fillRect(px + 4 + i * 2, py + 10 + b + oy + (i % 2), 1, 2);
    }

    // Thick arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px - 2, py + 5 + b + oy + armSwing, 5, 14);
    ctx.fillRect(px + 21, py + 5 + b + oy - armSwing, 5, 14);
    // Arm hair
    ctx.fillStyle = 'rgba(60,40,20,0.5)';
    ctx.fillRect(px - 1, py + 8 + b + oy, 1, 2);
    ctx.fillRect(px + 23, py + 8 + b + oy, 1, 2);

    // Head (bigger)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py - 6 + b + oy, 16, 12);
    // Short hair / buzz cut
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 3, py - 10 + b + oy, 18, 6);
    ctx.fillRect(px + 4, py - 12 + b + oy, 16, 3);
    // Beard shadow on back of neck
    ctx.fillStyle = 'rgba(60,40,20,0.4)';
    ctx.fillRect(px + 6, py + 4 + b + oy, 12, 3);
}

function drawBearFront(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    const oy = -10;
    // Thick legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py + 26 + b + oy, 8, 12 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b + oy, 8, 12 - legSwing);
    ctx.fillStyle = 'rgba(60,40,20,0.5)';
    for (let i = 0; i < 5; i++) { ctx.fillRect(px + 4 + i * 2, py + 28 + b + oy + i * 2, 1, 2); }
    for (let i = 0; i < 5; i++) { ctx.fillRect(px + 14 + i * 2, py + 28 + b + oy + i * 2, 1, 2); }

    // Big speedo
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 2, py + 19 + b + oy, 20, 9);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 2, py + 19 + b + oy, 20, 2);

    // Big belly
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 4 + b + oy, 22, 16);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 4, py + 14 + b + oy, 16, 3);
    // Belly button
    ctx.fillRect(px + 11, py + 12 + b + oy, 2, 2);
    // Chest hair
    ctx.fillStyle = 'rgba(60,40,20,0.6)';
    for (let i = 0; i < 8; i++) {
        ctx.fillRect(px + 4 + i * 2, py + 5 + b + oy + (i % 3), 1, 2);
        ctx.fillRect(px + 3 + i * 2, py + 9 + b + oy + (i % 2), 1, 2);
    }
    // Nipples
    ctx.fillStyle = '#c08060';
    ctx.fillRect(px + 5, py + 7 + b + oy, 2, 2);
    ctx.fillRect(px + 17, py + 7 + b + oy, 2, 2);

    // Thick arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px - 2, py + 5 + b + oy - armSwing, 5, 14);
    ctx.fillRect(px + 21, py + 5 + b + oy + armSwing, 5, 14);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py - 6 + b + oy, 16, 12);
    // Buzz cut
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 3, py - 10 + b + oy, 18, 6);
    ctx.fillRect(px + 4, py - 12 + b + oy, 16, 3);
    // Beard
    ctx.fillStyle = 'rgba(60,40,20,0.7)';
    ctx.fillRect(px + 5, py + 2 + b + oy, 14, 5);
    ctx.fillRect(px + 6, py + 5 + b + oy, 12, 3);
    // Eyes
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 7, py - 3 + b + oy, 3, 3);
    ctx.fillRect(px + 14, py - 3 + b + oy, 3, 3);
    // Smile
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 9, py + 3 + b + oy, 6, 2);
}

function drawBearSide(px, py, bounce, legSwing, armSwing, dir, char) {
    const b = bounce;
    const oy = -10;
    // Thick legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 26 + b + oy, 7, 12 + legSwing);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 10, py + 26 + b + oy, 7, 12 - legSwing);
    // Leg hair
    ctx.fillStyle = 'rgba(60,40,20,0.5)';
    for (let i = 0; i < 4; i++) { ctx.fillRect(px + 6 + i * 2, py + 30 + b + oy + i * 2, 1, 2); }

    // Big speedo
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 3, py + 19 + b + oy, 18, 8);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 3, py + 19 + b + oy, 18, 2);
    // Belly extends past speedo
    ctx.fillStyle = COLORS.skin;
    const bellyX = dir === 1 ? px + 14 : px - 2;
    ctx.fillRect(bellyX, py + 10 + b + oy, 10, 12);

    // Torso
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py + 4 + b + oy, 18, 16);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 5, py + 14 + b + oy, 14, 3);
    // Body hair
    ctx.fillStyle = 'rgba(60,40,20,0.6)';
    for (let i = 0; i < 5; i++) { ctx.fillRect(px + 5 + i * 3, py + 6 + b + oy + (i % 2), 1, 2); }

    // Thick arm
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py + 5 + b + oy + armSwing, 5, 14);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py - 6 + b + oy, 14, 12);
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 4, py - 10 + b + oy, 16, 6);
    ctx.fillRect(px + 5, py - 12 + b + oy, 14, 3);
    // Beard
    ctx.fillStyle = 'rgba(60,40,20,0.7)';
    const beardX = dir === 1 ? px + 14 : px + 2;
    ctx.fillRect(beardX, py - 2 + b + oy, 6, 8);
    // Eye
    ctx.fillStyle = '#111';
    const eyeX = dir === 1 ? px + 14 : px + 7;
    ctx.fillRect(eyeX, py - 4 + b + oy, 3, 3);
    // Nose
    ctx.fillStyle = COLORS.skin;
    const noseX = dir === 1 ? px + 18 : px + 3;
    ctx.fillRect(noseX, py - 2 + b + oy, 3, 4);
}

// Daddy - big, burly, board shorts, gray hair, harness
function drawDaddyBack(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    const oy = -10;
    // Thick legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py + 30 + b + oy, 8, 8 + legSwing);
    ctx.fillRect(px + 13, py + 30 + b + oy, 8, 8 - legSwing);
    // Board shorts (long, past knees)
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 2, py + 18 + b + oy, 9, 14);
    ctx.fillRect(px + 13, py + 18 + b + oy, 9, 14);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 2, py + 18 + b + oy, 20, 3);
    // Shorts stripe
    ctx.fillStyle = '#667788';
    ctx.fillRect(px + 3, py + 26 + b + oy, 7, 2);
    ctx.fillRect(px + 14, py + 26 + b + oy, 7, 2);

    // Big torso (no shirt)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 4 + b + oy, 22, 16);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 3, py + 14 + b + oy, 18, 3);
    // Harness straps (back X pattern)
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 4, py + 4 + b + oy, 3, 14);
    ctx.fillRect(px + 17, py + 4 + b + oy, 3, 14);
    ctx.fillRect(px + 10, py + 10 + b + oy, 4, 3);
    // Metal ring (center back)
    ctx.fillStyle = '#ccc';
    ctx.fillRect(px + 10, py + 10 + b + oy, 4, 3);
    ctx.fillStyle = '#888';
    ctx.fillRect(px + 11, py + 11 + b + oy, 2, 1);

    // Thick arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px - 2, py + 5 + b + oy + armSwing, 5, 14);
    ctx.fillRect(px + 21, py + 5 + b + oy - armSwing, 5, 14);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py - 6 + b + oy, 16, 12);
    // Gray short hair
    ctx.fillStyle = '#999';
    ctx.fillRect(px + 3, py - 10 + b + oy, 18, 6);
    ctx.fillRect(px + 4, py - 12 + b + oy, 16, 3);
    // Gray stubble on neck
    ctx.fillStyle = 'rgba(150,150,150,0.4)';
    ctx.fillRect(px + 6, py + 4 + b + oy, 12, 3);
}

function drawDaddyFront(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    const oy = -10;
    // Thick legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py + 30 + b + oy, 8, 8 + legSwing);
    ctx.fillRect(px + 13, py + 30 + b + oy, 8, 8 - legSwing);
    // Board shorts
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 2, py + 18 + b + oy, 9, 14);
    ctx.fillRect(px + 13, py + 18 + b + oy, 9, 14);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 2, py + 18 + b + oy, 20, 3);
    // Shorts stripe
    ctx.fillStyle = '#667788';
    ctx.fillRect(px + 3, py + 26 + b + oy, 7, 2);
    ctx.fillRect(px + 14, py + 26 + b + oy, 7, 2);

    // Big torso (no shirt, harness visible)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 4 + b + oy, 22, 16);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 4, py + 14 + b + oy, 16, 3);
    // Pecs
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 4, py + 6 + b + oy, 7, 4);
    ctx.fillRect(px + 13, py + 6 + b + oy, 7, 4);
    // Nipples
    ctx.fillStyle = '#c08060';
    ctx.fillRect(px + 6, py + 8 + b + oy, 2, 2);
    ctx.fillRect(px + 16, py + 8 + b + oy, 2, 2);
    // Harness straps (front)
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 3, py + 4 + b + oy, 3, 14);
    ctx.fillRect(px + 18, py + 4 + b + oy, 3, 14);
    // Horizontal strap across chest
    ctx.fillRect(px + 3, py + 9 + b + oy, 18, 2);
    // Metal O-ring center
    ctx.fillStyle = '#ccc';
    ctx.fillRect(px + 10, py + 8 + b + oy, 4, 4);
    ctx.fillStyle = '#888';
    ctx.fillRect(px + 11, py + 9 + b + oy, 2, 2);

    // Thick arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px - 2, py + 5 + b + oy - armSwing, 5, 14);
    ctx.fillRect(px + 21, py + 5 + b + oy + armSwing, 5, 14);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py - 6 + b + oy, 16, 12);
    // Gray short hair
    ctx.fillStyle = '#999';
    ctx.fillRect(px + 3, py - 10 + b + oy, 18, 6);
    ctx.fillRect(px + 4, py - 12 + b + oy, 16, 3);
    // Gray stubble/beard
    ctx.fillStyle = 'rgba(150,150,150,0.6)';
    ctx.fillRect(px + 5, py + 2 + b + oy, 14, 5);
    ctx.fillRect(px + 6, py + 5 + b + oy, 12, 2);
    // Eyes
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 7, py - 3 + b + oy, 3, 3);
    ctx.fillRect(px + 14, py - 3 + b + oy, 3, 3);
    // Confident smirk
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 10, py + 3 + b + oy, 5, 2);
}

function drawDaddySide(px, py, bounce, legSwing, armSwing, dir, char) {
    const b = bounce;
    const oy = -10;
    // Thick legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 30 + b + oy, 7, 8 + legSwing);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 10, py + 30 + b + oy, 7, 8 - legSwing);
    // Board shorts
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 3, py + 18 + b + oy, 18, 14);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 3, py + 18 + b + oy, 18, 3);
    ctx.fillStyle = '#667788';
    ctx.fillRect(px + 4, py + 26 + b + oy, 16, 2);

    // Big torso
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py + 4 + b + oy, 18, 16);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 5, py + 14 + b + oy, 14, 3);
    // Harness strap (side view - vertical + horizontal)
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 8, py + 4 + b + oy, 3, 14);
    ctx.fillRect(px + 3, py + 9 + b + oy, 18, 2);
    // Metal ring
    ctx.fillStyle = '#ccc';
    const ringX = dir === 1 ? px + 15 : px + 4;
    ctx.fillRect(ringX, py + 8 + b + oy, 3, 3);

    // Thick arm
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py + 5 + b + oy + armSwing, 5, 14);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py - 6 + b + oy, 14, 12);
    // Gray hair
    ctx.fillStyle = '#999';
    ctx.fillRect(px + 4, py - 10 + b + oy, 16, 6);
    ctx.fillRect(px + 5, py - 12 + b + oy, 14, 3);
    // Beard
    ctx.fillStyle = 'rgba(150,150,150,0.6)';
    const beardX = dir === 1 ? px + 14 : px + 2;
    ctx.fillRect(beardX, py - 2 + b + oy, 6, 8);
    // Eye
    ctx.fillStyle = '#111';
    const eyeX = dir === 1 ? px + 14 : px + 7;
    ctx.fillRect(eyeX, py - 4 + b + oy, 3, 3);
    // Nose
    ctx.fillStyle = COLORS.skin;
    const noseX = dir === 1 ? px + 18 : px + 3;
    ctx.fillRect(noseX, py - 2 + b + oy, 3, 4);
}

// Twink - skinny, young, no muscles
function drawTwinkBack(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    // Thin legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 26 + b, 4, 10 + legSwing);
    ctx.fillRect(px + 14, py + 26 + b, 4, 10 - legSwing);

    // Narrow hips/speedo
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py + 22 + b, 10, 5);
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 6, py + 20 + b, 12, 3);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 10, py + 22 + b, 4, 5);

    // Skinny torso (no crop top, tank top instead)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 14 + b, 12, 7);
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 5, py + 5 + b, 14, 10);
    ctx.fillStyle = '#eee';
    ctx.fillRect(px + 5, py + 13 + b, 14, 2);

    // Thin arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py + 6 + b + armSwing, 3, 11);
    ctx.fillRect(px + 18, py + 6 + b - armSwing, 3, 11);

    // Head (youthful, floppy hair)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py - 2 + b, 10, 9);
    ctx.fillStyle = '#f5d442';
    ctx.fillRect(px + 6, py - 7 + b, 12, 7);
    ctx.fillRect(px + 5, py - 9 + b, 14, 4);
    ctx.fillRect(px + 7, py - 10 + b, 10, 3);
    // Floppy bangs
    ctx.fillRect(px + 4, py - 5 + b, 4, 6);
}

function drawTwinkFront(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    // Thin legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 26 + b, 4, 10 + legSwing);
    ctx.fillRect(px + 14, py + 26 + b, 4, 10 - legSwing);

    // Narrow speedo
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 7, py + 21 + b, 10, 6);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 7, py + 21 + b, 10, 2);

    // Skinny torso / tank top
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 14 + b, 12, 7);
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 5, py + 5 + b, 14, 10);
    ctx.fillStyle = '#eee';
    ctx.fillRect(px + 8, py + 5 + b, 8, 2);

    // Thin arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py + 6 + b - armSwing, 3, 11);
    ctx.fillRect(px + 18, py + 6 + b + armSwing, 3, 11);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py - 2 + b, 10, 9);
    ctx.fillStyle = '#f5d442';
    ctx.fillRect(px + 6, py - 7 + b, 12, 7);
    ctx.fillRect(px + 5, py - 9 + b, 14, 4);
    ctx.fillRect(px + 7, py - 10 + b, 10, 3);
    // Bangs over forehead
    ctx.fillRect(px + 5, py - 5 + b, 6, 4);
    // Big eyes (youthful)
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 8, py + b, 3, 3);
    ctx.fillRect(px + 14, py + b, 3, 3);
    ctx.fillStyle = '#5588ff';
    ctx.fillRect(px + 9, py + 1 + b, 1, 1);
    ctx.fillRect(px + 15, py + 1 + b, 1, 1);
    // Small smile
    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(px + 10, py + 5 + b, 4, 1);
}

function drawTwinkSide(px, py, bounce, legSwing, armSwing, dir, char) {
    const b = bounce;
    // Thin legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 9, py + 26 + b, 3, 10 + legSwing);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 26 + b, 3, 10 - legSwing);

    // Narrow speedo
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 7, py + 21 + b, 10, 6);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 7, py + 21 + b, 10, 2);

    // Skinny torso
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py + 14 + b, 10, 7);
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 6, py + 5 + b, 12, 10);
    ctx.fillStyle = '#eee';
    ctx.fillRect(px + 6, py + 13 + b, 12, 2);

    // Thin arm
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 9, py + 6 + b + armSwing, 3, 11);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py - 2 + b, 8, 9);
    ctx.fillStyle = '#f5d442';
    ctx.fillRect(px + 7, py - 7 + b, 10, 7);
    ctx.fillRect(px + 8, py - 9 + b, 8, 3);
    // Floppy hair
    const flopX = dir === 1 ? px + 14 : px + 4;
    ctx.fillRect(flopX, py - 6 + b, 5, 6);
    // Eye
    ctx.fillStyle = '#111';
    const eyeX = dir === 1 ? px + 13 : px + 8;
    ctx.fillRect(eyeX, py + b, 3, 3);
    // Nose
    ctx.fillStyle = COLORS.skin;
    const noseX = dir === 1 ? px + 16 : px + 6;
    ctx.fillRect(noseX, py + 2 + b, 2, 2);
}

// Woman in bikini
function drawWomanBack(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    // Legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    // Bikini bottom
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 22 + b, 14, 5);
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 5, py + 20 + b, 14, 3);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 9, py + 22 + b, 6, 5);

    // Waist (narrower)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 16 + b, 12, 5);

    // Bikini top (back straps)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 7 + b, 16, 10);
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 4, py + 9 + b, 16, 2);
    ctx.fillRect(px + 10, py + 7 + b, 4, 5);

    // Arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 2, py + 8 + b + armSwing, 3, 11);
    ctx.fillRect(px + 19, py + 8 + b - armSwing, 3, 11);

    // Head (long hair)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py - 2 + b, 10, 10);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(px + 5, py - 7 + b, 14, 8);
    ctx.fillRect(px + 6, py - 9 + b, 12, 4);
    // Long hair flowing down back
    ctx.fillRect(px + 4, py - 3 + b, 4, 14);
    ctx.fillRect(px + 16, py - 3 + b, 4, 14);
    ctx.fillRect(px + 6, py + 5 + b, 12, 6);
}

function drawWomanFront(px, py, bounce, legSwing, armSwing, char) {
    const b = bounce;
    // Legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    // Bikini bottom
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 5, py + 21 + b, 14, 6);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 5, py + 21 + b, 14, 2);

    // Waist
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 16 + b, 12, 5);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 17 + b, 2, 2);

    // Bikini top
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 7 + b, 16, 10);
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 4, py + 8 + b, 7, 6);
    ctx.fillRect(px + 13, py + 8 + b, 7, 6);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 4, py + 8 + b, 7, 2);
    ctx.fillRect(px + 13, py + 8 + b, 7, 2);
    // String between
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 10, py + 9 + b, 4, 1);

    // Arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 8 + b - armSwing, 3, 11);
    ctx.fillRect(px + 20, py + 8 + b + armSwing, 3, 11);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py - 2 + b, 10, 10);
    // Long hair
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(px + 5, py - 7 + b, 14, 8);
    ctx.fillRect(px + 6, py - 9 + b, 12, 4);
    ctx.fillRect(px + 4, py - 3 + b, 4, 12);
    ctx.fillRect(px + 16, py - 3 + b, 4, 12);
    // Face
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 8, py + b, 3, 2);
    ctx.fillRect(px + 13, py + b, 3, 2);
    // Eyelashes
    ctx.fillRect(px + 8, py - 1 + b, 4, 1);
    ctx.fillRect(px + 13, py - 1 + b, 4, 1);
    // Lips
    ctx.fillStyle = '#cc3366';
    ctx.fillRect(px + 10, py + 5 + b, 4, 2);
}

function drawWomanSide(px, py, bounce, legSwing, armSwing, dir, char) {
    const b = bounce;
    // Legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 26 + b, 4, 10 + legSwing);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 26 + b, 4, 10 - legSwing);

    // Bikini bottom
    ctx.fillStyle = char.speedoColor;
    ctx.fillRect(px + 6, py + 21 + b, 12, 6);
    ctx.fillStyle = char.speedoShade;
    ctx.fillRect(px + 6, py + 21 + b, 12, 2);

    // Waist
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py + 16 + b, 10, 5);

    // Torso with bikini top
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 7 + b, 14, 10);
    // Bikini top from side (bust)
    ctx.fillStyle = char.speedoColor;
    const bustX = dir === 1 ? px + 14 : px + 3;
    ctx.fillRect(bustX, py + 8 + b, 6, 5);

    // Arm
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 8 + b + armSwing, 3, 11);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py - 2 + b, 10, 10);
    // Long hair
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(px + 6, py - 7 + b, 12, 8);
    ctx.fillRect(px + 7, py - 9 + b, 10, 3);
    // Hair flowing down
    const hairBackX = dir === 1 ? px + 4 : px + 14;
    ctx.fillRect(hairBackX, py - 3 + b, 5, 14);
    // Eye
    ctx.fillStyle = '#111';
    const eyeX = dir === 1 ? px + 13 : px + 8;
    ctx.fillRect(eyeX, py + b, 3, 2);
    // Eyelash
    ctx.fillRect(eyeX, py - 1 + b, 4, 1);
    // Lips
    ctx.fillStyle = '#cc3366';
    const lipX = dir === 1 ? px + 16 : px + 6;
    ctx.fillRect(lipX, py + 3 + b, 3, 2);
}

// --- MURDERER ---
function drawMurderer(x, y) {
    // All-black figure with knife
    ctx.fillStyle = '#111';
    // Legs
    ctx.fillRect(x + 6, y + 26, 5, 10);
    ctx.fillRect(x + 13, y + 26, 5, 10);
    // Body
    ctx.fillRect(x + 4, y + 8, 16, 20);
    // Arms
    ctx.fillRect(x + 1, y + 10, 4, 12);
    ctx.fillRect(x + 19, y + 10, 4, 12);
    // Head
    ctx.fillRect(x + 6, y - 4, 12, 12);
    // Knife in right hand
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 21, y + 6, 2, 10);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x + 20, y - 2, 4, 8);
}

function drawMurdererScreen(screenX, screenY) {
    drawMurderer(screenX, screenY);
}

// --- ROOM 405 (Level 1.2) ---
// Room is small - just enough to walk around the bed
const ROOM_W = 480;
const ROOM_H = 320;

// Collision rects for room objects (player cannot walk over these)
// Bed fills most of the room width, narrow corridors on each side
const ROOM_COLLIDERS = [
    { x: 130, y: 50, w: 220, h: 110 },  // bed (wide, forces side corridors)
    { x: 86, y: 50, w: 44, h: 60 },     // left table
    { x: 350, y: 50, w: 44, h: 60 },    // right table
];
const BATH_COLLIDERS = [
    { x: 280, y: 90, w: 56, h: 50 },    // shower
    { x: 290, y: 156, w: 30, h: 34 },   // toilet
];
const BALCONY_COLLIDERS = [
    { x: 222, y: 154, w: 28, h: 26 },   // book
];

const ROOM_ITEMS = [
    { id: 'drawer-right', x: 350, y: 50, w: 44, h: 60 },
    { id: 'drawer-left', x: 86, y: 50, w: 44, h: 60 },
];
const BATHROOM_ITEMS = [
    { id: 'mirror', x: 220, y: 58, w: 30, h: 40 },
];
const BALCONY_ITEMS = [
    { id: 'book', x: 222, y: 154, w: 28, h: 26 },
    { id: 'balcony-exit', x: 394, y: 120, w: 36, h: 60 },
];

function collidesWithAny(px, py, pw, ph, colliders) {
    for (const c of colliders) {
        if (px < c.x + c.w && px + pw > c.x && py < c.y + c.h && py + ph > c.y) return true;
    }
    return false;
}

let firstEntryRoom405 = true;

function enterRoom405() {
    gameState = 'room';
    roomState = 'room';
    // Appear right in front of entry door (bottom wall)
    roomPlayerX = ROOM_W / 2 - 12;
    roomPlayerY = 180;
    roomPlayerFacing = 'up';
    if (firstEntryRoom405) {
        doorPoundDelay = 120;
        firstEntryRoom405 = false;
    }
    doorPoundTimer = 0;
    doorPoundCount = 0;
    doorPoundPause = false;
    promptEl.classList.remove('visible');
    nearDoor = null;
}

function examineRoomItem() {
    const item = roomNearItem;
    if (!item) return;
    promptEl.classList.remove('visible');
    if (item === 'drawer-right') {
        gameState = 'room-dialog';
        dialogBox.innerHTML = '<span style="color:#ffcc00;">You open the drawer...</span><br><br>This just has poppers, not useful here.<br><br><span style="color:#aaa">Press any key to close</span>';
        dialogBox.classList.add('visible');
    } else if (item === 'drawer-left') {
        gameState = 'room-dialog';
        dialogBox.innerHTML = '<span style="color:#ffcc00;">You open the drawer...</span><br><br>This must be his douche— this could be useful... JK, now is NOT the time!<br><br><span style="color:#aaa">Press any key to close</span>';
        dialogBox.classList.add('visible');
    } else if (item === 'bathroom-door' || item === 'balcony-door') {
        return;
    } else if (item === 'mirror') {
        gameState = 'room-dialog';
        dialogBox.innerHTML = '<span style="color:#ffcc00;">You look in the mirror...</span><br><br>I can reflect on my body dysmorphia later.<br><br><span style="color:#aaa">Press any key to close</span>';
        dialogBox.classList.add('visible');
    } else if (item === 'bath-exit') {
        return;
    } else if (item === 'book') {
        gameState = 'book-closeup';
        promptEl.classList.remove('visible');
    } else if (item === 'balcony-exit') {
        return;
    }
}

function openBook() {
    gameState = 'book-open';
    fadeWhiteAlpha = 0;
    GameMusic.stopMusic();
    GameMusic.playWhoosh();
}

function playDoorPound() {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 0.15);
}

function drawRoom() {
    // Floor
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    for (let x = 0; x < ROOM_W; x += 24) {
        for (let y = 0; y < ROOM_H; y += 24) {
            ctx.fillStyle = '#321e44';
            ctx.fillRect(x + 2, y + 2, 10, 10);
        }
    }

    // Walls on all four sides (tight around bed)
    // Top wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, 0, ROOM_W, 50);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(0, 46, ROOM_W, 4);
    // Bottom wall (close to bed)
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, 220, ROOM_W, 100);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(0, 220, ROOM_W, 4);
    // Left wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, 0, 80, ROOM_H);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(76, 0, 4, ROOM_H);
    // Right wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(400, 0, 80, ROOM_H);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(400, 0, 4, ROOM_H);

    // Entry door in bottom wall (vertical/tall, locked, shaking)
    const doorShake = (!doorPoundPause && doorPoundCount > 0) ? Math.sin(doorPoundTimer * 0.8) * 2 : 0;
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(ROOM_W / 2 - 20, 220, 40, 50);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(ROOM_W / 2 - 17 + doorShake, 224, 34, 42);
    // Door panels
    ctx.fillStyle = '#6d3a0a';
    ctx.fillRect(ROOM_W / 2 - 13 + doorShake, 228, 26, 16);
    ctx.fillRect(ROOM_W / 2 - 13 + doorShake, 248, 26, 14);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(ROOM_W / 2 + 10 + doorShake, 242, 4, 4);

    // Balcony sliding glass door in LEFT WALL
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(60, 120, 20, 70);
    ctx.fillStyle = '#4488bb';
    ctx.fillRect(62, 124, 16, 30);
    ctx.fillRect(62, 158, 16, 28);
    ctx.fillStyle = '#0a2a4a';
    ctx.fillRect(66, 140, 10, 22);

    // Bathroom door in RIGHT WALL
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(400, 130, 24, 60);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(404, 134, 18, 52);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(406, 158, 4, 4);

    // Bed (wide, fills most of room)
    ctx.fillStyle = '#4a3a6a';
    ctx.fillRect(130, 50, 220, 110);
    ctx.fillStyle = '#5a4a7a';
    ctx.fillRect(134, 54, 212, 40);
    // Pillows
    ctx.fillStyle = '#ddd';
    ctx.fillRect(145, 56, 50, 24);
    ctx.fillRect(285, 56, 50, 24);
    // Blanket fold
    ctx.fillStyle = '#3a2a5a';
    ctx.fillRect(134, 100, 212, 4);

    // Bedside table LEFT (3D prism with visible top and drawer)
    // Top surface (lighter, shows depth)
    ctx.fillStyle = '#7a5020';
    ctx.fillRect(86, 50, 44, 12);
    // Front face
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(86, 62, 44, 48);
    // Drawer
    ctx.fillStyle = '#4a2a0a';
    ctx.fillRect(90, 70, 36, 18);
    ctx.fillStyle = '#3a1a00';
    ctx.fillRect(90, 70, 36, 2);
    ctx.fillRect(90, 86, 36, 2);
    // Drawer knob
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(106, 77, 4, 4);
    // Clock on top
    ctx.fillStyle = '#222';
    ctx.fillRect(100, 52, 14, 8);
    ctx.fillStyle = '#111';
    ctx.fillRect(102, 53, 10, 6);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(104, 55, 3, 1);
    ctx.fillRect(106, 54, 1, 3);

    // Bedside table RIGHT (3D prism with visible top and drawer)
    // Top surface
    ctx.fillStyle = '#7a5020';
    ctx.fillRect(350, 50, 44, 12);
    // Front face
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(350, 62, 44, 48);
    // Drawer
    ctx.fillStyle = '#4a2a0a';
    ctx.fillRect(354, 70, 36, 18);
    ctx.fillStyle = '#3a1a00';
    ctx.fillRect(354, 70, 36, 2);
    ctx.fillRect(354, 86, 36, 2);
    // Drawer knob
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(370, 77, 4, 4);

    // Player
    drawRoomPlayer();

    // Proximity prompt
    if (roomNearItem && gameState === 'room') {
        promptEl.classList.add('visible');
        promptEl.textContent = isMobile() ? 'Tap LOOK to examine' : 'Press E or SPACE to examine';
    } else if (gameState === 'room') {
        promptEl.classList.remove('visible');
    }
}

function drawBathroom() {
    // Tiny bathroom - door on LEFT wall (entered from right wall of bedroom)
    // Tile floor
    ctx.fillStyle = '#e8e8e0';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    for (let x = 0; x < ROOM_W; x += 14) {
        for (let y = 0; y < ROOM_H; y += 14) {
            ctx.fillStyle = '#d0d0c8';
            ctx.fillRect(x, y, 1, 14);
            ctx.fillRect(x, y, 14, 1);
        }
    }

    // Walls on all sides (extremely tight)
    ctx.fillStyle = '#e0e0d8';
    ctx.fillRect(0, 0, ROOM_W, 90);     // top
    ctx.fillRect(0, 0, 180, ROOM_H);    // left
    ctx.fillRect(340, 0, 140, ROOM_H);  // right
    ctx.fillRect(0, 210, ROOM_W, 110);  // bottom
    // Trim
    ctx.fillStyle = '#bbb';
    ctx.fillRect(180, 86, 160, 4);
    ctx.fillRect(176, 90, 4, 120);
    ctx.fillRect(340, 90, 4, 120);
    ctx.fillRect(180, 210, 160, 4);

    // Door on LEFT wall (where we entered)
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(176, 120, 24, 56);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(180, 124, 18, 48);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(192, 146, 4, 4);

    // Shower (top right corner)
    ctx.fillStyle = '#aaa';
    ctx.fillRect(280, 90, 56, 50);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(283, 93, 50, 44);
    ctx.fillStyle = '#888';
    ctx.fillRect(305, 90, 4, 6);

    // Sink with mirror (top wall, center-left)
    ctx.fillStyle = '#aaa';
    ctx.fillRect(220, 90, 30, 10);
    ctx.fillStyle = '#aaccee';
    ctx.fillRect(222, 58, 26, 30);
    ctx.fillStyle = '#fff';
    ctx.fillRect(226, 62, 8, 5);

    // Toilet (bottom right)
    ctx.fillStyle = '#fff';
    ctx.fillRect(290, 160, 26, 28);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(293, 156, 20, 8);
    ctx.fillRect(296, 172, 14, 14);

    drawRoomPlayer();

    if (roomNearItem && gameState === 'room') {
        promptEl.classList.add('visible');
        promptEl.textContent = isMobile() ? 'Tap LOOK to examine' : 'Press E or SPACE to examine';
    } else if (gameState === 'room') {
        promptEl.classList.remove('visible');
    }
}

function drawBalcony() {
    // Tiny balcony: water surrounds all railings, silver ship wall on right with portholes

    // Ocean everywhere (background)
    ctx.fillStyle = '#0a2a4a';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.fillStyle = '#1a4a7a';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    for (let y = 0; y < ROOM_H; y += 16) {
        const wave = Math.sin((Date.now() * 0.001) + y * 0.08) * 3;
        ctx.fillStyle = '#2a5a8c';
        ctx.fillRect(10 + wave, y, 60, 3);
        ctx.fillRect(80 + wave * 0.5, y + 8, 40, 2);
        ctx.fillRect(420 + wave * 0.3, y + 4, 30, 2);
    }
    // Waves in top/bottom ocean areas
    for (let x = 140; x < 390; x += 22) {
        const wave = Math.sin((Date.now() * 0.0008) + x * 0.1) * 2;
        ctx.fillStyle = '#2a5a8c';
        ctx.fillRect(x, 30 + wave, 14, 2);
        ctx.fillRect(x + 5, 55 + wave, 10, 2);
        ctx.fillRect(x, 260 + wave, 14, 2);
        ctx.fillRect(x + 5, 285 + wave, 10, 2);
    }

    // Balcony deck floor (within railings only)
    ctx.fillStyle = '#5c4a2a';
    ctx.fillRect(146, 76, 244, 168);
    for (let y = 76; y < 244; y += 18) {
        ctx.fillStyle = '#4a3a1a';
        ctx.fillRect(146, y, 244, 2);
    }

    // Left railing (over water)
    ctx.fillStyle = '#888';
    ctx.fillRect(140, 70, 6, 180);
    for (let y = 80; y < 250; y += 18) {
        ctx.fillStyle = '#666';
        ctx.fillRect(138, y, 10, 3);
    }

    // Upper railing (over water)
    ctx.fillStyle = '#888';
    ctx.fillRect(140, 70, 250, 6);
    for (let x = 150; x < 390; x += 18) {
        ctx.fillStyle = '#666';
        ctx.fillRect(x, 68, 3, 10);
    }

    // Lower railing (over water)
    ctx.fillStyle = '#888';
    ctx.fillRect(140, 244, 250, 6);
    for (let x = 150; x < 390; x += 18) {
        ctx.fillStyle = '#666';
        ctx.fillRect(x, 242, 3, 10);
    }

    // Ship wall (right side - silver/metal)
    ctx.fillStyle = '#8a8a90';
    ctx.fillRect(390, 0, 90, ROOM_H);
    ctx.fillStyle = '#6a6a70';
    ctx.fillRect(390, 0, 4, ROOM_H);
    // Rivets/seam
    ctx.fillStyle = '#9a9aa0';
    ctx.fillRect(394, 0, 2, ROOM_H);

    // Portholes on ship wall (above and below railings)
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(430, 45, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a3a5c';
    ctx.beginPath(); ctx.arc(430, 45, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a5a8c';
    ctx.beginPath(); ctx.arc(430, 45, 7, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(430, 275, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a3a5c';
    ctx.beginPath(); ctx.arc(430, 275, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a5a8c';
    ctx.beginPath(); ctx.arc(430, 275, 7, 0, Math.PI * 2); ctx.fill();

    // Door back inside (in silver ship wall)
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(394, 120, 36, 60);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(398, 124, 28, 52);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(400, 148, 4, 4);

    // Purple book with eye (smaller)
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(226, 178, 22, 3);
    // Pages edge
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(224, 155, 2, 24);
    // Spine
    ctx.fillStyle = '#4a0a6a';
    ctx.fillRect(222, 154, 4, 26);
    // Cover
    ctx.fillStyle = '#6a2a8a';
    ctx.fillRect(226, 154, 22, 26);
    ctx.fillStyle = '#8a3aaa';
    ctx.fillRect(228, 156, 18, 22);
    // Border
    ctx.fillStyle = '#5a1a7a';
    ctx.fillRect(228, 156, 18, 2);
    ctx.fillRect(228, 176, 18, 2);
    ctx.fillRect(228, 156, 2, 22);
    ctx.fillRect(244, 156, 2, 22);
    // Eye on cover
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(237, 167, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a0a6a';
    ctx.beginPath();
    ctx.arc(237, 167, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(237, 167, 1.5, 0, Math.PI * 2);
    ctx.fill();

    drawRoomPlayer();

    if (roomNearItem && gameState === 'room') {
        promptEl.classList.add('visible');
        promptEl.textContent = isMobile() ? 'Tap LOOK to examine' : 'Press E or SPACE to examine';
    } else if (gameState === 'room') {
        promptEl.classList.remove('visible');
    }
}

function drawBookCloseup() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);

    // Large purple book
    ctx.fillStyle = '#5a1a7a';
    ctx.fillRect(140, 40, 200, 240);
    ctx.fillStyle = '#7a2a9a';
    ctx.fillRect(145, 45, 190, 230);
    // Spine
    ctx.fillStyle = '#4a0a6a';
    ctx.fillRect(140, 40, 8, 240);

    // Giant eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(240, 150, 50, 35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a1a9a';
    ctx.beginPath();
    ctx.arc(240, 150, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(240, 150, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(234, 140, 4, 4);

    // Open prompt
    ctx.fillStyle = '#ffcc00';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isMobile() ? 'Tap LOOK to open' : 'Press E or SPACE to open', ROOM_W / 2, ROOM_H - 30);
    ctx.textAlign = 'left';
}

function drawBookOpen() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);

    // Open book pages
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(120, 50, 120, 220);
    ctx.fillRect(240, 50, 120, 220);
    // Spine crease
    ctx.fillStyle = '#c0b090';
    ctx.fillRect(238, 50, 4, 220);
    // Mysterious symbols
    ctx.fillStyle = '#6a2a8a';
    for (let i = 0; i < 8; i++) {
        ctx.fillRect(140 + (i % 4) * 22, 80 + Math.floor(i / 4) * 60, 12, 12);
    }

    // Fade to white
    ctx.fillStyle = `rgba(255, 255, 255, ${fadeWhiteAlpha})`;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
}

function drawRoomPlayer() {
    const px = Math.floor(roomPlayerX);
    const py = Math.floor(roomPlayerY);
    const char = selectedChar || CHARACTERS[0];
    const moving = isMoving() && gameState === 'room';
    const bounce = Math.sin(player.animTimer * 0.15) * (moving ? 1.5 : 0);
    const legSwing = moving ? Math.sin(player.animTimer * 0.22) * 3 : 0;
    const armSwing = moving ? Math.sin(player.animTimer * 0.18) * 2 : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + 12, py + 36, 13, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (roomPlayerFacing === 'up') drawCharBack(px, py, bounce, legSwing, armSwing, char);
    else if (roomPlayerFacing === 'down') drawCharFront(px, py, bounce, legSwing, armSwing, char);
    else if (roomPlayerFacing === 'left') drawCharSide(px, py, bounce, legSwing, armSwing, -1, char);
    else drawCharSide(px, py, bounce, legSwing, armSwing, 1, char);
}

function isMoving() {
    return keys['arrowleft'] || keys['arrowright'] || keys['arrowup'] || keys['arrowdown'] ||
           keys['a'] || keys['d'] || keys['w'] || keys['s'];
}

// Character selection screen drawing
function drawCharSelectScreen() {
    // Ocean / deck background
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Deck planks
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, HEIGHT - 100, WIDTH, 100);
    ctx.fillStyle = '#7a5c10';
    for (let x = 0; x < WIDTH; x += 40) {
        ctx.fillRect(x, HEIGHT - 100, 2, 100);
    }
    ctx.fillStyle = '#6b4e0e';
    ctx.fillRect(0, HEIGHT - 102, WIDTH, 3);
    // Ocean waves
    ctx.fillStyle = '#2a5a8c';
    for (let x = 0; x < WIDTH; x += 30) {
        const wave = Math.sin((Date.now() * 0.001) + x * 0.1) * 4;
        ctx.fillRect(x, 60 + wave, 20, 4);
        ctx.fillRect(x + 10, 90 + wave * 0.7, 18, 3);
    }
    // Railing
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, HEIGHT - 108, WIDTH, 3);
    for (let x = 20; x < WIDTH; x += 50) {
        ctx.fillRect(x, HEIGHT - 120, 3, 20);
    }

    if (charSelectState === 'captain-intro') {
        drawCaptain(WIDTH / 2 - 20, HEIGHT / 2 - 50);
        drawDialogBubble("Ahoy there, f*g! Welcome to\nthe S.S. Madonna! What kind\nof gay are you?", WIDTH / 2, 30);
        // Prompt
        ctx.fillStyle = '#ffcc00';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press any key...', WIDTH / 2, HEIGHT - 15);
    } else if (charSelectState === 'selecting') {
        drawCharSelectPreview();
    } else if (charSelectState === 'captain-outro') {
        drawCaptain(WIDTH / 2 - 20, HEIGHT / 2 - 50);
        const char = CHARACTERS[selectedCharIndex];
        const displayName = char.type === 'redhead' ? 'Gay' : char.name;
        drawDialogBubble("Great to meet ya, " + displayName + "!\nWelcome aboard!", WIDTH / 2, 40);
        ctx.fillStyle = '#ffcc00';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press any key...', WIDTH / 2, HEIGHT - 15);
    } else if (charSelectState === 'fade-out') {
        // Draw last frame then fade
        drawCaptain(WIDTH / 2 - 20, HEIGHT / 2 - 50);
        const char = CHARACTERS[selectedCharIndex];
        const displayName = char.type === 'redhead' ? 'Gay' : char.name;
        drawDialogBubble("Great to meet ya, " + displayName + "!\nWelcome aboard!", WIDTH / 2, 40);
        // White fade overlay
        ctx.fillStyle = `rgba(255, 255, 255, ${fadeAlpha})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
}

function drawDialogBubble(text, cx, y) {
    const lines = text.split('\n');
    const lineH = 14;
    const padX = 12;
    const padY = 8;
    let maxW = 0;
    ctx.font = '11px monospace';
    for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxW) maxW = w;
    }
    const boxW = maxW + padX * 2;
    const boxH = lines.length * lineH + padY * 2;
    const boxX = cx - boxW / 2;
    const boxY = y;

    ctx.fillStyle = 'rgba(0, 0, 20, 0.92)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], boxX + padX, boxY + padY + 10 + i * lineH);
    }
}

function drawCharSelectPreview() {
    const char = CHARACTERS[selectedCharIndex];
    const slide = charSlideOffset;

    // Character preview - draw big (3x scale)
    const previewX = WIDTH / 2 - 36 + slide;
    const previewY = HEIGHT / 2 - 80;
    ctx.save();
    ctx.translate(previewX, previewY);
    ctx.scale(3, 3);
    drawCharSelectChar(0, 0, char);
    ctx.restore();

    // Name below with black backdrop (slides with character)
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    const nameW = ctx.measureText(char.name).width;
    const nameCx = WIDTH / 2 + slide;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(nameCx - nameW / 2 - 10, HEIGHT / 2 + 38, nameW + 20, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(char.name, nameCx, HEIGHT / 2 + 54);

    // Arrows
    const arrowY = HEIGHT / 2 - 30;
    ctx.fillStyle = '#ffcc00';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('<', WIDTH / 2 - 100, arrowY);
    ctx.fillText('>', WIDTH / 2 + 100, arrowY);

    // Counter
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.fillText((selectedCharIndex + 1) + ' / ' + CHARACTERS.length, WIDTH / 2, HEIGHT / 2 + 68);

    // Instructions
    ctx.fillStyle = '#ffcc00';
    ctx.font = '10px monospace';
    ctx.fillText(isMobile() ? 'Tap arrows to browse, LOOK to select' : 'Arrow keys to browse, ENTER/SPACE to select', WIDTH / 2, HEIGHT - 15);
}

function drawCharSelectChar(x, y, char) {
    // Draw character facing front at the small pixel scale (will be scaled up by caller)
    if (char.type === 'bear') { drawBearFront(x, y, 0, 0, 0, char); return; }
    if (char.type === 'twink') { drawTwinkFront(x, y, 0, 0, 0, char); return; }
    if (char.type === 'daddy') { drawDaddyFront(x, y, 0, 0, 0, char); return; }
    if (char.type === 'woman') { drawWomanFront(x, y, 0, 0, 0, char); return; }
    drawDefaultFront(x, y, 0, 0, 0, char);
}

function drawCaptain(x, y) {
    // Captain: stocky older man with captain's hat, white uniform
    // Legs
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 8, y + 42, 7, 12);
    ctx.fillRect(x + 17, y + 42, 7, 12);
    // Black shoes
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 7, y + 52, 9, 4);
    ctx.fillRect(x + 16, y + 52, 9, 4);

    // White pants
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 6, y + 34, 20, 10);

    // Belt
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 6, y + 32, 20, 3);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 14, y + 32, 4, 3);

    // White jacket
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 4, y + 14, 24, 20);
    // Jacket details - buttons
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 15, y + 16, 2, 2);
    ctx.fillRect(x + 15, y + 20, 2, 2);
    ctx.fillRect(x + 15, y + 24, 2, 2);
    // Shoulder epaulets
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 3, y + 14, 5, 3);
    ctx.fillRect(x + 24, y + 14, 5, 3);
    // Collar
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 10, y + 12, 12, 4);

    // Arms
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 1, y + 16, 5, 16);
    ctx.fillRect(x + 26, y + 16, 5, 16);
    // Hands
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(x + 1, y + 30, 5, 5);
    ctx.fillRect(x + 26, y + 30, 5, 5);

    // Neck
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(x + 12, y + 8, 8, 6);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(x + 8, y - 4, 16, 14);
    // Gray beard
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 9, y + 6, 14, 5);
    ctx.fillRect(x + 10, y + 9, 12, 3);
    // Eyes
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 11, y, 3, 3);
    ctx.fillRect(x + 18, y, 3, 3);
    // Bushy eyebrows
    ctx.fillStyle = '#666';
    ctx.fillRect(x + 10, y - 2, 5, 2);
    ctx.fillRect(x + 17, y - 2, 5, 2);
    // Nose
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(x + 14, y + 2, 4, 4);

    // Captain's hat
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(x + 6, y - 10, 20, 8);
    ctx.fillRect(x + 4, y - 4, 24, 3);
    // Hat brim
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 3, y - 4, 26, 2);
    // Gold emblem on hat
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 13, y - 9, 6, 4);
    // Anchor detail
    ctx.fillStyle = '#ffee00';
    ctx.fillRect(x + 15, y - 8, 2, 3);
    ctx.fillRect(x + 14, y - 6, 4, 1);
}

function update() {
    if (gameState === 'charselect') {
        if (charSlideOffset !== 0) {
            charSlideOffset *= 0.75;
            if (Math.abs(charSlideOffset) < 1) charSlideOffset = 0;
        }
        if (charSelectState === 'fade-out') {
            fadeAlpha += 0.02;
            if (fadeAlpha >= 1) {
                fadeAlpha = 0;
                startLevel1();
            }
        }
        return;
    }

    if (gameState === 'cutscene') {
        cutsceneTimer++;
        if (cutsceneState === 'murderer-appears' && cutsceneTimer > 60) {
            cutsceneState = 'exclamation';
            cutsceneTimer = 0;
        } else if (cutsceneState === 'exclamation' && cutsceneTimer > 60) {
            cutsceneState = 'step1';
            cutsceneTimer = 0;
        } else if (cutsceneState === 'step1') {
            // Smooth steps: walk for 30 frames
            if (cutsceneTimer <= 30) {
                murdererY -= 0.8;
            } else if (cutsceneTimer > 70) {
                cutsceneState = 'step2';
                cutsceneTimer = 0;
            }
        } else if (cutsceneState === 'step2') {
            // More steps, then pause
            if (cutsceneTimer <= 30) {
                murdererY -= 0.8;
            } else if (cutsceneTimer > 80) {
                cutsceneState = 'final-pause';
                cutsceneTimer = 0;
            }
        } else if (cutsceneState === 'final-pause' && cutsceneTimer > 60) {
            gameState = 'chase';
            cutsceneState = null;
        }
        return;
    }

    if (gameState === 'chase') {
        // Murderer slowly approaches
        murdererY -= murdererSpeed;

        // Player can move
        let moved = false;
        let newX = player.x;
        let newY = player.y;
        if (keys['arrowleft'] || keys['a']) { newX -= player.speed; player.facing = 'left'; moved = true; }
        if (keys['arrowright'] || keys['d']) { newX += player.speed; player.facing = 'right'; moved = true; }
        if (keys['arrowup'] || keys['w']) { newY -= player.speed; player.facing = 'up'; moved = true; }
        if (keys['arrowdown'] || keys['s']) { newY += player.speed; player.facing = 'down'; moved = true; }

        if (newX < HALL_LEFT + 6) newX = HALL_LEFT + 6;
        if (newX > HALL_RIGHT - player.width - 6) newX = HALL_RIGHT - player.width - 6;
        if (newY < 30) newY = 30;
        if (newY > HALL_LENGTH - player.height - 10) newY = HALL_LENGTH - player.height - 10;

        player.x = newX;
        player.y = newY;
        if (moved) player.animTimer++;

        camera.y = player.y - HEIGHT / 2 + player.height / 2;
        if (camera.y < -40) camera.y = -40;
        if (camera.y > HALL_LENGTH - HEIGHT + 20) camera.y = HALL_LENGTH - HEIGHT + 20;

        // Check if player entered room 405 (end door)
        const pcx = player.x + player.width / 2;
        const pcy = player.y + player.height / 2;
        if (pcy < 60 && Math.abs(pcx - WIDTH / 2) < 40) {
            enterRoom405();
            return;
        }

        // Check if murderer catches player (too close or tried to walk past)
        if (player.y >= murdererY - 30) {
            playerDead = true;
            gameState = 'gameover';
            gameOverScreen.classList.add('visible');
        }
        return;
    }

    if (gameState === 'room') {
        // Door pounding with sound (delay before starting)
        if (doorPoundDelay > 0) {
            doorPoundDelay--;
        } else {
            doorPoundTimer++;
            if (!doorPoundPause) {
                if (doorPoundTimer % 30 === 0) {
                    doorPoundCount++;
                    if (musicEnabled && roomState === 'room') playDoorPound();
                    if (doorPoundCount >= 3) {
                        doorPoundPause = true;
                        doorPoundTimer = 0;
                        doorPoundCount = 0;
                    }
                }
            } else {
                if (doorPoundTimer > 90) {
                    doorPoundPause = false;
                    doorPoundTimer = 0;
                }
            }
        }

        // Player movement in room with collision
        let moved = false;
        let newX = roomPlayerX;
        let newY = roomPlayerY;
        if (keys['arrowleft'] || keys['a']) { newX -= 2.5; roomPlayerFacing = 'left'; moved = true; }
        if (keys['arrowright'] || keys['d']) { newX += 2.5; roomPlayerFacing = 'right'; moved = true; }
        if (keys['arrowup'] || keys['w']) { newY -= 2.5; roomPlayerFacing = 'up'; moved = true; }
        if (keys['arrowdown'] || keys['s']) { newY += 2.5; roomPlayerFacing = 'down'; moved = true; }

        // Room-specific bounds and colliders
        let minX, maxX, minY, maxY, colliders;
        if (roomState === 'bathroom') {
            minX = 200; maxX = 310; minY = 95; maxY = 180;
            colliders = BATH_COLLIDERS;
        } else if (roomState === 'balcony') {
            minX = 160; maxX = 370; minY = 100; maxY = 210;
            colliders = BALCONY_COLLIDERS;
        } else {
            minX = 82; maxX = 376; minY = 100; maxY = 185;
            colliders = ROOM_COLLIDERS;
        }

        if (newX < minX) newX = minX;
        if (newX > maxX) newX = maxX;
        if (newY < minY) newY = minY;
        if (newY > maxY) newY = maxY;

        // Collision with objects
        const pw = 24, ph = 36;
        if (!collidesWithAny(newX, newY, pw, ph, colliders)) {
            roomPlayerX = newX;
            roomPlayerY = newY;
        } else {
            if (!collidesWithAny(newX, roomPlayerY, pw, ph, colliders)) {
                roomPlayerX = newX;
            } else if (!collidesWithAny(roomPlayerX, newY, pw, ph, colliders)) {
                roomPlayerY = newY;
            }
        }
        if (moved) player.animTimer++;

        // Walk-through door transitions - trigger at wall edge, spawn tight to door
        if (roomState === 'room') {
            // Bathroom door in right wall (door drawn at x=400, y=130-190)
            if (roomPlayerX >= maxX && roomPlayerY > 130 && roomPlayerY < 190) {
                roomState = 'bathroom';
                roomPlayerX = 210;
                roomPlayerY = 145;
                roomPlayerFacing = 'right';
                roomNearItem = null;
                return;
            }
            // Balcony door in left wall (door drawn at x=60, y=120-190)
            if (roomPlayerX <= minX && roomPlayerY > 120 && roomPlayerY < 190) {
                roomState = 'balcony';
                roomPlayerX = 355;
                roomPlayerY = 148;
                roomPlayerFacing = 'left';
                roomNearItem = null;
                return;
            }
        } else if (roomState === 'bathroom') {
            // Exit through left wall door (door at x=176, y=120-176)
            if (roomPlayerX <= minX && roomPlayerY > 115 && roomPlayerY < 175) {
                roomState = 'room';
                roomPlayerX = 360;
                roomPlayerY = 160;
                roomPlayerFacing = 'left';
                roomNearItem = null;
                return;
            }
        } else if (roomState === 'balcony') {
            // Exit through right wall door (door at x=394, y=120-180)
            if (roomPlayerX >= maxX && roomPlayerY > 110 && roomPlayerY < 180) {
                roomState = 'room';
                roomPlayerX = 95;
                roomPlayerY = 155;
                roomPlayerFacing = 'right';
                roomNearItem = null;
                return;
            }
        }

        // Proximity check for room items (exclude door items since we walk through now)
        roomNearItem = null;
        const rpx = roomPlayerX + 12;
        const rpy = roomPlayerY + 18;
        const items = roomState === 'bathroom' ? BATHROOM_ITEMS : roomState === 'balcony' ? BALCONY_ITEMS : ROOM_ITEMS;
        for (const item of items) {
            if (item.id === 'bathroom-door' || item.id === 'balcony-door' || item.id === 'bath-exit' || item.id === 'balcony-exit') continue;
            const icx = item.x + item.w / 2;
            const icy = item.y + item.h / 2;
            if (Math.abs(rpx - icx) < 50 && Math.abs(rpy - icy) < 50) {
                roomNearItem = item.id;
                break;
            }
        }
        return;
    }

    if (gameState === 'book-open') {
        fadeWhiteAlpha += 0.008;
        if (fadeWhiteAlpha >= 1) {
            fadeWhiteAlpha = 1;
            startLevel2();
        }
        return;
    }

    if (gameState === 'level2') {
        updateLevel2();
        return;
    }

    if (gameState !== 'playing') return;

    let moved = false;
    let newX = player.x;
    let newY = player.y;

    if (keys['arrowleft'] || keys['a']) { newX -= player.speed; player.facing = 'left'; moved = true; }
    if (keys['arrowright'] || keys['d']) { newX += player.speed; player.facing = 'right'; moved = true; }
    if (keys['arrowup'] || keys['w']) { newY -= player.speed; player.facing = 'up'; moved = true; }
    if (keys['arrowdown'] || keys['s']) { newY += player.speed; player.facing = 'down'; moved = true; }

    // Hallway bounds (doors are in the walls so no door collision needed)
    if (newX < HALL_LEFT + 6) newX = HALL_LEFT + 6;
    if (newX > HALL_RIGHT - player.width - 6) newX = HALL_RIGHT - player.width - 6;
    if (newY < 50) newY = 50;
    if (newY > HALL_LENGTH - player.height - 10) newY = HALL_LENGTH - player.height - 10;

    // End door / north wall collision
    const northWall = 30;
    if (newY < northWall) newY = northWall;

    player.x = newX;
    player.y = newY;

    if (moved) player.animTimer++;

    // Camera
    camera.y = player.y - HEIGHT / 2 + player.height / 2;
    if (camera.y < -40) camera.y = -40;
    if (camera.y > HALL_LENGTH - HEIGHT + 20) camera.y = HALL_LENGTH - HEIGHT + 20;

    // Proximity check - player needs to be near the wall where the door is
    nearDoor = null;
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;
    for (let i = 0; i < doors.length; i++) {
        const door = doors[i];
        let dcx, dcy;
        if (door.side === 'end') {
            dcx = WIDTH / 2;
            dcy = 30;
        } else if (door.side === 'left') {
            // Door is in the left wall; player approaches the left wall edge
            dcx = HALL_LEFT + 10;
            dcy = door.y + DOOR_H / 2;
        } else {
            // Door is in the right wall; player approaches the right wall edge
            dcx = HALL_RIGHT - 10;
            dcy = door.y + DOOR_H / 2;
        }
        const dist = Math.sqrt((dcx - pcx) ** 2 + (dcy - pcy) ** 2);
        if (dist < 50) { nearDoor = i; break; }
    }

    if (nearDoor !== null) {
        promptEl.classList.add('visible');
        promptEl.textContent = isMobile() ? 'Tap LOOK to examine' : 'Press E or SPACE to examine';
    } else {
        promptEl.classList.remove('visible');
    }
}

function isMobile() {
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
}

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    if (gameState === 'charselect') {
        drawCharSelectScreen();
        return;
    }

    if (gameState === 'gameover') {
        if (playerDead) {
            drawHallway();
            for (let i = 0; i < doors.length; i++) drawDoor(doors[i], i);
            drawPlayer();
            drawMurdererScreen(HALL_LEFT + HALL_WIDTH / 2 - 12, sy(murdererY));
            // Dark overlay
            ctx.fillStyle = 'rgba(139, 0, 0, 0.4)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
        } else {
            drawDeadBodyScene();
        }
        return;
    }

    if (gameState === 'cutscene') {
        drawHallway();
        for (let i = 0; i < doors.length; i++) drawDoor(doors[i], i);
        drawPlayer();
        // Murderer behind player
        drawMurdererScreen(HALL_LEFT + HALL_WIDTH / 2 - 12, sy(murdererY));
        // Exclamation point above player
        if (cutsceneState === 'exclamation') {
            const px = Math.floor(player.x);
            const psy = sy(Math.floor(player.y));
            // White background box
            ctx.fillStyle = '#fff';
            ctx.fillRect(px + 4, psy - 28, 16, 22);
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('!', px + 12, psy - 10);
            ctx.textAlign = 'left';
        }
        return;
    }

    if (gameState === 'chase') {
        drawHallway();
        for (let i = 0; i < doors.length; i++) drawDoor(doors[i], i);
        drawPlayer();
        drawMurdererScreen(HALL_LEFT + HALL_WIDTH / 2 - 12, sy(murdererY));
        // Ambient lighting
        const psy2 = sy(player.y);
        const gradient2 = ctx.createRadialGradient(player.x + 12, psy2 + 18, 20, player.x + 12, psy2 + 18, 180);
        gradient2.addColorStop(0, 'rgba(255, 200, 100, 0.03)');
        gradient2.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient2;
        ctx.fillRect(HALL_LEFT, 0, HALL_WIDTH, HEIGHT);
        return;
    }

    if (gameState === 'room' || gameState === 'room-dialog') {
        if (roomState === 'bathroom') drawBathroom();
        else if (roomState === 'balcony') drawBalcony();
        else drawRoom();
        return;
    }

    if (gameState === 'book-closeup') {
        drawBookCloseup();
        return;
    }

    if (gameState === 'book-open') {
        drawBookOpen();
        return;
    }

    if (gameState === 'level2' || gameState === 'level2-complete') {
        drawLevel2();
        return;
    }

    drawHallway();
    for (let i = 0; i < doors.length; i++) drawDoor(doors[i], i);
    drawPlayer();

    // Ambient lighting
    const psy = sy(player.y);
    const gradient = ctx.createRadialGradient(player.x + 12, psy + 18, 20, player.x + 12, psy + 18, 180);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(HALL_LEFT, 0, HALL_WIDTH, HEIGHT);
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 2 — The Hotel Room Mystery
// ═══════════════════════════════════════════════════════════════

// Level 2 state
let l2State = 'in-bed';  // 'in-bed', 'wakeup-text', 'exclamation', 'blake-intro', 'free', 'chat', 'notebook'
let l2Timer = 0;
let l2TextAlpha = 0;
let l2TextPhase = 'fadein'; // 'fadein', 'hold', 'fadeout'
let l2ExclTimer = 0;
let l2PlayerX = 0;
let l2PlayerY = 0;
let l2PlayerFacing = 'down';
let l2ChatOpen = false;
let l2TalkingTo = null;
let l2ChatMessages = { blake: [], abraham: [], vanessa: [] };
let l2SayingBye = false;
let l2ByeTimer = 0;
let l2Typewriting = null; // { full, current, charIndex }
let l2TypeTimer = 0;
let l2HasNotebook = false;
let l2DiscoveredClues = [];
let l2NearNpc = null;
let l2BlakeGaveNotebook = false;
let l2BlakeIntroSaid = false;
let l2BlakeTutorialDone = false;
let l2BlakeInTutorial = false;
let l2ShowTimeText = false;
let l2TimeTextAlpha = 0;
let l2TimeTextPhase = 'fadein';

let l2Solved = false;
let l2AccusationOpen = false;
let l2AccusationTarget = null;
let l2AccusationResult = null; // null, 'wrong-blake', 'wrong-abraham', 'found'
let l2ExitBlocked = false;
let l2ExitBlockTimer = 0;
let l2NearItem = null;

// Notebook state — rows are ITEMS, columns are PEOPLE
let l2Notebook = {
    open: false,
    // rows: Credit Card, Room Key, Vodka Shot; cols: Blake, Abraham, Vanessa
    grid: [['','',''], ['','',''], ['','','']],
    autoMarks: {},
};

const L2_SUSPECTS = ['Blake', 'Abraham', 'Vanessa'];
const L2_ITEMS = ['Credit Card', 'Room Key', 'Vodka Shot'];

// Examinable items
const L2_EXAMINE_ITEMS = [
    { id: 'credit-card', x: 50, y: 260, w: 44, h: 20, label: 'Credit Card' },
];

// Room is rotated 90° from room 405: bed runs top-to-bottom on the LEFT side
// Walls tight around everything
const L2_ROOM_W = 480;
const L2_ROOM_H = 320;

// Colliders: bed on left, NPCs in the right area
const L2_COLLIDERS = [
    { x: 50, y: 60, w: 110, h: 200 },   // bed (tall, on left side)
    { x: 50, y: 40, w: 44, h: 20 },      // top bedside table
    { x: 50, y: 260, w: 44, h: 20 },     // bottom bedside table
];

// NPC positions (in the open area right of the bed, facing each other)
const L2_NPCS = {
    blake: { x: 260, y: 100, facing: 'down', name: 'BLAKE', color: '#ff69b4' },
    abraham: { x: 320, y: 180, facing: 'left', name: 'ABRAHAM', color: '#44cc88' },
    vanessa: { x: 240, y: 200, facing: 'right', name: 'VANESSA', color: '#cc44ff' },
};

// Hardcoded dialog lines — each NPC has a sequence that plays through on each talk
const L2_DIALOG = {
    blake: [
        "Hey babe, you might want your notebook. I know you like using it when you solve mysteries.",
        "We each agreed to carry a separate item with us, but we were pretty — uh — under the influence when we came back so we can't remember who had what.",
        "The credit card and room key couldn't be carried together or they'd deactivate. And then we also had a vodka shot.",
        "So each of us carried one thing. Talk to the others — maybe they remember more than me!",
        "Want me to show you how to use the notebook?",
    ],
    blake_tutorial: [
        "It's a logic grid! Each row is an ITEM and each column is a PERSON.",
        "Tap a cell to cycle through marks: ✓ means YES they had it, ✗ means NO, and ? means MAYBE.",
        "When you place a ✓, the rest of that row and column auto-fill with ✗ — since each person had exactly one item.",
        "Use the clues we give you to figure out who had what. When you're ready, come accuse someone!",
    ],
    blake_after: [
        "Any luck? Talk to me when you're ready to accuse someone!",
    ],
    abraham: [
        "Ugh, hey. I'm having a ROUGH day.",
        "My chocolate lube exploded in my fanny pack. There's chocolate lube EVERYWHERE.",
        "And now we can't find the hotel key. And worse, I can't remember if I was the one who had it last. Last night is a blur.",
        "Sorry I can't be more help... I'm in crisis mode right now.",
    ],
    vanessa: [
        "Morning, sunshine! Yes, this is a DISASTER. We'll be locked out if we leave!",
        "Part and parcel, I suppose. Totally worth it. You should have stayed out later with us!",
        "I'll tell you right now — I did NOT carry the vodka. I don't drink alcohol anymore. I only do drugs now. I'm a good girl.",
        "A queen has her standards, darling.",
    ],
};

function startLevel2() {
    if (gameState === 'level2') return;
    gameState = 'level2';
    l2State = 'in-bed';
    l2Timer = 0;
    l2TextAlpha = 0;
    l2TextPhase = 'fadein';
    GameMusic.stopMusic();
    if (musicEnabled) GameMusic.startMusic('charselect');
}

function handleLevel2Action(key) {
    const k = key.toLowerCase();
    if (l2State === 'in-bed' && (k === 'e' || k === ' ' || k === 'examine')) {
        l2State = 'wakeup-text';
        l2Timer = 0;
        l2TextAlpha = 0;
        l2TextPhase = 'fadein';
        // Place player next to bed
        l2PlayerX = 180;
        l2PlayerY = 140;
        l2PlayerFacing = 'right';
        return;
    }
    if (l2State === 'wakeup-text') return; // auto-advances
    if (l2State === 'exclamation') return; // auto-advances
    if (l2State === 'blake-intro') {
        // Dismiss blake-intro text
        if (l2ShowTimeText) return; // wait for time text to finish
        closeLevel2Dialog();
        return;
    }
    if (l2State === 'chat') {
        if (k === 'escape') {
            closeLevel2Chat();
            return;
        }
        if (k === 'e' || k === ' ' || k === 'examine') {
            advanceLevel2Dialog();
            return;
        }
        return;
    }
    if (l2State === 'notebook') {
        if (k === 'escape' || k === 'c') {
            l2Notebook.open = false;
            l2State = 'free';
            document.getElementById('notebook-overlay').style.display = 'none';
            return;
        }
        return;
    }
    if (l2State === 'free') {
        if (k === 'c' && l2HasNotebook) {
            openNotebook();
            return;
        }
        if ((k === 'e' || k === ' ' || k === 'examine') && l2NearNpc) {
            openLevel2Chat(l2NearNpc);
            return;
        }
        if ((k === 'e' || k === ' ' || k === 'examine') && l2NearItem) {
            examineLevel2Item(l2NearItem);
            return;
        }
    }
    if (l2State === 'exit-blocked') {
        closeLevel2Dialog();
        return;
    }
    if (l2State === 'examine-dialog') {
        closeLevel2Dialog();
        return;
    }
}

let l2DialogIndex = { blake: 0, abraham: 0, vanessa: 0 };

function openLevel2Chat(npcKey) {
    l2State = 'chat';
    l2ChatOpen = true;
    l2TalkingTo = npcKey;
    l2SayingBye = false;

    const npc = L2_NPCS[npcKey];
    const panel = document.getElementById('chat-panel');
    panel.style.display = 'block';
    panel.style.borderColor = npc.color;
    document.getElementById('chat-portrait').style.borderColor = npc.color;
    document.getElementById('chat-portrait').style.boxShadow = `0 0 10px ${npc.color}66`;
    document.getElementById('chat-npc-name').style.color = npc.color;
    document.getElementById('chat-npc-name').textContent = `─── ${npc.name} ───`;
    document.getElementById('chat-next').textContent = 'NEXT';
    document.getElementById('chat-next').style.display = 'block';

    drawLevel2Portrait(npcKey);

    // Determine which line to show
    let lines;
    if (npcKey === 'blake' && l2BlakeInTutorial) {
        lines = L2_DIALOG.blake_tutorial;
    } else if (npcKey === 'blake' && l2BlakeGaveNotebook) {
        lines = L2_DIALOG.blake_after;
    } else {
        lines = L2_DIALOG[npcKey];
    }

    const idx = l2DialogIndex[npcKey];
    const line = lines[Math.min(idx, lines.length - 1)];
    startLevel2Typing(line);

    // Show the current line
    renderChatLine(npcKey, line);

    // First time talking to Blake — give notebook and clues after all lines
    if (npcKey === 'blake' && !l2BlakeGaveNotebook) {
        l2BlakeGaveNotebook = true;
        l2HasNotebook = true;
        document.getElementById('notebook-btn').style.display = 'flex';
        addL2Clue("The credit card and room key can't be carried together (deactivation).");
        addL2Clue("Each person carried exactly one item.");
    }
    if (npcKey === 'vanessa' && l2DialogIndex.vanessa === 0) {
        addL2Clue("Vanessa did NOT carry the vodka — she doesn't drink.");
    }

    updateAccusationButton();
}

function closeLevel2Chat() {
    l2ChatOpen = false;
    l2TalkingTo = null;
    l2SayingBye = false;
    l2BlakeInTutorial = false;
    l2State = 'free';
    l2Typewriting = null;
    document.getElementById('chat-panel').style.display = 'none';
}

function closeLevel2Dialog() {
    l2State = 'free';
    dialogBox.classList.remove('visible');
    l2ExitBlocked = false;
}

let l2CreditCardExamined = false;

function examineLevel2Item(itemId) {
    if (itemId === 'credit-card') {
        l2State = 'examine-dialog';
        promptEl.classList.remove('visible');
        if (!l2CreditCardExamined) {
            l2CreditCardExamined = true;
            dialogBox.innerHTML = '<span style="color:#ffcc00;">You discover a credit card on the bedside table.</span><br><br><button id="examine-cc-btn" style="background:rgba(232,208,112,0.15); border:2px solid #e8d070; border-radius:4px; color:#e8d070; font-family:monospace; font-size:12px; padding:8px 16px; cursor:pointer; pointer-events:auto;">Examine it</button>';
            dialogBox.classList.add('visible');
            setTimeout(() => {
                const btn = document.getElementById('examine-cc-btn');
                if (btn) btn.addEventListener('click', () => {
                    dialogBox.innerHTML = '<span style="color:#ffcc00;">You pick up the credit card...</span><br><br>It smells like chocolate. Ew.<br><br><span style="color:#aaa">Press any key to close</span>';
                    addL2Clue("The credit card on the bedside table smells like chocolate.");
                });
            }, 0);
        } else {
            dialogBox.innerHTML = '<span style="color:#ffcc00;">You pick up the credit card...</span><br><br>It smells like chocolate. Ew.<br><br><span style="color:#aaa">Press any key to close</span>';
            dialogBox.classList.add('visible');
            addL2Clue("The credit card on the bedside table smells like chocolate.");
        }
    }
}

function updateAccusationButton() {
    let btn = document.getElementById('chat-accuse');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'chat-accuse';
        btn.style.cssText = 'margin-top:6px; width:calc(100% - 16px); margin-left:8px; background:#cc3030; border:2px solid #ff4444; border-radius:4px; color:#fff; font-family:monospace; font-size:11px; padding:6px 8px; cursor:pointer; box-shadow:0 0 10px rgba(204,48,48,0.3);';
        btn.textContent = 'READY TO ACCUSE';
        btn.addEventListener('click', openAccusation);
        document.getElementById('chat-panel').appendChild(btn);
    }
    let tutBtn = document.getElementById('chat-tutorial');
    if (!tutBtn) {
        tutBtn = document.createElement('button');
        tutBtn.id = 'chat-tutorial';
        tutBtn.style.cssText = 'margin-top:6px; width:calc(100% - 16px); margin-left:8px; background:rgba(232,208,112,0.15); border:2px solid #e8d070; border-radius:4px; color:#e8d070; font-family:monospace; font-size:11px; padding:6px 8px; cursor:pointer;';
        tutBtn.textContent = 'NOTEBOOK TUTORIAL';
        tutBtn.addEventListener('click', startBlakeTutorial);
        document.getElementById('chat-panel').appendChild(tutBtn);
    }
    // Show accuse button only when talking to Blake AFTER his first dialog is complete
    const blakeFirstDone = l2DialogIndex.blake >= L2_DIALOG.blake.length;
    btn.style.display = (l2TalkingTo === 'blake' && blakeFirstDone && !l2SayingBye && !l2Solved && !l2AccusationOpen && !l2BlakeInTutorial) ? 'block' : 'none';
    tutBtn.style.display = (l2TalkingTo === 'blake' && blakeFirstDone && !l2SayingBye && !l2Solved && !l2AccusationOpen && !l2BlakeInTutorial) ? 'block' : 'none';
}

function startBlakeTutorial() {
    l2BlakeInTutorial = true;
    l2DialogIndex.blake = 0;
    const line = L2_DIALOG.blake_tutorial[0];
    startLevel2Typing(line);
    renderChatLine('blake', line);
    updateAccusationButton();
}

function openAccusation() {
    l2AccusationOpen = true;
    l2AccusationTarget = null;
    renderAccusation();
}

function renderAccusation() {
    const container = document.getElementById('chat-messages');
    let html = '<div class="msg-npc"><span style="color:#ff69b4">BLAKE:</span> Okay babe, who do you think had the room key?</div>';
    html += '<div style="margin-top:8px;">';
    html += '<button class="accuse-btn" data-target="blake" style="display:block; width:100%; margin-bottom:4px; padding:6px 8px; font-family:monospace; font-size:11px; cursor:pointer; background:#2a1020; border:1px solid #cc3030; border-radius:3px; color:#e8d070; text-align:left;">Blake (me)</button>';
    html += '<button class="accuse-btn" data-target="abraham" style="display:block; width:100%; margin-bottom:4px; padding:6px 8px; font-family:monospace; font-size:11px; cursor:pointer; background:#2a1020; border:1px solid #cc3030; border-radius:3px; color:#e8d070; text-align:left;">Abraham</button>';
    html += '<button class="accuse-btn" data-target="vanessa" style="display:block; width:100%; margin-bottom:4px; padding:6px 8px; font-family:monospace; font-size:11px; cursor:pointer; background:#2a1020; border:1px solid #cc3030; border-radius:3px; color:#e8d070; text-align:left;">Vanessa</button>';
    html += '</div>';
    container.innerHTML = html;

    document.getElementById('chat-next').style.display = 'none';
    const accuseBtn = document.getElementById('chat-accuse');
    if (accuseBtn) accuseBtn.style.display = 'none';

    container.querySelectorAll('.accuse-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAccusation(btn.dataset.target));
    });
}

function handleAccusation(target) {
    const container = document.getElementById('chat-messages');

    if (target === 'blake') {
        container.innerHTML = '<div class="msg-npc"><span style="color:#ff69b4">BLAKE:</span> Babe... it\'s not me. I checked my pockets three times already. Try again?</div>';
        document.getElementById('chat-next').textContent = 'NEXT';
        document.getElementById('chat-next').style.display = 'block';
        document.getElementById('chat-next').onclick = () => {
            l2AccusationOpen = false;
            document.getElementById('chat-next').onclick = null;
            updateAccusationButton();
            renderChatLine('blake', "It's not me, babe. I checked my pockets. Try again when you're ready!");
        };
    } else if (target === 'abraham') {
        container.innerHTML = '<div class="msg-npc"><span style="color:#ff69b4">BLAKE:</span> Abraham checks everywhere... nope. He doesn\'t have it either. The lube explosion would have revealed it anyway. Try again?</div>';
        document.getElementById('chat-next').textContent = 'NEXT';
        document.getElementById('chat-next').style.display = 'block';
        document.getElementById('chat-next').onclick = () => {
            l2AccusationOpen = false;
            document.getElementById('chat-next').onclick = null;
            updateAccusationButton();
            renderChatLine('blake', "Abraham doesn't have it. The lube explosion would have revealed it. Try again!");
        };
    } else if (target === 'vanessa') {
        document.getElementById('chat-next').style.display = 'none';
        container.innerHTML = '<div class="msg-npc"><span style="color:#ff69b4">BLAKE:</span> Vanessa...</div>';
        setTimeout(() => {
            container.innerHTML = '<div class="msg-npc"><span style="color:#cc44ff">VANESSA:</span> Oh... OH! *reaches into bosoms* ...Is THIS what everyone\'s been looking for?!</div>';
            setTimeout(() => {
                container.innerHTML += '<div class="msg-npc"><span style="color:#cc44ff">VANESSA:</span> I stuck it in my bosoms last night and completely forgot! Girls, I am SO sorry!</div>';
                setTimeout(() => {
                    container.innerHTML += '<div class="msg-npc" style="color:#ffcc00; text-align:center; margin-top:8px;">🔑 Room key found! You can now leave.</div>';
                    l2Solved = true;
                    l2AccusationOpen = false;
                    const accuseBtn = document.getElementById('chat-accuse');
                    if (accuseBtn) accuseBtn.style.display = 'none';
                    document.getElementById('chat-next').textContent = 'CLOSE';
                    document.getElementById('chat-next').style.display = 'block';
                }, 1500);
            }, 1500);
        }, 1500);
    }
}

function tryExitRoom() {
    if (l2Solved) return true;
    l2State = 'exit-blocked';
    l2ExitBlocked = true;
    promptEl.classList.remove('visible');
    dialogBox.innerHTML = '<span style="color:#ff69b4;">Blake:</span> Babe! We can\'t leave yet — we still need to find the key! Talk to everyone and figure out who has it.<br><br><span style="color:#aaa">Press any key...</span>';
    dialogBox.classList.add('visible');
    return false;
}

function advanceLevel2Dialog() {
    if (!l2TalkingTo || l2SayingBye || l2AccusationOpen) return;

    // If typewriter still going, skip to end
    if (l2Typewriting && l2Typewriting.current !== l2Typewriting.full) {
        l2Typewriting.current = l2Typewriting.full;
        l2Typewriting.charIndex = l2Typewriting.full.length;
        renderChatLine(l2TalkingTo, l2Typewriting.full);
        return;
    }

    const npcKey = l2TalkingTo;
    let lines;
    if (npcKey === 'blake' && l2BlakeInTutorial) {
        lines = L2_DIALOG.blake_tutorial;
    } else if (npcKey === 'blake' && l2DialogIndex.blake >= L2_DIALOG.blake.length) {
        lines = L2_DIALOG.blake_after;
    } else {
        lines = L2_DIALOG[npcKey];
    }

    l2DialogIndex[npcKey]++;
    const idx = l2DialogIndex[npcKey];

    if (idx >= lines.length) {
        // Done with all lines — close chat
        closeLevel2Chat();
        return;
    }

    const line = lines[idx];
    startLevel2Typing(line);
    renderChatLine(npcKey, line);

    // If Blake just said "Want me to show you how to use the notebook?" — show YES/NO
    if (npcKey === 'blake' && !l2BlakeInTutorial && line === L2_DIALOG.blake[L2_DIALOG.blake.length - 1]) {
        document.getElementById('chat-next').style.display = 'none';
        setTimeout(() => {
            const container = document.getElementById('chat-messages');
            container.innerHTML += '<div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">' +
                '<button id="tut-yes" style="padding:6px 16px; font-family:monospace; font-size:11px; cursor:pointer; background:rgba(232,208,112,0.15); border:2px solid #e8d070; border-radius:4px; color:#e8d070;">YES</button>' +
                '<button id="tut-no" style="padding:6px 16px; font-family:monospace; font-size:11px; cursor:pointer; background:rgba(255,255,255,0.1); border:2px solid #888; border-radius:4px; color:#aaa;">NO</button>' +
                '</div>';
            document.getElementById('tut-yes').addEventListener('click', () => {
                startBlakeTutorial();
            });
            document.getElementById('tut-no').addEventListener('click', () => {
                closeLevel2Chat();
            });
        }, 0);
    }
}

function startLevel2Typing(text) {
    l2Typewriting = { full: text, current: '', charIndex: 0 };
    l2TypeTimer = 0;
}

function renderChatLine(npcKey, text) {
    const container = document.getElementById('chat-messages');
    const npc = L2_NPCS[npcKey];
    const displayText = (l2Typewriting && l2Typewriting.current !== l2Typewriting.full)
        ? l2Typewriting.current : text;
    container.innerHTML = `<div class="msg-npc"><span style="color:${npc.color}">${npc.name}:</span> ${displayText}</div>`;
    document.getElementById('chat-next').style.display = 'block';
}

function updateChatDisplay() {
    if (!l2TalkingTo || !l2Typewriting) return;
    const container = document.getElementById('chat-messages');
    const npc = L2_NPCS[l2TalkingTo];
    const firstDiv = container.querySelector('.msg-npc');
    if (firstDiv) {
        firstDiv.innerHTML = `<span style="color:${npc.color}">${npc.name}:</span> ${l2Typewriting.current}`;
    }
}

function addL2Clue(text) {
    if (!l2DiscoveredClues.includes(text)) l2DiscoveredClues.push(text);
}

function openNotebook() {
    l2State = 'notebook';
    l2Notebook.open = true;
    renderNotebook();
    document.getElementById('notebook-overlay').style.display = 'flex';
}

function renderNotebook() {
    const content = document.getElementById('notebook-content');
    let html = '<div style="color:#e8d070; font-size:12px; margin-bottom:12px; text-align:center; letter-spacing:2px;">─── DETECTIVE\'S NOTEBOOK ───</div>';

    // Grid — items on left (rows), people on top (columns)
    html += '<table style="border-collapse:collapse; margin:0 auto 12px; font-family:monospace;">';
    html += '<thead><tr><td style="width:80px;"></td>';
    for (let c = 0; c < 3; c++) {
        const npcKey = Object.keys(L2_NPCS)[c];
        html += `<td style="width:36px; text-align:center; color:${L2_NPCS[npcKey].color}; font-size:10px; padding:2px;">${L2_SUSPECTS[c]}</td>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < 3; r++) {
        html += `<tr><td style="color:#e8d070; font-size:10px; text-align:right; padding-right:6px;">${L2_ITEMS[r]}</td>`;
        for (let c = 0; c < 3; c++) {
            const val = l2Notebook.grid[r][c];
            const display = val === 'check' ? '✓' : val === 'x' ? '✗' : val === '?' ? '?' : '';
            const color = val === 'check' ? '#44ff44' : val === 'x' ? '#ff4444' : val === '?' ? '#e8d070' : '#888';
            html += `<td data-r="${r}" data-c="${c}" class="nb-cell" style="width:36px; height:36px; border:1px solid #3a3060; background:#1a1420; text-align:center; cursor:pointer; font-size:16px; color:${color}; user-select:none;">${display}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';

    // Clues
    html += '<div style="border-top:1px solid #3a3060; padding-top:10px; margin-bottom:10px;">';
    html += '<div style="color:#e8d070; font-size:10px; margin-bottom:6px; text-align:center;">─── CLUES & EVIDENCE ───</div>';
    if (l2DiscoveredClues.length === 0) {
        html += '<div style="color:#8a8a7a; font-size:10px; line-height:18px; font-style:italic;">No clues discovered yet. Talk to people.</div>';
    } else {
        for (const clue of l2DiscoveredClues) {
            html += `<div style="color:#c8b880; font-size:10px; line-height:18px; margin-bottom:4px;">• ${clue}</div>`;
        }
    }
    html += '</div>';

    // Buttons
    html += '<div style="display:flex; gap:8px; justify-content:center;">';
    html += '<button id="nb-reset" style="font-family:monospace; font-size:10px; padding:6px 12px; background:transparent; color:#ff6644; border:1px solid #ff6644; border-radius:4px; cursor:pointer;">RESET GRID</button>';
    html += '<button id="nb-close" style="font-family:monospace; font-size:10px; padding:6px 12px; background:transparent; color:#e8d070; border:2px solid #e8d070; border-radius:4px; cursor:pointer;">CLOSE (ESC)</button>';
    html += '</div>';

    content.innerHTML = html;

    // Attach cell click handlers
    content.querySelectorAll('.nb-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            toggleNotebookCell(r, c);
            renderNotebook();
        });
    });

    document.getElementById('nb-reset').addEventListener('click', (e) => {
        e.stopPropagation();
        l2Notebook.grid = [['','',''], ['','',''], ['','','']];
        l2Notebook.autoMarks = {};
        renderNotebook();
    });
    document.getElementById('nb-close').addEventListener('click', (e) => {
        e.stopPropagation();
        l2Notebook.open = false;
        l2State = 'free';
        document.getElementById('notebook-overlay').style.display = 'none';
    });
}

function toggleNotebookCell(row, col) {
    const current = l2Notebook.grid[row][col];
    const cycle = { '': 'check', 'check': 'x', 'x': '?', '?': '' };
    const next = cycle[current] || '';

    // Remove old auto-marks from this cell's previous check
    const cellKey = `${row}-${col}`;
    if (l2Notebook.autoMarks[cellKey]) {
        for (const mark of l2Notebook.autoMarks[cellKey]) {
            if (l2Notebook.grid[mark.r][mark.c] === 'x') {
                l2Notebook.grid[mark.r][mark.c] = '';
            }
        }
        delete l2Notebook.autoMarks[cellKey];
    }

    l2Notebook.grid[row][col] = next;

    // If placing a check, auto-x the rest of row and column
    if (next === 'check') {
        const marked = [];
        for (let c = 0; c < 3; c++) {
            if (c !== col && l2Notebook.grid[row][c] === '') {
                l2Notebook.grid[row][c] = 'x';
                marked.push({ r: row, c });
            }
        }
        for (let r = 0; r < 3; r++) {
            if (r !== row && l2Notebook.grid[r][col] === '') {
                l2Notebook.grid[r][col] = 'x';
                marked.push({ r, c: col });
            }
        }
        l2Notebook.autoMarks[cellKey] = marked;
    }
}

function updateLevel2() {
    // Typewriter advancement
    if (l2Typewriting && l2Typewriting.charIndex < l2Typewriting.full.length) {
        l2TypeTimer++;
        if (l2TypeTimer >= 1) {
            l2TypeTimer = 0;
            l2Typewriting.charIndex += 2;
            if (l2Typewriting.charIndex > l2Typewriting.full.length) l2Typewriting.charIndex = l2Typewriting.full.length;
            l2Typewriting.current = l2Typewriting.full.substring(0, l2Typewriting.charIndex);
            if (l2TalkingTo) updateChatDisplay();
        }
    }

    if (l2State === 'in-bed') {
        // Just waiting for player to press LOOK
        return;
    }

    if (l2State === 'wakeup-text') {
        l2Timer++;
        if (l2TextPhase === 'fadein') {
            l2TextAlpha += 0.02;
            if (l2TextAlpha >= 1) { l2TextAlpha = 1; l2TextPhase = 'hold'; l2Timer = 0; }
        } else if (l2TextPhase === 'hold') {
            if (l2Timer > 120) { l2TextPhase = 'fadeout'; }
        } else if (l2TextPhase === 'fadeout') {
            l2TextAlpha -= 0.02;
            if (l2TextAlpha <= 0) {
                l2TextAlpha = 0;
                l2State = 'exclamation';
                l2ExclTimer = 0;
            }
        }
        return;
    }

    if (l2State === 'exclamation') {
        l2ExclTimer++;
        if (l2ExclTimer > 60) {
            l2State = 'blake-intro';
            l2BlakeIntroSaid = true;
            gameState = 'level2';
            dialogBox.innerHTML = '<span style="color:#ff69b4;">Blake:</span> Oh finally, you\'re awake! We need your help. We can\'t remember which one of us had the hotel key! We can\'t leave until we find it. You\'re good at mysteries, so we\'re hoping you can help us.<br><br><span style="color:#aaa">Press any key...</span>';
            dialogBox.classList.add('visible');
        }
        return;
    }

    if (l2State === 'blake-intro') {
        // Show "Time to gather clues" text after dismissing dialog
        if (!dialogBox.classList.contains('visible') && !l2ShowTimeText) {
            l2ShowTimeText = true;
            l2TimeTextAlpha = 0;
            l2TimeTextPhase = 'fadein';
            l2Timer = 0;
        }
        if (l2ShowTimeText) {
            l2Timer++;
            if (l2TimeTextPhase === 'fadein') {
                l2TimeTextAlpha += 0.03;
                if (l2TimeTextAlpha >= 1) { l2TimeTextAlpha = 1; l2TimeTextPhase = 'hold'; l2Timer = 0; }
            } else if (l2TimeTextPhase === 'hold') {
                if (l2Timer > 90) { l2TimeTextPhase = 'fadeout'; }
            } else if (l2TimeTextPhase === 'fadeout') {
                l2TimeTextAlpha -= 0.03;
                if (l2TimeTextAlpha <= 0) {
                    l2TimeTextAlpha = 0;
                    l2ShowTimeText = false;
                    l2State = 'free';
                }
            }
        }
        return;
    }

    if (l2State === 'chat') {
        return;
    }

    if (l2State !== 'free') return;

    // Player movement
    let moved = false;
    let newX = l2PlayerX;
    let newY = l2PlayerY;
    const spd = 2.5;

    if (keys['arrowleft'] || keys['a']) { newX -= spd; l2PlayerFacing = 'left'; moved = true; }
    if (keys['arrowright'] || keys['d']) { newX += spd; l2PlayerFacing = 'right'; moved = true; }
    if (keys['arrowup'] || keys['w']) { newY -= spd; l2PlayerFacing = 'up'; moved = true; }
    if (keys['arrowdown'] || keys['s']) { newY += spd; l2PlayerFacing = 'down'; moved = true; }

    // Bounds (walls)
    const minX = 54;
    const maxX = 430;
    const minY = 50;
    const maxY = 260;

    if (newX < minX) newX = minX;
    if (newX > maxX) newX = maxX;
    if (newY < minY) newY = minY;
    if (newY > maxY) newY = maxY;

    // Collision (furniture + NPCs)
    const pw = 24, ph = 36;
    const npcColliders = Object.values(L2_NPCS).map(n => ({ x: n.x + 4, y: n.y + 8, w: 16, h: 28 }));
    const allColliders = L2_COLLIDERS.concat(npcColliders);
    if (!collidesWithAny(newX, newY, pw, ph, allColliders)) {
        l2PlayerX = newX;
        l2PlayerY = newY;
    } else {
        if (!collidesWithAny(newX, l2PlayerY, pw, ph, allColliders)) {
            l2PlayerX = newX;
        } else if (!collidesWithAny(l2PlayerX, newY, pw, ph, allColliders)) {
            l2PlayerY = newY;
        }
    }
    if (moved) player.animTimer++;

    // NPC proximity check
    l2NearNpc = null;
    l2NearItem = null;
    const pcx = l2PlayerX + 12;
    const pcy = l2PlayerY + 18;
    for (const key of Object.keys(L2_NPCS)) {
        const npc = L2_NPCS[key];
        const ncx = npc.x + 12;
        const ncy = npc.y + 18;
        if (Math.abs(pcx - ncx) < 50 && Math.abs(pcy - ncy) < 50) {
            l2NearNpc = key;
            break;
        }
    }

    // Item proximity check (only if no NPC nearby)
    if (!l2NearNpc) {
        for (const item of L2_EXAMINE_ITEMS) {
            const icx = item.x + item.w / 2;
            const icy = item.y + item.h / 2;
            if (Math.abs(pcx - icx) < 50 && Math.abs(pcy - icy) < 50) {
                l2NearItem = item.id;
                break;
            }
        }
    }

    // Door exit check (right wall, door at y=130-190)
    if (l2PlayerX >= maxX - 10 && l2PlayerY > 120 && l2PlayerY < 190) {
        if (!tryExitRoom()) {
            l2PlayerX = maxX - 20;
            return;
        }
        // Level 2 complete!
        gameState = 'level2-complete';
        GameMusic.stopMusic();
        dialogBox.innerHTML = '<span style="color:#ffcc00; font-size:16px;">Level 2 Complete!</span><br><br>You solved the mystery! Vanessa had the room key in her bosoms the whole time.<br><br><span style="color:#aaa">Thanks for playing!</span>';
        dialogBox.classList.add('visible');
        return;
    }

    if (l2NearNpc && gameState === 'level2') {
        promptEl.classList.add('visible');
        promptEl.textContent = isMobile() ? 'Tap LOOK to talk' : 'Press E or SPACE to talk';
    } else if (l2NearItem && gameState === 'level2') {
        promptEl.classList.add('visible');
        promptEl.textContent = isMobile() ? 'Tap LOOK to examine' : 'Press E or SPACE to examine';
    } else {
        promptEl.classList.remove('visible');
    }
}

function drawLevel2() {
    // Floor (warm hotel carpet)
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(0, 0, L2_ROOM_W, L2_ROOM_H);
    for (let x = 0; x < L2_ROOM_W; x += 24) {
        for (let y = 0; y < L2_ROOM_H; y += 24) {
            ctx.fillStyle = '#321e44';
            ctx.fillRect(x + 2, y + 2, 10, 10);
        }
    }

    // Walls
    // Top wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, 0, L2_ROOM_W, 50);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(0, 46, L2_ROOM_W, 4);
    // Bottom wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, 270, L2_ROOM_W, 50);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(0, 270, L2_ROOM_W, 4);
    // Left wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, 0, 50, L2_ROOM_H);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(46, 0, 4, L2_ROOM_H);
    // Right wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(440, 0, 40, L2_ROOM_H);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(440, 0, 4, L2_ROOM_H);

    // Door in right wall (locked)
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(440, 130, 24, 60);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(444, 134, 18, 52);
    ctx.fillStyle = '#6d3a0a';
    ctx.fillRect(448, 138, 10, 20);
    ctx.fillRect(448, 162, 10, 18);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(450, 156, 4, 4);

    // Bed (vertical, on left side) — rotated 90° from original
    ctx.fillStyle = '#4a3a6a';
    ctx.fillRect(50, 60, 110, 200);
    ctx.fillStyle = '#5a4a7a';
    ctx.fillRect(54, 64, 102, 50);
    // Pillows (at top of bed)
    ctx.fillStyle = '#ddd';
    ctx.fillRect(60, 68, 40, 30);
    ctx.fillRect(104, 68, 40, 30);
    // Blanket fold
    ctx.fillStyle = '#3a2a5a';
    ctx.fillRect(54, 120, 102, 4);

    // Bedside tables
    ctx.fillStyle = '#7a5020';
    ctx.fillRect(50, 40, 44, 12);
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(50, 52, 44, 8);

    ctx.fillStyle = '#7a5020';
    ctx.fillRect(50, 260, 44, 12);
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(50, 272, 44, 8);

    // Credit card on bottom bedside table (with chocolate lube smear)
    ctx.fillStyle = '#8B6040';
    ctx.fillRect(60, 262, 22, 14);
    ctx.fillStyle = '#cc9944';
    ctx.fillRect(62, 264, 18, 10);
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(63, 266, 6, 3);
    // Chocolate lube smear
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(56, 265, 8, 4);
    ctx.fillRect(78, 268, 6, 3);

    // Draw NPCs
    for (const key of Object.keys(L2_NPCS)) {
        const npc = L2_NPCS[key];
        drawLevel2NPC(npc, key);
    }

    // Draw player (if not in bed)
    if (l2State !== 'in-bed') {
        drawLevel2Player();
    } else {
        // Player in bed (just a head poking out)
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(78, 130, 12, 10);
        ctx.fillStyle = selectedChar ? (selectedChar.type === 'redhead' ? '#cc3300' : COLORS.hair) : COLORS.hair;
        ctx.fillRect(76, 126, 16, 6);
        // Blanket over body
        ctx.fillStyle = '#5a4a7a';
        ctx.fillRect(54, 140, 102, 60);
    }

    // Exclamation point over Blake
    if (l2State === 'exclamation') {
        const bx = L2_NPCS.blake.x;
        const by = L2_NPCS.blake.y;
        ctx.fillStyle = '#fff';
        ctx.fillRect(bx + 4, by - 24, 16, 18);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', bx + 12, by - 10);
        ctx.textAlign = 'left';
    }

    // NPC highlight when near
    if (l2NearNpc && l2State === 'free') {
        const npc = L2_NPCS[l2NearNpc];
        const bob = Math.sin(Date.now() * 0.005) * 3;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(npc.x + 12, npc.y - 10 + bob);
        ctx.lineTo(npc.x + 7, npc.y - 18 + bob);
        ctx.lineTo(npc.x + 17, npc.y - 18 + bob);
        ctx.fill();
    }

    // Prompt for bed
    if (l2State === 'in-bed') {
        ctx.fillStyle = '#ffcc00';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isMobile() ? 'Tap LOOK to get out of bed' : 'Press E or SPACE to get out of bed', L2_ROOM_W / 2, L2_ROOM_H - 20);
        ctx.textAlign = 'left';
    }

    // Wakeup text overlay
    if (l2State === 'wakeup-text') {
        ctx.fillStyle = `rgba(0, 0, 20, ${l2TextAlpha * 0.7})`;
        ctx.fillRect(0, L2_ROOM_H / 2 - 30, L2_ROOM_W, 60);
        ctx.fillStyle = `rgba(255, 255, 255, ${l2TextAlpha})`;
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Wow, that was a wild dream...', L2_ROOM_W / 2, L2_ROOM_H / 2 + 5);
        ctx.textAlign = 'left';
    }

    // "Time to gather clues" text
    if (l2ShowTimeText) {
        ctx.fillStyle = `rgba(0, 0, 20, ${l2TimeTextAlpha * 0.7})`;
        ctx.fillRect(0, L2_ROOM_H / 2 - 30, L2_ROOM_W, 60);
        ctx.fillStyle = `rgba(255, 204, 0, ${l2TimeTextAlpha})`;
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Time to gather clues...', L2_ROOM_W / 2, L2_ROOM_H / 2 + 5);
        ctx.textAlign = 'left';
    }
}

function drawLevel2Player() {
    const px = Math.floor(l2PlayerX);
    const py = Math.floor(l2PlayerY);
    const char = selectedChar || CHARACTERS[0];
    const moving = isMoving() && l2State === 'free';
    const bounce = Math.sin(player.animTimer * 0.15) * (moving ? 1.5 : 0);
    const legSwing = moving ? Math.sin(player.animTimer * 0.22) * 3 : 0;
    const armSwing = moving ? Math.sin(player.animTimer * 0.18) * 2 : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + 12, py + 36, 13, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (l2PlayerFacing === 'up') drawCharBack(px, py, bounce, legSwing, armSwing, char);
    else if (l2PlayerFacing === 'down') drawCharFront(px, py, bounce, legSwing, armSwing, char);
    else if (l2PlayerFacing === 'left') drawCharSide(px, py, bounce, legSwing, armSwing, -1, char);
    else drawCharSide(px, py, bounce, legSwing, armSwing, 1, char);
}

function drawLevel2NPC(npc, key) {
    const x = npc.x;
    const y = npc.y;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 36, 13, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (key === 'blake') drawBlakeSprite(x, y, npc.facing);
    else if (key === 'abraham') drawAbrahamSprite(x, y, npc.facing);
    else if (key === 'vanessa') drawVanessaSprite(x, y, npc.facing);
}

function drawBlakeSprite(x, y, facing) {
    // Blake: boyfriend, warm tones, tank top, brown hair
    const b = 0;
    // Legs
    ctx.fillStyle = '#2b4570';
    ctx.fillRect(x + 6, y + 26 + b, 5, 10);
    ctx.fillRect(x + 13, y + 26 + b, 5, 10);
    // Shorts
    ctx.fillStyle = '#1e3350';
    ctx.fillRect(x + 5, y + 22 + b, 14, 6);
    // Torso (pink tank top)
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(x + 3, y + 7 + b, 18, 16);
    ctx.fillStyle = '#cc5590';
    ctx.fillRect(x + 3, y + 21 + b, 18, 2);
    // Arms
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 1, y + 8 + b, 3, 12);
    ctx.fillRect(x + 20, y + 8 + b, 3, 12);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 6, y - 2 + b, 12, 10);
    // Hair (brown, styled)
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(x + 5, y - 6 + b, 14, 5);
    ctx.fillRect(x + 6, y - 8 + b, 12, 3);
    // Eyes (if facing down)
    if (facing === 'down') {
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 8, y + 1, 2, 2);
        ctx.fillRect(x + 14, y + 1, 2, 2);
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(x + 9, y + 5, 6, 2);
    }
}

function drawAbrahamSprite(x, y, facing) {
    // Abraham: friend, green shirt, dark skin, short black hair
    const b = 0;
    // Legs
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 6, y + 26 + b, 5, 10);
    ctx.fillRect(x + 13, y + 26 + b, 5, 10);
    // Shorts
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 5, y + 22 + b, 14, 6);
    // Torso (green shirt)
    ctx.fillStyle = '#44cc88';
    ctx.fillRect(x + 3, y + 7 + b, 18, 16);
    ctx.fillStyle = '#339966';
    ctx.fillRect(x + 3, y + 21 + b, 18, 2);
    // Arms
    ctx.fillStyle = '#8b6040';
    ctx.fillRect(x + 1, y + 8 + b, 3, 12);
    ctx.fillRect(x + 20, y + 8 + b, 3, 12);
    // Head
    ctx.fillStyle = '#8b6040';
    ctx.fillRect(x + 6, y - 2 + b, 12, 10);
    // Hair (short black)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 5, y - 5 + b, 14, 4);
    // Eyes/face
    if (facing === 'left' || facing === 'down') {
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 8, y + 1, 2, 2);
        ctx.fillRect(x + 14, y + 1, 2, 2);
    }
}

function drawVanessaSprite(x, y, facing) {
    // Vanessa: drag queen, purple dress, big wig, dramatic
    const b = 0;
    // Legs (heels)
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 7, y + 28 + b, 4, 8);
    ctx.fillRect(x + 13, y + 28 + b, 4, 8);
    ctx.fillStyle = '#cc44ff';
    ctx.fillRect(x + 6, y + 34 + b, 5, 3);
    ctx.fillRect(x + 12, y + 34 + b, 5, 3);
    // Dress
    ctx.fillStyle = '#cc44ff';
    ctx.fillRect(x + 3, y + 7 + b, 18, 22);
    ctx.fillStyle = '#9933cc';
    ctx.fillRect(x + 3, y + 27 + b, 18, 3);
    // Bodice detail
    ctx.fillStyle = '#ff66ff';
    ctx.fillRect(x + 7, y + 8 + b, 10, 4);
    // Arms
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 1, y + 8 + b, 3, 10);
    ctx.fillRect(x + 20, y + 8 + b, 3, 10);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 6, y - 2 + b, 12, 10);
    // Wig (big, purple)
    ctx.fillStyle = '#9900cc';
    ctx.fillRect(x + 3, y - 10 + b, 18, 10);
    ctx.fillRect(x + 2, y - 6 + b, 20, 6);
    ctx.fillRect(x + 1, y - 3 + b, 4, 8);
    ctx.fillRect(x + 19, y - 3 + b, 4, 8);
    // Eyes/lips
    if (facing === 'right' || facing === 'down') {
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 8, y + 1, 2, 2);
        ctx.fillRect(x + 14, y + 1, 2, 2);
        ctx.fillStyle = '#ff3366';
        ctx.fillRect(x + 9, y + 5, 6, 2);
    }
}

function drawLevel2Portrait(npcKey) {
    const pCanvas = document.getElementById('chat-portrait');
    const pCtx = pCanvas.getContext('2d');
    pCtx.fillStyle = '#1a1420';
    pCtx.fillRect(0, 0, 96, 96);

    if (npcKey === 'blake') {
        // Blake portrait: warm, pink tank, brown hair
        // Shoulders/torso
        pCtx.fillStyle = '#ff69b4';
        pCtx.fillRect(16, 60, 64, 36);
        pCtx.fillStyle = '#cc5590';
        pCtx.fillRect(16, 90, 64, 6);
        // Neck
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(38, 50, 20, 14);
        // Head
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(28, 20, 40, 34);
        // Hair
        pCtx.fillStyle = '#5c3a1a';
        pCtx.fillRect(26, 10, 44, 14);
        pCtx.fillRect(28, 8, 40, 6);
        pCtx.fillRect(24, 14, 6, 14);
        pCtx.fillRect(66, 14, 6, 14);
        // Eyes
        pCtx.fillStyle = '#333';
        pCtx.fillRect(34, 32, 6, 6);
        pCtx.fillRect(54, 32, 6, 6);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(35, 33, 2, 2);
        pCtx.fillRect(55, 33, 2, 2);
        // Smile
        pCtx.fillStyle = '#cc4444';
        pCtx.fillRect(38, 44, 20, 4);
    } else if (npcKey === 'abraham') {
        // Abraham portrait: green shirt, dark skin
        pCtx.fillStyle = '#44cc88';
        pCtx.fillRect(16, 60, 64, 36);
        pCtx.fillStyle = '#339966';
        pCtx.fillRect(16, 90, 64, 6);
        pCtx.fillStyle = '#8b6040';
        pCtx.fillRect(38, 50, 20, 14);
        pCtx.fillStyle = '#8b6040';
        pCtx.fillRect(28, 20, 40, 34);
        // Hair
        pCtx.fillStyle = '#1a1a1a';
        pCtx.fillRect(26, 12, 44, 12);
        pCtx.fillRect(28, 10, 40, 6);
        // Eyes
        pCtx.fillStyle = '#222';
        pCtx.fillRect(34, 32, 6, 6);
        pCtx.fillRect(54, 32, 6, 6);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(35, 33, 2, 2);
        pCtx.fillRect(55, 33, 2, 2);
        // Smile
        pCtx.fillStyle = '#664030';
        pCtx.fillRect(38, 44, 20, 3);
    } else if (npcKey === 'vanessa') {
        // Vanessa portrait: drag queen, purple wig, glamorous
        // Dress
        pCtx.fillStyle = '#cc44ff';
        pCtx.fillRect(16, 60, 64, 36);
        pCtx.fillStyle = '#ff66ff';
        pCtx.fillRect(26, 62, 44, 8);
        // Neck
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(38, 50, 20, 14);
        // Head
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(28, 20, 40, 34);
        // Wig (big purple)
        pCtx.fillStyle = '#9900cc';
        pCtx.fillRect(20, 4, 56, 22);
        pCtx.fillRect(18, 12, 60, 14);
        pCtx.fillRect(16, 20, 10, 20);
        pCtx.fillRect(70, 20, 10, 20);
        // Eyes (dramatic makeup)
        pCtx.fillStyle = '#333';
        pCtx.fillRect(34, 30, 6, 6);
        pCtx.fillRect(54, 30, 6, 6);
        pCtx.fillStyle = '#cc44ff';
        pCtx.fillRect(32, 28, 10, 3);
        pCtx.fillRect(52, 28, 10, 3);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(35, 31, 2, 2);
        pCtx.fillRect(55, 31, 2, 2);
        // Lips
        pCtx.fillStyle = '#ff3366';
        pCtx.fillRect(36, 44, 24, 5);
        pCtx.fillRect(38, 48, 20, 3);
    }
}

// Chat event listeners
// NEXT button — advance dialog
document.getElementById('chat-next').addEventListener('click', (e) => {
    e.stopPropagation();
    if (l2AccusationOpen) return;
    if (l2State === 'chat') advanceLevel2Dialog();
});

// Notebook button
document.getElementById('notebook-btn').addEventListener('click', () => {
    if (l2State === 'free' && l2HasNotebook) openNotebook();
});
document.getElementById('notebook-overlay').addEventListener('click', () => {
    l2Notebook.open = false;
    l2State = 'free';
    document.getElementById('notebook-overlay').style.display = 'none';
});

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
