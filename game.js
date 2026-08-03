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
const WALL_THICKNESS = HALL_LEFT;
const HALL_LENGTH = 1000;

// Door dimensions
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
};

// Doors face inward (left wall doors face right, right wall doors face left)
// Positioned so they sit ON the wall, not overlapping the floor
const doors = [
    { x: HALL_LEFT, y: 750, side: 'left', sign: 'Birthday Bitch \u{1F382}', color: '#ff69b4' },
    { x: HALL_LEFT, y: 450, side: 'left', sign: 'No clothes beyond\nthis point \u{1F608}', color: '#e74c3c' },
    { x: HALL_RIGHT - DOOR_W, y: 600, side: 'right', sign: 'The door\'s unlocked,\ncome on in ;-)', color: '#9b59b6' },
    { x: HALL_RIGHT - DOOR_W, y: 300, side: 'right', sign: 'Beware of twink\n(he bites) \u{1F62C}', color: '#f39c12' },
    { x: WIDTH / 2 - 28, y: 30, side: 'end', sign: null, color: '#2c3e50', ajar: true, dead: true },
];

// Collision rects for doors (player can't walk through them)
function getDoorCollisionRect(door) {
    if (door.side === 'end') {
        return { x: door.x - 4, y: door.y, w: 56, h: 70 };
    }
    return { x: door.x, y: door.y, w: DOOR_W, h: DOOR_H };
}

// Input
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    handleAction(e.key);
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function handleAction(key) {
    if (gameState === 'title') { startGame(); return; }
    if (gameState === 'dialog') { closeDialog(); return; }
    if (gameState === 'playing' && (key.toLowerCase() === 'e' || key === ' ' || key === 'examine') && nearDoor !== null) {
        openDoorDialog(); return;
    }
    if (gameState === 'gameover') { location.reload(); }
}

function startGame() {
    gameState = 'playing';
    titleScreen.style.display = 'none';
    if (musicEnabled) GameMusic.startMusic();
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
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; btn.classList.add('active'); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; btn.classList.remove('active'); });
    btn.addEventListener('touchcancel', () => { keys[key] = false; btn.classList.remove('active'); });
});

const btnExamine = document.getElementById('btn-examine');
btnExamine.addEventListener('touchstart', (e) => {
    e.preventDefault(); btnExamine.classList.add('active');
    if (gameState === 'dialog') closeDialog();
    else handleAction('examine');
});
btnExamine.addEventListener('touchend', (e) => { e.preventDefault(); btnExamine.classList.remove('active'); });

document.getElementById('start-btn').addEventListener('click', () => handleAction('tap'));
document.getElementById('start-btn').addEventListener('touchstart', (e) => { e.preventDefault(); handleAction('tap'); });
document.getElementById('restart-btn').addEventListener('click', () => handleAction('tap'));
document.getElementById('restart-btn').addEventListener('touchstart', (e) => { e.preventDefault(); handleAction('tap'); });
dialogBox.addEventListener('click', () => handleAction('tap'));
dialogBox.addEventListener('touchstart', (e) => { e.preventDefault(); handleAction('tap'); });

musicToggle.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    musicToggle.textContent = musicEnabled ? 'Music: ON' : 'Music: OFF';
    if (musicEnabled && gameState === 'playing') GameMusic.startMusic();
    else GameMusic.stopMusic();
});

