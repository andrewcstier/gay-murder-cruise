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
    speed: 2.2,
    facing: 'up',
    animTimer: 0
};
let nearDoor = null;
let currentDoorIsDead = false;
let musicEnabled = true;

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
    { y: 750, side: 'left', sign: 'Birthday Bitch \u{1F382}', color: '#ff69b4' },
    { y: 450, side: 'left', sign: 'No clothes beyond\nthis point \u{1F608}', color: '#e74c3c' },
    { y: 600, side: 'right', sign: 'First time \ncruiser!', color: '#9b59b6' },
    { y: 300, side: 'right', sign: 'Beware Of Twink\n(he bites) \u{1F62C}', color: '#f39c12' },
    { y: 0, side: 'end', sign: null, color: '#2c3e50', ajar: true, dead: true },
];

// Input
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    handleAction(e.key);
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function handleAction(key) {
    if (gameState === 'title') { startCharSelect(); return; }
    if (gameState === 'charselect') { handleCharSelectAction(key); return; }
    if (gameState === 'dialog') { closeDialog(); return; }
    if (gameState === 'playing' && (key.toLowerCase() === 'e' || key === ' ' || key === 'examine') && nearDoor !== null) {
        openDoorDialog(); return;
    }
    if (gameState === 'gameover') { location.reload(); }
}

function startCharSelect() {
    gameState = 'charselect';
    charSelectState = 'captain-intro';
    charSelectEnteredAt = Date.now();
    titleScreen.style.display = 'none';
    if (musicEnabled) GameMusic.startMusic('charselect');
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
    if (musicEnabled) GameMusic.startMusic('hallway');
}

function closeDialog() {
    if (currentDoorIsDead) {
        gameState = 'gameover';
        gameOverScreen.classList.add('visible');
        dialogBox.classList.remove('visible');
        GameMusic.stopMusic();
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
    else if (gameState === 'dialog') closeDialog();
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
        if (gameState === 'charselect') GameMusic.startMusic('charselect');
        else if (gameState === 'playing') GameMusic.startMusic('hallway');
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
    const moving = isMoving();
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
        drawDeadBodyScene();
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

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
