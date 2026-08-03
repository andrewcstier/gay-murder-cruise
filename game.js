const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dialogBox = document.getElementById('dialog-box');
const promptEl = document.getElementById('prompt');
const titleScreen = document.getElementById('title-screen');
const gameOverScreen = document.getElementById('game-over');
const musicToggle = document.getElementById('music-toggle');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Vertical hallway dimensions
const HALL_WIDTH = 160;
const HALL_LEFT = (WIDTH - HALL_WIDTH) / 2;
const HALL_RIGHT = HALL_LEFT + HALL_WIDTH;
const HALL_LENGTH = 900;

// Camera
let camera = { y: 0 };

// Game state
let gameState = 'title';
let player = { x: WIDTH / 2 - 12, y: HALL_LENGTH - 60, width: 24, height: 36, speed: 2.2, facing: 'up', animTimer: 0 };
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
    speedo: '#ff1493',
    croptop: '#00ccff',
    hair: '#3a2a1a',
    sign: '#f5f0e0',
    signBorder: '#8B4513',
};

// Doors: two on left, two on right, one at the far north end
const DOOR_W = 48;
const DOOR_H = 64;
const doors = [
    { x: HALL_LEFT - 4, y: 680, side: 'left', sign: 'Birthday Bitch \u{1F382}', color: '#ff69b4' },
    { x: HALL_LEFT - 4, y: 420, side: 'left', sign: 'No clothes beyond\nthis point \u{1F608}', color: '#e74c3c' },
    { x: HALL_RIGHT - DOOR_W + 4, y: 600, side: 'right', sign: 'The door\'s unlocked,\ncome on in ;-)', color: '#9b59b6' },
    { x: HALL_RIGHT - DOOR_W + 4, y: 340, side: 'right', sign: 'Beware of twink\n(he bites) \u{1F62C}', color: '#f39c12' },
    { x: WIDTH / 2 - DOOR_W / 2, y: 40, side: 'end', sign: null, color: '#2c3e50', ajar: true, dead: true },
];

// Input
const keys = {};
let anyKeyPressed = false;

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    anyKeyPressed = true;
    handleAction(e.key);
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function handleAction(key) {
    if (gameState === 'title' && (key === 'Enter' || key === 'tap' || key === ' ')) {
        startGame();
        return;
    }
    if (gameState === 'dialog') {
        closeDialog();
        return;
    }
    if (gameState === 'playing' && (key.toLowerCase() === 'e' || key === ' ' || key === 'examine') && nearDoor !== null) {
        openDoorDialog();
        return;
    }
    if (gameState === 'gameover' && (key === 'Enter' || key === 'tap' || key === ' ')) {
        location.reload();
    }
}

function startGame() {
    gameState = 'playing';
    titleScreen.style.display = 'none';
    if (musicEnabled) {
        GameMusic.startMusic();
    }
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
        dialogBox.innerHTML = '<span style="color:#ffcc00;">Sign reads:</span><br><br>"' + sign + '"<br><br><span style="color:#aaa">Press any key to close</span>';
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
    e.preventDefault();
    btnExamine.classList.add('active');
    if (gameState === 'dialog') { closeDialog(); }
    else { handleAction('examine'); }
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
    if (musicEnabled && gameState === 'playing') { GameMusic.startMusic(); }
    else { GameMusic.stopMusic(); }
});

// Drawing

function screenY(worldY) {
    return worldY - camera.y;
}