// Coordinate helpers
function sy(worldY) { return worldY - camera.y; }

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Drawing
function drawHallway() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const startY = Math.max(0, sy(0));
    const endY = Math.min(HEIGHT, sy(HALL_LENGTH));

    // Left wall
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, startY, HALL_LEFT, endY - startY);
    // Right wall
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

    // Carpet diamond pattern
    for (let cy = 0; cy < HALL_LENGTH; cy += 32) {
        const s = sy(cy);
        if (s < -32 || s > HEIGHT) continue;
        ctx.fillStyle = COLORS.carpetPattern;
        ctx.fillRect(HALL_LEFT + 20, s + 8, 12, 12);
        ctx.fillRect(HALL_LEFT + HALL_WIDTH - 32, s + 8, 12, 12);
        ctx.fillStyle = COLORS.carpetEdge;
        ctx.fillRect(HALL_LEFT + HALL_WIDTH / 2 - 4, s + 12, 8, 8);
    }

    // Carpet edge runners
    ctx.fillStyle = '#6a1a3e';
    ctx.fillRect(HALL_LEFT + 3, startY, 2, endY - startY);
    ctx.fillRect(HALL_RIGHT - 5, startY, 2, endY - startY);

    // North wall (end of hallway)
    const northY = sy(0);
    if (northY > -30 && northY < HEIGHT) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(HALL_LEFT, northY - 24, HALL_WIDTH, 24);
        ctx.fillStyle = COLORS.wallTrim;
        ctx.fillRect(HALL_LEFT, northY - 4, HALL_WIDTH, 4);
        // Wall lines on north wall
        ctx.fillStyle = COLORS.wallAccent;
        ctx.fillRect(HALL_LEFT, northY - 20, HALL_WIDTH, 2);
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
    const doorScreenY = sy(door.y);
    if (doorScreenY < -DOOR_H - 40 || doorScreenY > HEIGHT + 40) return;

    if (door.side === 'end') {
        drawEndDoor(door, index, doorScreenY);
        return;
    }

    const dx = door.x;
    const dsY = doorScreenY;

    // Door faces inward: drawn on the wall surface
    // Frame sits flush with the wall inner edge
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(dx - 2, dsY - 2, DOOR_W + 4, DOOR_H + 4);

    // Door body
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(dx, dsY, DOOR_W, DOOR_H);

    // Panels
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(dx + 4, dsY + 4, DOOR_W - 8, 22);
    ctx.fillRect(dx + 4, dsY + 30, DOOR_W - 8, 26);

    // Doorknob (on inner side)
    ctx.fillStyle = COLORS.doorKnob;
    if (door.side === 'left') {
        ctx.fillRect(dx + DOOR_W - 10, dsY + DOOR_H / 2, 4, 4);
    } else {
        ctx.fillRect(dx + 6, dsY + DOOR_H / 2, 4, 4);
    }

    // Sign on door - clearly visible paper sign
    const signW = 34;
    const signH = 20;
    const signX = dx + (DOOR_W - signW) / 2;
    const signY = dsY + 8;

    // Sign background
    ctx.fillStyle = COLORS.sign;
    ctx.fillRect(signX, signY, signW, signH);
    // Sign border
    ctx.strokeStyle = COLORS.signBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signX, signY, signW, signH);
    // Tack/pin at top
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(signX + signW / 2, signY + 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Text lines on sign
    ctx.fillStyle = door.color;
    ctx.fillRect(signX + 4, signY + 6, signW - 8, 3);
    ctx.fillRect(signX + 4, signY + 11, signW - 12, 3);
    ctx.fillRect(signX + 4, signY + 16, signW - 14, 2);

    // Highlight when near
    if (nearDoor === index) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx - 4, dsY - 4, DOOR_W + 8, DOOR_H + 8);
        // Bouncing arrow
        const bob = Math.sin(Date.now() * 0.005) * 3;
        ctx.fillStyle = '#ffcc00';
        const ax = dx + DOOR_W / 2;
        const ay = dsY - 12 + bob;
        ctx.beginPath();
        ctx.moveTo(ax, ay + 8);
        ctx.lineTo(ax - 5, ay);
        ctx.lineTo(ax + 5, ay);
        ctx.fill();
    }
}

function drawEndDoor(door, index, doorScreenY) {
    const edw = 56;
    const edh = 70;
    const edx = door.x;
    const edy = doorScreenY;

    // Frame
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(edx - 4, edy - 4, edw + 8, edh + 8);

    // Door body
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(edx, edy, edw, edh);

    // Panels
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(edx + 5, edy + 5, edw - 10, 28);
    ctx.fillRect(edx + 5, edy + 38, edw - 10, 28);

    // Door is ajar - dark gap on left side
    ctx.fillStyle = '#030306';
    ctx.fillRect(edx, edy, 18, edh);
    // Shadow gradient at gap edge
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(edx + 18, edy, 4, edh);

    // THE FOOT - clearly sticking out from gap at bottom
    // Lower leg/ankle coming from darkness
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx + 2, edy + edh - 18, 12, 14);
    // Foot (sideways, sole partially visible)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx - 8, edy + edh - 6, 28, 10);
    // Toes
    ctx.fillStyle = '#c89870';
    ctx.fillRect(edx - 12, edy + edh - 4, 6, 7);
    ctx.fillRect(edx - 7, edy + edh - 5, 5, 8);
    // Sole of foot shadow
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(edx - 6, edy + edh + 2, 22, 3);
    // Ankle detail
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(edx + 2, edy + edh - 20, 12, 4);

    // Small blood pool
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(edx - 10, edy + edh + 5, 32, 5);
    ctx.fillStyle = '#660000';
    ctx.fillRect(edx - 5, edy + edh + 9, 22, 3);

    if (nearDoor === index) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(edx - 14, edy - 6, edw + 22, edh + 20);
        const bob = Math.sin(Date.now() * 0.005) * 3;
        ctx.fillStyle = '#ffcc00';
        const ax = edx + edw / 2;
        const ay = edy - 12 + bob;
        ctx.beginPath();
        ctx.moveTo(ax, ay + 8);
        ctx.lineTo(ax - 5, ay);
        ctx.lineTo(ax + 5, ay);
        ctx.fill();
    }
}

