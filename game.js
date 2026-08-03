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

// Door dimensions - doors are recessed INTO the walls
const DOOR_W = 44;
const DOOR_H = 60;
const DOOR_RECESS = 8; // how far into the wall the door sits

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

// Doors are recessed into the walls (not overlapping the hallway floor)
// Left doors: x is inside the left wall. Right doors: x is inside the right wall.
// End door: on the actual north wall.
const doors = [
    { x: HALL_LEFT - DOOR_W + DOOR_RECESS, y: 750, side: 'left', sign: 'Birthday Bitch \u{1F382}', color: '#ff69b4' },
    { x: HALL_LEFT - DOOR_W + DOOR_RECESS, y: 450, side: 'left', sign: 'No clothes beyond\nthis point \u{1F608}', color: '#e74c3c' },
    { x: HALL_RIGHT - DOOR_RECESS, y: 600, side: 'right', sign: 'The door\'s unlocked,\ncome on in ;-)', color: '#9b59b6' },
    { x: HALL_RIGHT - DOOR_RECESS, y: 300, side: 'right', sign: 'Beware of twink\n(he bites) \u{1F62C}', color: '#f39c12' },
    { x: WIDTH / 2 - 28, y: 20, side: 'end', sign: null, color: '#2c3e50', ajar: true, dead: true },
];

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

    // North wall
    const northY = sy(20);
    if (northY > -40 && northY < HEIGHT) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(HALL_LEFT, northY - 30, HALL_WIDTH, 30);
        ctx.fillStyle = COLORS.wallTrim;
        ctx.fillRect(HALL_LEFT, northY - 4, HALL_WIDTH, 4);
        ctx.fillStyle = COLORS.wallAccent;
        ctx.fillRect(HALL_LEFT, northY - 24, HALL_WIDTH, 2);
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

    // Door recess: dark alcove behind the door
    if (door.side === 'left') {
        // Alcove cut into left wall
        ctx.fillStyle = '#1a0e28';
        ctx.fillRect(HALL_LEFT - DOOR_W + 2, dsY - 4, DOOR_W + 2, DOOR_H + 8);
        // Top/bottom of recess
        ctx.fillStyle = COLORS.wallTrim;
        ctx.fillRect(HALL_LEFT - DOOR_W + 2, dsY - 4, DOOR_W + 2, 3);
        ctx.fillRect(HALL_LEFT - DOOR_W + 2, dsY + DOOR_H + 1, DOOR_W + 2, 3);
    } else {
        // Alcove cut into right wall
        ctx.fillStyle = '#1a0e28';
        ctx.fillRect(HALL_RIGHT - 2, dsY - 4, DOOR_W + 2, DOOR_H + 8);
        ctx.fillStyle = COLORS.wallTrim;
        ctx.fillRect(HALL_RIGHT - 2, dsY - 4, DOOR_W + 2, 3);
        ctx.fillRect(HALL_RIGHT - 2, dsY + DOOR_H + 1, DOOR_W + 2, 3);
    }

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

    // Doorknob (facing hallway)
    ctx.fillStyle = COLORS.doorKnob;
    if (door.side === 'left') {
        ctx.fillRect(dx + DOOR_W - 10, dsY + DOOR_H / 2, 4, 4);
    } else {
        ctx.fillRect(dx + 6, dsY + DOOR_H / 2, 4, 4);
    }

    // Sign on door
    const signW = 34;
    const signH = 20;
    const signX = dx + (DOOR_W - signW) / 2;
    const signY = dsY + 8;

    ctx.fillStyle = COLORS.sign;
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = COLORS.signBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signX, signY, signW, signH);
    // Pin
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(signX + signW / 2, signY + 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Text lines
    ctx.fillStyle = door.color;
    ctx.fillRect(signX + 4, signY + 6, signW - 8, 3);
    ctx.fillRect(signX + 4, signY + 11, signW - 12, 3);
    ctx.fillRect(signX + 4, signY + 16, signW - 14, 2);

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

function drawEndDoor(door, index, doorScreenY) {
    // This door is ON the north wall
    const edw = 56;
    const edh = 70;
    const edx = door.x;
    const edy = doorScreenY;

    // The door sits in the north wall
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

    // Door is ajar - gap showing darkness inside
    ctx.fillStyle = '#030306';
    ctx.fillRect(edx, edy, 20, edh);
    ctx.fillStyle = '#0d0808';
    ctx.fillRect(edx + 20, edy, 4, edh);

    // Horizontal leg with toes pointing UP
    // The leg comes out horizontally from the dark gap at floor level
    // Thigh/upper leg disappears into darkness (connected to unseen body)
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(edx + 2, edy + edh - 14, 14, 10); // upper part going into door

    // Shin - horizontal, continuous with above
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx + 14, edy + edh - 12, 20, 10);

    // Ankle
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(edx + 32, edy + edh - 13, 6, 11);

    // Foot - toes pointing UP (foot is on its side/back, toes skyward)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx + 36, edy + edh - 12, 12, 10); // heel area
    // Toes pointing upward
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx + 37, edy + edh - 22, 10, 12); // top of foot going up
    ctx.fillStyle = '#c89870';
    // Individual toes (pointing up)
    ctx.fillRect(edx + 37, edy + edh - 26, 3, 6);
    ctx.fillRect(edx + 40, edy + edh - 27, 3, 6);
    ctx.fillRect(edx + 43, edy + edh - 26, 3, 6);
    ctx.fillRect(edx + 46, edy + edh - 24, 2, 5);

    // Blood pool on floor beneath the leg
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(edx + 10, edy + edh, 40, 5);
    ctx.fillStyle = '#660000';
    ctx.fillRect(edx + 16, edy + edh + 4, 28, 3);

    if (nearDoor === index) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(edx - 6, edy - 6, edw + 12, edh + 14);
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
    // Full rendering: close-up of the ajar door with horizontal leg, toes up
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    // Floor
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(0, cy + 20, WIDTH, HEIGHT - cy - 20);
    for (let x = 0; x < WIDTH; x += 28) {
        ctx.fillStyle = COLORS.carpetPattern;
        ctx.fillRect(x + 4, cy + 30, 10, 10);
    }

    // Large door
    const doorX = cx - 70;
    const doorY = cy - 110;
    const doorW = 140;
    const doorH = 180;

    // Frame
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(doorX - 8, doorY - 8, doorW + 16, doorH + 16);

    // Door body
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(doorX, doorY, doorW, doorH);

    // Panels
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(doorX + 10, doorY + 10, doorW - 20, 65);
    ctx.fillRect(doorX + 10, doorY + 85, doorW - 20, 65);

    // Ajar gap - darkness inside, body hidden in here
    ctx.fillStyle = '#020204';
    ctx.fillRect(doorX, doorY, 44, doorH);
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(doorX + 44, doorY, 6, doorH);

    // Hint of body shape in darkness (torso/shoulder barely visible)
    ctx.fillStyle = '#0c0810';
    ctx.fillRect(doorX + 8, doorY + 30, 30, 50);

    // THE LEG - horizontal, coming out from the gap, connected to body inside
    // Upper thigh emerging from darkness (clearly goes INTO the door)
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(doorX + 20, doorY + doorH - 40, 30, 20);

    // Leg continuous - no gap
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(doorX + 48, doorY + doorH - 38, 50, 18);

    // Knee
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(doorX + 68, doorY + doorH - 40, 14, 22);

    // Lower leg / shin
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(doorX + 95, doorY + doorH - 36, 45, 16);

    // Ankle
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(doorX + 138, doorY + doorH - 38, 12, 18);

    // Foot on its back, toes pointing UP
    ctx.fillStyle = COLORS.skin;
    // Heel/sole resting on ground
    ctx.fillRect(doorX + 148, doorY + doorH - 34, 20, 14);
    // Top of foot rising up
    ctx.fillRect(doorX + 150, doorY + doorH - 56, 16, 24);

    // Toes pointing up
    ctx.fillStyle = '#c89870';
    ctx.fillRect(doorX + 150, doorY + doorH - 64, 4, 10);
    ctx.fillRect(doorX + 155, doorY + doorH - 66, 4, 10);
    ctx.fillRect(doorX + 160, doorY + doorH - 65, 4, 10);
    ctx.fillRect(doorX + 164, doorY + doorH - 62, 3, 8);
    ctx.fillRect(doorX + 167, doorY + doorH - 59, 3, 7);

    // Blood pooling under the leg and from inside the door
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(doorX + 10, doorY + doorH - 16, 100, 8);
    ctx.fillStyle = '#6b0000';
    ctx.fillRect(doorX + 30, doorY + doorH - 9, 70, 5);
    ctx.fillStyle = '#4b0000';
    ctx.fillRect(doorX + 50, doorY + doorH - 5, 40, 4);

    // Blood dripping from leg
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(doorX + 80, doorY + doorH - 20, 3, 14);
    ctx.fillRect(doorX + 110, doorY + doorH - 22, 2, 12);
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

    const f = player.facing;
    if (f === 'up') drawPlayerBack(px, pyScreen, bounce, legSwing, armSwing);
    else if (f === 'down') drawPlayerFront(px, pyScreen, bounce, legSwing, armSwing);
    else if (f === 'left') drawPlayerSide(px, pyScreen, bounce, legSwing, armSwing, -1);
    else drawPlayerSide(px, pyScreen, bounce, legSwing, armSwing, 1);
}