function drawHallway() {
    // Dark background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Left wall
    const wallStartY = Math.max(0, screenY(0));
    const wallEndY = Math.min(HEIGHT, screenY(HALL_LENGTH));

    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, wallStartY, HALL_LEFT, wallEndY - wallStartY);
    // Right wall
    ctx.fillRect(HALL_RIGHT, wallStartY, WIDTH - HALL_RIGHT, wallEndY - wallStartY);

    // Wall texture
    for (let wy = 0; wy < HALL_LENGTH; wy += 40) {
        const sy = screenY(wy);
        if (sy < -40 || sy > HEIGHT) continue;
        ctx.fillStyle = COLORS.wallAccent;
        ctx.fillRect(0, sy, HALL_LEFT, 2);
        ctx.fillRect(HALL_RIGHT, sy, WIDTH - HALL_RIGHT, 2);
    }
    // Vertical trim lines
    ctx.fillStyle = COLORS.wallTrim;
    ctx.fillRect(HALL_LEFT - 6, wallStartY, 6, wallEndY - wallStartY);
    ctx.fillRect(HALL_RIGHT, wallStartY, 6, wallEndY - wallStartY);

    // Carpet
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(HALL_LEFT, wallStartY, HALL_WIDTH, wallEndY - wallStartY);

    // Carpet pattern
    for (let cy = 0; cy < HALL_LENGTH; cy += 28) {
        const sy = screenY(cy);
        if (sy < -28 || sy > HEIGHT) continue;
        for (let cx = HALL_LEFT + 10; cx < HALL_RIGHT - 10; cx += 28) {
            ctx.fillStyle = COLORS.carpetPattern;
            ctx.fillRect(cx, sy, 10, 10);
            ctx.fillStyle = COLORS.carpetEdge;
            ctx.fillRect(cx + 14, sy + 14, 8, 8);
        }
    }

    // Carpet runner edges
    ctx.fillStyle = '#6a1a3e';
    ctx.fillRect(HALL_LEFT + 4, wallStartY, 3, wallEndY - wallStartY);
    ctx.fillRect(HALL_RIGHT - 7, wallStartY, 3, wallEndY - wallStartY);

    // North wall
    const northWallY = screenY(0);
    if (northWallY > -20) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(HALL_LEFT, northWallY - 20, HALL_WIDTH, 20);
        ctx.fillStyle = COLORS.wallTrim;
        ctx.fillRect(HALL_LEFT, northWallY - 4, HALL_WIDTH, 4);
    }

    // South wall
    const southWallY = screenY(HALL_LENGTH);
    if (southWallY < HEIGHT + 20) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(HALL_LEFT, southWallY, HALL_WIDTH, 20);
        ctx.fillStyle = COLORS.wallTrim;
        ctx.fillRect(HALL_LEFT, southWallY, HALL_WIDTH, 4);
    }

    // Wall sconces
    for (let wy = 100; wy < HALL_LENGTH; wy += 200) {
        const sy = screenY(wy);
        if (sy < -20 || sy > HEIGHT + 20) continue;
        // Left sconce
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(HALL_LEFT - 4, sy, 5, 5);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.12)';
        ctx.beginPath();
        ctx.arc(HALL_LEFT, sy + 2, 25, 0, Math.PI * 2);
        ctx.fill();
        // Right sconce
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(HALL_RIGHT - 1, sy, 5, 5);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.12)';
        ctx.beginPath();
        ctx.arc(HALL_RIGHT, sy + 2, 25, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawDoor(door, index) {
    const sy = screenY(door.y);
    if (sy < -DOOR_H - 30 || sy > HEIGHT + 30) return;

    const dx = door.x;
    const dy = sy;

    if (door.side === 'end') {
        // End door (north wall)
        const edw = 56;
        const edh = 72;
        const edx = dx - 4;
        const edy = dy;

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

        // Ajar gap with darkness
        ctx.fillStyle = '#050508';
        ctx.fillRect(edx, edy, 20, edh);

        // The foot - very obvious
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(edx - 4, edy + edh - 8, 24, 10);
        // Toes
        ctx.fillRect(edx - 8, edy + edh - 6, 6, 6);
        // Ankle
        ctx.fillStyle = '#c4906a';
        ctx.fillRect(edx + 12, edy + edh - 14, 8, 10);
        // Leg going into darkness
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(edx + 10, edy + edh - 20, 10, 8);
        // Blood pool
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(edx - 6, edy + edh + 2, 30, 4);
        ctx.fillStyle = '#6b0000';
        ctx.fillRect(edx - 2, edy + edh + 5, 20, 3);

        // Highlight if near
        if (nearDoor === index) {
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.strokeRect(edx - 6, edy - 6, edw + 12, edh + 16);
        }
        return;
    }

    // Regular side doors
    // Frame
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(dx - 3, dy - 3, DOOR_W + 6, DOOR_H + 6);

    // Door body
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(dx, dy, DOOR_W, DOOR_H);

    // Panels
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(dx + 4, dy + 4, DOOR_W - 8, 24);
    ctx.fillRect(dx + 4, dy + 34, DOOR_W - 8, 26);

    // Doorknob
    ctx.fillStyle = COLORS.doorKnob;
    if (door.side === 'left') {
        ctx.fillRect(dx + DOOR_W - 12, dy + DOOR_H / 2 - 2, 5, 5);
    } else {
        ctx.fillRect(dx + 7, dy + DOOR_H / 2 - 2, 5, 5);
    }

    // Sign on door
    const signW = 38;
    const signH = 24;
    const signX = dx + (DOOR_W - signW) / 2;
    const signY = dy + 6;

    ctx.fillStyle = COLORS.sign;
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = COLORS.signBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(signX, signY, signW, signH);

    // Sign text indicator (colored stripe matching door theme)
    ctx.fillStyle = door.color;
    ctx.fillRect(signX + 3, signY + 3, signW - 6, 4);
    ctx.fillRect(signX + 3, signY + 10, signW - 6, 3);
    ctx.fillRect(signX + 3, signY + 16, signW - 12, 3);

    // "READ ME" indicator
    ctx.fillStyle = '#333';
    ctx.fillRect(signX + 8, signY + signH - 5, 22, 3);

    // Highlight if near
    if (nearDoor === index) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx - 5, dy - 5, DOOR_W + 10, DOOR_H + 10);

        // Floating arrow
        const arrowBob = Math.sin(Date.now() * 0.005) * 3;
        ctx.fillStyle = '#ffcc00';
        const arrowX = dx + DOOR_W / 2;
        const arrowY = dy - 14 + arrowBob;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY + 8);
        ctx.lineTo(arrowX - 5, arrowY);
        ctx.lineTo(arrowX + 5, arrowY);
        ctx.fill();
    }
}