function drawPlayer() {
    const px = Math.floor(player.x);
    const pyWorld = Math.floor(player.y);
    const pyScreen = sy(pyWorld);
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

    const f = player.facing;

    if (f === 'up') {
        drawPlayerBack(px, pyScreen, bounce, legSwing, armSwing);
    } else if (f === 'down') {
        drawPlayerFront(px, pyScreen, bounce, legSwing, armSwing);
    } else if (f === 'left') {
        drawPlayerSide(px, pyScreen, bounce, legSwing, armSwing, -1);
    } else {
        drawPlayerSide(px, pyScreen, bounce, legSwing, armSwing, 1);
    }
}

function drawPlayerBack(px, py, bounce, legSwing, armSwing) {
    // View from behind - show the butt!
    const b = bounce;

    // Legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    // Butt / speedo - rounded shape
    ctx.fillStyle = COLORS.speedo;
    // Main speedo
    ctx.fillRect(px + 5, py + 21 + b, 14, 7);
    // Rounded bottom of speedo (butt cheeks visible)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 24 + b, 6, 4);
    ctx.fillRect(px + 13, py + 24 + b, 6, 4);
    // Speedo center (thong back)
    ctx.fillStyle = COLORS.speedoShade;
    ctx.fillRect(px + 10, py + 22 + b, 4, 6);
    // Butt cheek definition
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 5, py + 25 + b, 1, 3);
    ctx.fillRect(px + 18, py + 25 + b, 1, 3);
    ctx.fillRect(px + 11, py + 24 + b, 1, 3);

    // Midriff
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 16 + b, 16, 6);
    // Back dimples
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 7, py + 19 + b, 2, 1);
    ctx.fillRect(px + 15, py + 19 + b, 2, 1);

    // Crop top
    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 3, py + 7 + b, 18, 10);
    ctx.fillStyle = COLORS.croptopShade;
    ctx.fillRect(px + 3, py + 15 + b, 18, 2);

    // Arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 8 + b + armSwing, 3, 12);
    ctx.fillRect(px + 20, py + 8 + b - armSwing, 3, 12);

    // Head (back of)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py - 2 + b, 12, 10);

    // Hair (back view - fuller)
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 5, py - 6 + b, 14, 8);
    ctx.fillRect(px + 6, py - 8 + b, 12, 4);
    // Neck
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 9, py + 6 + b, 6, 3);
}

function drawPlayerFront(px, py, bounce, legSwing, armSwing) {
    const b = bounce;

    // Legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    // Speedo front
    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 5, py + 22 + b, 14, 6);
    ctx.fillStyle = COLORS.speedoShade;
    ctx.fillRect(px + 5, py + 22 + b, 14, 2);
    // V-shape waistband
    ctx.fillStyle = COLORS.speedoShade;
    ctx.fillRect(px + 5, py + 21 + b, 4, 2);
    ctx.fillRect(px + 15, py + 21 + b, 4, 2);

    // Midriff (abs hint)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 16 + b, 16, 7);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 10, py + 17 + b, 1, 4);
    ctx.fillRect(px + 13, py + 17 + b, 1, 4);

    // Crop top
    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 3, py + 7 + b, 18, 10);
    ctx.fillStyle = COLORS.croptopShade;
    ctx.fillRect(px + 7, py + 7 + b, 10, 2);
    ctx.fillStyle = '#00ddff';
    ctx.fillRect(px + 3, py + 15 + b, 18, 2);

    // Arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 8 + b - armSwing, 3, 12);
    ctx.fillRect(px + 20, py + 8 + b + armSwing, 3, 12);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py - 2 + b, 12, 10);

    // Hair
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 5, py - 6 + b, 14, 6);
    ctx.fillRect(px + 6, py - 8 + b, 12, 3);

    // Sunglasses
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 7, py + b, 4, 3);
    ctx.fillRect(px + 13, py + b, 4, 3);
    ctx.fillRect(px + 11, py + 1 + b, 2, 2);
    // Reflection
    ctx.fillStyle = '#446';
    ctx.fillRect(px + 8, py + 1 + b, 2, 1);
    ctx.fillRect(px + 14, py + 1 + b, 2, 1);

    // Smile
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 9, py + 5 + b, 6, 2);
}

