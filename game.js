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
    { y: 600, side: 'right', sign: 'The door\'s unlocked,\ncome on in ;-)', color: '#9b59b6' },
    { y: 300, side: 'right', sign: 'Beware of twink\n(he bites) \u{1F62C}', color: '#f39c12' },
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
    // End door on north wall, ajar with leg sticking out
    // Draw order: 1) dark gap  2) leg on top  3) door covering right half
    const edw = 56;
    const edh = 66;
    const edx = WIDTH / 2 - edw / 2;
    const edy = sy(-10);

    if (edy > HEIGHT + 20 || edy + edh < -40) return;

    // Frame (behind everything)
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(edx - 4, edy - 4, edw + 8, edh + 8);

    // 1) DARK GAP (the open doorway - full door width, darkness behind)
    ctx.fillStyle = '#030305';
    ctx.fillRect(edx, edy, edw, edh);

    // 2) LEG on top of the dark gap - extends from right to left
    const legY = edy + edh - 10;

    // Thigh (rightmost - disappears behind the door)
    ctx.fillStyle = COLORS.jeans;
    ctx.fillRect(edx + 34, legY, 24, 12);

    // More thigh
    ctx.fillStyle = COLORS.jeans;
    ctx.fillRect(edx + 20, legY, 16, 12);

    // Knee
    ctx.fillStyle = COLORS.jeansDark;
    ctx.fillRect(edx + 14, legY + 1, 8, 11);

    // Shin in jeans
    ctx.fillStyle = COLORS.jeans;
    ctx.fillRect(edx, legY + 2, 16, 10);

    // Ankle
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx - 4, legY + 3, 6, 9);

    // Foot pointing UP (leftmost, furthest from door)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(edx - 10, legY - 8, 8, 12); // foot base
    ctx.fillRect(edx - 12, legY - 14, 10, 8); // top of foot / toes

    // 3) DOOR (closed portion) - covers the RIGHT half only
    // This makes the leg appear to come from behind the door's edge
    const doorCoverX = edx + edw / 2 - 4; // door covers right half
    const doorCoverW = edw / 2 + 4;

    ctx.fillStyle = COLORS.door;
    ctx.fillRect(doorCoverX, edy, doorCoverW, edh);
    // Panels on the closed portion
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(doorCoverX + 4, edy + 5, doorCoverW - 8, 26);
    ctx.fillRect(doorCoverX + 4, edy + 36, doorCoverW - 8, 26);
    // Doorknob
    ctx.fillStyle = COLORS.doorKnob;
    ctx.fillRect(doorCoverX + 4, edy + edh / 2, 4, 4);
    // Edge shadow where door meets the opening
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(doorCoverX - 2, edy, 3, edh);

    if (nearDoor === index) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(edx - 16, edy - 6, edw + 22, edh + 14);
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
    // Close-up render. Layer order: 1) dark gap  2) leg  3) door covering right half
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    // Floor
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(0, cy + 30, WIDTH, HEIGHT - cy - 30);
    for (let x = 0; x < WIDTH; x += 28) {
        ctx.fillStyle = COLORS.carpetPattern;
        ctx.fillRect(x + 4, cy + 40, 10, 10);
    }

    const doorX = cx - 80;
    const doorY = cy - 120;
    const doorW = 160;
    const doorH = 200;

    // Wall around door
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, doorY - 20, WIDTH, doorH + 50);

    // Floor in front
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(doorX - 40, doorY + doorH, doorW + 80, 40);

    // Frame
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(doorX - 8, doorY - 8, doorW + 16, doorH + 16);

    // 1) DARK GAP (full doorway opening - darkness inside the room)
    ctx.fillStyle = '#020204';
    ctx.fillRect(doorX, doorY, doorW, doorH);

    // 2) LEG on top of the gap - horizontal, jeans, foot pointing up
    const legFloorY = doorY + doorH - 6;

    // Thigh (rightmost, will be covered by door)
    ctx.fillStyle = COLORS.jeans;
    ctx.fillRect(doorX + 126, legFloorY, 40, 24);
    // More thigh
    ctx.fillStyle = COLORS.jeans;
    ctx.fillRect(doorX + 68, legFloorY + 2, 60, 22);
    ctx.fillStyle = COLORS.jeansDark;
    ctx.fillRect(doorX + 68, legFloorY + 12, 60, 2);

    // Knee
    ctx.fillStyle = COLORS.jeansDark;
    ctx.fillRect(doorX + 52, legFloorY + 1, 18, 23);
    ctx.fillStyle = '#162840';
    ctx.fillRect(doorX + 56, legFloorY + 8, 10, 3);

    // Shin in jeans
    ctx.fillStyle = COLORS.jeans;
    ctx.fillRect(doorX + 4, legFloorY + 3, 50, 20);
    ctx.fillStyle = COLORS.jeansDark;
    ctx.fillRect(doorX + 4, legFloorY + 12, 50, 2);

    // Jean cuff
    ctx.fillStyle = COLORS.jeansDark;
    ctx.fillRect(doorX - 4, legFloorY + 4, 10, 18);

    // Ankle (skin)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(doorX - 14, legFloorY + 5, 12, 16);

    // FOOT pointing UP (leftmost - far from door)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(doorX - 26, legFloorY + 2, 14, 20); // heel on floor
    ctx.fillRect(doorX - 28, legFloorY - 22, 12, 26); // foot rising up
    ctx.fillRect(doorX - 30, legFloorY - 30, 14, 10); // toes at top

    // 3) DOOR (closed portion) covers RIGHT half only
    // The leg appears to emerge from behind the door's left edge
    const doorCoverX = doorX + doorW / 2 - 10;
    const doorCoverW = doorW / 2 + 10;

    ctx.fillStyle = COLORS.door;
    ctx.fillRect(doorCoverX, doorY, doorCoverW, doorH);
    // Panels
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(doorCoverX + 8, doorY + 10, doorCoverW - 16, 70);
    ctx.fillRect(doorCoverX + 8, doorY + 90, doorCoverW - 16, 70);
    // Doorknob (on the left edge of the closed door, facing the opening)
    ctx.fillStyle = COLORS.doorKnob;
    ctx.fillRect(doorCoverX + 6, doorY + doorH / 2, 6, 6);
    // Shadow edge where door meets the opening
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(doorCoverX - 3, doorY, 4, doorH);
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
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 22 + b, 14, 6);
    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 4, py + 20 + b, 16, 3);
    ctx.fillStyle = COLORS.speedoShade;
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
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 5, py - 6 + b, 14, 6);
    ctx.fillRect(px + 6, py - 8 + b, 12, 3);
    ctx.fillRect(px + 4, py - 4 + b, 3, 5);
    ctx.fillRect(px + 17, py - 4 + b, 3, 5);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 9, py + 6 + b, 6, 3);
}

function drawPlayerFront(px, py, bounce, legSwing, armSwing) {
    const b = bounce;
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 6, py + 26 + b, 5, 10 + legSwing);
    ctx.fillRect(px + 13, py + 26 + b, 5, 10 - legSwing);

    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 5, py + 21 + b, 14, 7);
    ctx.fillStyle = COLORS.speedoShade;
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
    ctx.fillStyle = COLORS.hair;
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

function drawPlayerSide(px, py, bounce, legSwing, armSwing, dir) {
    const b = bounce;
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 8, py + 26 + b, 5, 10 + legSwing);
    ctx.fillStyle = COLORS.skinShadow;
    ctx.fillRect(px + 11, py + 26 + b, 5, 10 - legSwing);

    ctx.fillStyle = COLORS.skin;
    const buttX = dir === 1 ? px + 4 : px + 14;
    ctx.fillRect(buttX, py + 21 + b, 7, 7);
    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 6, py + 21 + b, 12, 6);
    ctx.fillStyle = COLORS.speedoShade;
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
    ctx.fillStyle = COLORS.hair;
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