function drawPlayer() {
    const px = Math.floor(player.x);
    const py = Math.floor(screenY(player.y));
    const w = player.width;
    const h = player.height;

    const moving = isMoving();
    const bounce = Math.sin(player.animTimer * 0.15) * (moving ? 2 : 0);
    const legSwing = moving ? Math.sin(player.animTimer * 0.2) * 3 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px + w / 2, py + h, w / 2 + 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py + 24 + bounce, 5, 12 - legSwing);
    ctx.fillRect(px + 14, py + 24 + bounce, 5, 12 + legSwing);

    // Feet
    ctx.fillStyle = '#e8c090';
    ctx.fillRect(px + 4, py + h - 3, 6, 3);
    ctx.fillRect(px + 14, py + h - 3 + legSwing, 6, 3);

    // Speedo
    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 3, py + 22 + bounce, 18, 6);
    // Speedo detail
    ctx.fillStyle = '#cc0077';
    ctx.fillRect(px + 3, py + 22 + bounce, 18, 2);

    // Midriff (exposed skin)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 4, py + 16 + bounce, 16, 7);

    // Crop top
    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 2, py + 7 + bounce, 20, 10);
    // Crop top detail (neckline)
    ctx.fillStyle = '#0099cc';
    ctx.fillRect(px + 6, py + 7 + bounce, 12, 2);
    // Crop top bottom hem
    ctx.fillStyle = '#00ddff';
    ctx.fillRect(px + 2, py + 15 + bounce, 20, 2);

    // Arms
    ctx.fillStyle = COLORS.skin;
    const armSwing = moving ? Math.sin(player.animTimer * 0.18) * 2 : 0;
    ctx.fillRect(px, py + 8 + bounce + armSwing, 4, 12);
    ctx.fillRect(px + w - 4, py + 8 + bounce - armSwing, 4, 12);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 5, py - 3 + bounce, 14, 11);

    // Jawline
    ctx.fillStyle = '#c4906a';
    ctx.fillRect(px + 5, py + 5 + bounce, 14, 3);

    // Hair (styled up)
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 4, py - 7 + bounce, 16, 6);
    ctx.fillRect(px + 6, py - 9 + bounce, 12, 3);
    // Side hair
    ctx.fillRect(px + 4, py - 4 + bounce, 3, 5);
    ctx.fillRect(px + 17, py - 4 + bounce, 3, 5);

    // Sunglasses
    ctx.fillStyle = '#111';
    ctx.fillRect(px + 6, py + bounce, 5, 4);
    ctx.fillRect(px + 13, py + bounce, 5, 4);
    // Bridge
    ctx.fillRect(px + 11, py + 1 + bounce, 2, 2);
    // Reflection
    ctx.fillStyle = '#335';
    ctx.fillRect(px + 7, py + 1 + bounce, 2, 1);
    ctx.fillRect(px + 14, py + 1 + bounce, 2, 1);

    // Smile (if not moving, cocky idle)
    if (!moving) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(px + 9, py + 5 + bounce, 6, 2);
    }
}