function drawPlayerSide(px, py, bounce, legSwing, armSwing, dir) {
    const b = bounce;
    // dir: 1 = facing right, -1 = facing left

    // Legs (one in front of other)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 26 + b, 5, 10 + legSwing);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 26 + b, 5, 10 - legSwing);

    // Butt (side view - protruding nicely)
    ctx.fillStyle = COLORS.skin;
    const buttX = dir === 1 ? px + 4 : px + 14;
    ctx.fillRect(buttX, py + 21 + b, 7, 7);
    // Speedo
    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 6, py + 22 + b, 12, 5);
    ctx.fillStyle = COLORS.speedoShade;
    ctx.fillRect(px + 6, py + 22 + b, 12, 2);

    // Midriff
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 16 + b, 12, 7);

    // Crop top
    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 5, py + 7 + b, 14, 10);
    ctx.fillStyle = COLORS.croptopShade;
    ctx.fillRect(px + 5, py + 15 + b, 14, 2);

    // Arm (one visible in side view)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 8 + b + armSwing, 3, 12);

    // Head (side)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 7, py - 2 + b, 10, 10);

    // Hair
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 6, py - 6 + b, 12, 6);
    ctx.fillRect(px + 7, py - 8 + b, 10, 3);

    // Sunglasses (side)
    ctx.fillStyle = '#111';
    const glassX = dir === 1 ? px + 13 : px + 7;
    ctx.fillRect(glassX, py + b, 5, 3);
    ctx.fillStyle = '#446';
    ctx.fillRect(glassX + 1, py + 1 + b, 2, 1);

    // Profile - nose
    ctx.fillStyle = COLORS.skin;
    const noseX = dir === 1 ? px + 17 : px + 5;
    ctx.fillRect(noseX, py + 2 + b, 2, 3);
}

function drawDeadBodyScene() {
    // Close-up: door ajar, leg/foot coming from body hidden behind door
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    // Floor
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(0, cy + 40, WIDTH, HEIGHT - cy - 40);
    for (let x = 0; x < WIDTH; x += 28) {
        ctx.fillStyle = COLORS.carpetPattern;
        ctx.fillRect(x + 4, cy + 50, 10, 10);
    }

    // Large door frame
    const doorX = cx - 60;
    const doorY = cy - 100;
    const doorW = 120;
    const doorH = 160;

    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(doorX - 8, doorY - 8, doorW + 16, doorH + 16);
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(doorX, doorY, doorW, doorH);

    // Door panels
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(doorX + 8, doorY + 8, doorW - 16, 55);
    ctx.fillRect(doorX + 8, doorY + 72, doorW - 16, 55);

    // Ajar gap (door partially open showing darkness)
    ctx.fillStyle = '#020204';
    ctx.fillRect(doorX, doorY, 36, doorH);
    // Shadow at edge of gap
    ctx.fillStyle = '#0d0808';
    ctx.fillRect(doorX + 36, doorY, 6, doorH);

    // THE LEG - clearly coming from inside (body hidden behind door)
    // Upper leg visible just at the gap threshold
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(doorX + 8, doorY + doorH - 50, 18, 16);

    // Lower leg / shin
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(doorX + 4, doorY + doorH - 36, 20, 30);

    // Ankle
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(doorX + 2, doorY + doorH - 8, 22, 6);

    // Foot sticking out past the door frame onto the hallway floor
    ctx.fillStyle = COLORS.skin;
    // Main foot shape
    ctx.fillRect(doorX - 16, doorY + doorH - 2, 40, 14);
    // Heel (rounder)
    ctx.fillRect(doorX + 16, doorY + doorH, 10, 12);
    // Toes (individual)
    ctx.fillStyle = '#c89870';
    ctx.fillRect(doorX - 20, doorY + doorH + 2, 7, 8);
    ctx.fillRect(doorX - 14, doorY + doorH + 1, 6, 9);
    ctx.fillRect(doorX - 9, doorY + doorH + 1, 5, 9);
    ctx.fillRect(doorX - 5, doorY + doorH + 2, 5, 8);
    ctx.fillRect(doorX - 1, doorY + doorH + 3, 4, 7);

    // Sole shadow
    ctx.fillStyle = '#a07050';
    ctx.fillRect(doorX - 16, doorY + doorH + 12, 36, 3);

    // Blood pool spreading from under/around the door
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(doorX - 20, doorY + doorH + 16, 50, 8);
    ctx.fillStyle = '#6b0000';
    ctx.fillRect(doorX - 10, doorY + doorH + 23, 35, 5);
    ctx.fillStyle = '#4b0000';
    ctx.fillRect(doorX, doorY + doorH + 27, 20, 4);

    // Blood drip from the leg
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(doorX + 10, doorY + doorH - 10, 3, 12);
    ctx.fillRect(doorX + 6, doorY + doorH + 2, 2, 8);

    // Darkness inside the door suggests the rest of the body
    // Hint of a shape in the darkness
    ctx.fillStyle = '#0a0508';
    ctx.fillRect(doorX + 2, doorY + 20, 28, 80);
    ctx.fillStyle = '#080406';
    ctx.fillRect(doorX + 8, doorY + 30, 20, 60);
}