function drawPlayerBack(px, py, bounce, legSwing, armSwing) {
    const b = bounce;

    // Legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    // Butt / speedo (back view - thong style)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 22 + b, 14, 6); // butt cheeks
    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 4, py + 20 + b, 16, 3); // waistband
    ctx.fillStyle = COLORS.speedoShade;
    ctx.fillRect(px + 10, py + 22 + b, 4, 6); // thong back
    // Cheek definition
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 24 + b, 1, 3);

    // Midriff
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 16 + b, 16, 5);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 7, py + 18 + b, 2, 1);
    ctx.fillRect(px + 15, py + 18 + b, 2, 1);

    // Crop top
    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 3, py + 7 + b, 18, 10);
    ctx.fillStyle = COLORS.croptopShade;
    ctx.fillRect(px + 3, py + 15 + b, 18, 2);

    // Arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 1, py + 8 + b + armSwing, 3, 12);
    ctx.fillRect(px + 20, py + 8 + b - armSwing, 3, 12);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py - 2 + b, 12, 10);
    // Hair
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 5, py - 6 + b, 14, 6);
    ctx.fillRect(px + 6, py - 8 + b, 12, 3);
    ctx.fillRect(px + 4, py - 4 + b, 3, 5);
    ctx.fillRect(px + 17, py - 4 + b, 3, 5);
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
    ctx.fillRect(px + 5, py + 21 + b, 14, 7);
    ctx.fillStyle = COLORS.speedoShade;
    ctx.fillRect(px + 5, py + 21 + b, 14, 2);
    // V waistband
    ctx.fillRect(px + 4, py + 20 + b, 4, 2);
    ctx.fillRect(px + 16, py + 20 + b, 4, 2);

    // Midriff
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 16 + b, 16, 6);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 10, py + 17 + b, 1, 3);
    ctx.fillRect(px + 13, py + 17 + b, 1, 3);

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
    ctx.fillStyle = '#446';
    ctx.fillRect(px + 8, py + 1 + b, 2, 1);
    ctx.fillRect(px + 14, py + 1 + b, 2, 1);
    // Smile
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 9, py + 5 + b, 6, 2);
}