function drawDeadBodyScene() {
    // Full rendering of the foot/body scene for game over
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2 - 20;

    // Door frame
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Big door
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(cx - 80, cy - 100, 160, 200);
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(cx - 74, cy - 94, 148, 188);

    // Ajar opening
    ctx.fillStyle = '#020204';
    ctx.fillRect(cx - 74, cy - 94, 50, 188);

    // Foot and leg sticking out
    // Leg
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(cx - 50, cy + 50, 16, 40);
    // Ankle
    ctx.fillStyle = '#c4906a';
    ctx.fillRect(cx - 52, cy + 84, 20, 10);
    // Foot
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(cx - 60, cy + 90, 30, 12);
    // Toes
    ctx.fillRect(cx - 66, cy + 92, 8, 8);
    ctx.fillRect(cx - 60, cy + 94, 6, 6);

    // Blood pooling from under door
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(cx - 70, cy + 102, 60, 6);
    ctx.fillStyle = '#6b0000';
    ctx.fillRect(cx - 60, cy + 107, 40, 4);
    ctx.fillStyle = '#4b0000';
    ctx.fillRect(cx - 50, cy + 110, 25, 3);

    // Drip from foot
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(cx - 58, cy + 100, 3, 5);
}

function isMoving() {
    return keys['arrowleft'] || keys['arrowright'] || keys['arrowup'] || keys['arrowdown'] ||
           keys['a'] || keys['d'] || keys['w'] || keys['s'];
}

function update() {
    if (gameState !== 'playing') return;

    let moved = false;

    if (keys['arrowleft'] || keys['a']) { player.x -= player.speed; player.facing = 'left'; moved = true; }
    if (keys['arrowright'] || keys['d']) { player.x += player.speed; player.facing = 'right'; moved = true; }
    if (keys['arrowup'] || keys['w']) { player.y -= player.speed; player.facing = 'up'; moved = true; }
    if (keys['arrowdown'] || keys['s']) { player.y += player.speed; player.facing = 'down'; moved = true; }

    // Bounds (keep player inside hallway)
    if (player.x < HALL_LEFT + 6) player.x = HALL_LEFT + 6;
    if (player.x > HALL_RIGHT - player.width - 6) player.x = HALL_RIGHT - player.width - 6;
    if (player.y < 30) player.y = 30;
    if (player.y > HALL_LENGTH - player.height - 10) player.y = HALL_LENGTH - player.height - 10;

    if (moved) player.animTimer++;

    // Camera follows player
    camera.y = player.y - HEIGHT / 2 + player.height / 2;
    if (camera.y < -20) camera.y = -20;
    if (camera.y > HALL_LENGTH - HEIGHT + 20) camera.y = HALL_LENGTH - HEIGHT + 20;

    // Check proximity to doors
    nearDoor = null;
    const playerCX = player.x + player.width / 2;
    const playerCY = player.y + player.height / 2;
    for (let i = 0; i < doors.length; i++) {
        const door = doors[i];
        let doorCX, doorCY;
        if (door.side === 'end') {
            doorCX = door.x + DOOR_W / 2;
            doorCY = door.y + 36;
        } else {
            doorCX = door.x + DOOR_W / 2;
            doorCY = door.y + DOOR_H / 2;
        }
        const dist = Math.sqrt((doorCX - playerCX) ** 2 + (doorCY - playerCY) ** 2);
        if (dist < 55) {
            nearDoor = i;
            break;
        }
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

    // Draw doors
    for (let i = 0; i < doors.length; i++) {
        drawDoor(doors[i], i);
    }

    // Draw player
    drawPlayer();

    // Ambient lighting
    const psy = screenY(player.y);
    const gradient = ctx.createRadialGradient(player.x + 12, psy + 18, 20, player.x + 12, psy + 18, 180);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = gradient;
    ctx.fillRect(HALL_LEFT, 0, HALL_WIDTH, HEIGHT);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