function isMoving() {
    return keys['arrowleft'] || keys['arrowright'] || keys['arrowup'] || keys['arrowdown'] ||
           keys['a'] || keys['d'] || keys['w'] || keys['s'];
}

function update() {
    if (gameState !== 'playing') return;

    let moved = false;
    let newX = player.x;
    let newY = player.y;

    if (keys['arrowleft'] || keys['a']) { newX -= player.speed; player.facing = 'left'; moved = true; }
    if (keys['arrowright'] || keys['d']) { newX += player.speed; player.facing = 'right'; moved = true; }
    if (keys['arrowup'] || keys['w']) { newY -= player.speed; player.facing = 'up'; moved = true; }
    if (keys['arrowdown'] || keys['s']) { newY += player.speed; player.facing = 'down'; moved = true; }

    // Hallway bounds
    if (newX < HALL_LEFT + 6) newX = HALL_LEFT + 6;
    if (newX > HALL_RIGHT - player.width - 6) newX = HALL_RIGHT - player.width - 6;
    if (newY < 30) newY = 30;
    if (newY > HALL_LENGTH - player.height - 10) newY = HALL_LENGTH - player.height - 10;

    // Door collision
    let blocked = false;
    for (let i = 0; i < doors.length; i++) {
        const r = getDoorCollisionRect(doors[i]);
        if (rectsOverlap(newX, newY, player.width, player.height, r.x, r.y, r.w, r.h)) {
            blocked = true;
            break;
        }
    }

    if (!blocked) {
        player.x = newX;
        player.y = newY;
    } else {
        // Try sliding along axes independently
        let slideX = false, slideY = false;
        // Try X only
        let testBlocked = false;
        for (let i = 0; i < doors.length; i++) {
            const r = getDoorCollisionRect(doors[i]);
            if (rectsOverlap(newX, player.y, player.width, player.height, r.x, r.y, r.w, r.h)) {
                testBlocked = true; break;
            }
        }
        if (!testBlocked) { player.x = newX; slideX = true; }

        // Try Y only
        testBlocked = false;
        for (let i = 0; i < doors.length; i++) {
            const r = getDoorCollisionRect(doors[i]);
            if (rectsOverlap(player.x, newY, player.width, player.height, r.x, r.y, r.w, r.h)) {
                testBlocked = true; break;
            }
        }
        if (!testBlocked) { player.y = newY; slideY = true; }
    }

    if (moved) player.animTimer++;

    // Camera
    camera.y = player.y - HEIGHT / 2 + player.height / 2;
    if (camera.y < -20) camera.y = -20;
    if (camera.y > HALL_LENGTH - HEIGHT + 20) camera.y = HALL_LENGTH - HEIGHT + 20;

    // Proximity check
    nearDoor = null;
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;
    for (let i = 0; i < doors.length; i++) {
        const door = doors[i];
        const r = getDoorCollisionRect(door);
        const dcx = r.x + r.w / 2;
        const dcy = r.y + r.h / 2;
        const dist = Math.sqrt((dcx - pcx) ** 2 + (dcy - pcy) ** 2);
        if (dist < 60) { nearDoor = i; break; }
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