function drawPlayerSide(px, py, bounce, legSwing, armSwing, dir) {
    const b = bounce;

    // Legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 26 + b, 5, 10 + legSwing);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 26 + b, 5, 10 - legSwing);

    // Butt (side view - protruding)
    ctx.fillStyle = COLORS.skin;
    const buttX = dir === 1 ? px + 4 : px + 14;
    ctx.fillRect(buttX, py + 21 + b, 7, 7);
    // Speedo
    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 6, py + 21 + b, 12, 6);
    ctx.fillStyle = COLORS.speedoShade;
    ctx.fillRect(px + 6, py + 21 + b, 12, 2);

    // Midriff
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 16 + b, 12, 6);

    // Crop top
    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 5, py + 7 + b, 14, 10);
    ctx.fillStyle = COLORS.croptopShade;
    ctx.fillRect(px + 5, py + 15 + b, 14, 2);

    // Arm
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 8 + b + armSwing, 3, 12);

    // Head
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
    // Nose
    ctx.fillStyle = COLORS.skin;
    const noseX = dir === 1 ? px + 17 : px + 5;
    ctx.fillRect(noseX, py + 2 + b, 2, 3);
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
    if (newY < 60) newY = 60;
    if (newY > HALL_LENGTH - player.height - 10) newY = HALL_LENGTH - player.height - 10;

    // No door collision needed since doors are recessed into walls
    // but block the end door area
    const endDoor = doors[4];
    const endRect = { x: endDoor.x - 4, y: endDoor.y, w: 64, h: 70 };
    if (!(newX + player.width < endRect.x || newX > endRect.x + endRect.w ||
          newY + player.height < endRect.y || newY > endRect.y + endRect.h)) {
        // blocked by end door - try axis sliding
        const xOnly = !(player.x + player.width < endRect.x || player.x > endRect.x + endRect.w ||
                       newY + player.height < endRect.y || newY > endRect.y + endRect.h);
        const yOnly = !(newX + player.width < endRect.x || newX > endRect.x + endRect.w ||
                       player.y + player.height < endRect.y || player.y > endRect.y + endRect.h);
        if (!yOnly) newX = player.x;
        if (!xOnly) newY = player.y;
        if (xOnly && yOnly) { newX = player.x; newY = player.y; }
    }

    player.x = newX;
    player.y = newY;

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
        let dcx, dcy;
        if (door.side === 'end') {
            dcx = door.x + 28;
            dcy = door.y + 35;
        } else if (door.side === 'left') {
            dcx = HALL_LEFT;
            dcy = door.y + DOOR_H / 2;
        } else {
            dcx = HALL_RIGHT;
            dcy = door.y + DOOR_H / 2;
        }
        const dist = Math.sqrt((dcx - pcx) ** 2 + (dcy - pcy) ** 2);
        if (dist < 55) { nearDoor = i; break; }
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
