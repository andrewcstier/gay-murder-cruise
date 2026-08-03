const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dialogBox = document.getElementById('dialog-box');
const promptEl = document.getElementById('prompt');
const titleScreen = document.getElementById('title-screen');
const gameOverScreen = document.getElementById('game-over');

const TILE = 16;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Game state
let gameState = 'title'; // title, playing, dialog, gameover
let player = { x: 40, y: HEIGHT / 2 - 12, width: 16, height: 24, speed: 2, frame: 0, facing: 'right', animTimer: 0 };
let nearDoor = null;
let currentDialog = '';

// Colors
const COLORS = {
    wall: '#2a1a3a',
    wallAccent: '#3d2a5c',
    floor: '#1a1a2e',
    floorTile: '#222244',
    carpet: '#4a0e2e',
    carpetPattern: '#5c1438',
    door: '#8B4513',
    doorFrame: '#d4a574',
    doorKnob: '#ffd700',
    skin: '#d4a076',
    speedo: '#ff1493',
    croptop: '#00ccff',
    hair: '#3a2a1a',
};

// Door definitions
const doors = [
    { x: 120, y: 40, side: 'top', sign: '"Birthday Bitch" 🎂', color: '#ff69b4' },
    { x: 240, y: 40, side: 'top', sign: '"The door\'s unlocked, come on in ;-)"', color: '#9b59b6' },
    { x: 120, y: HEIGHT - 72, side: 'bottom', sign: '"No clothes beyond this point" 😈', color: '#e74c3c' },
    { x: 240, y: HEIGHT - 72, side: 'bottom', sign: '"Beware of twink (he bites)" 😬', color: '#f39c12' },
    { x: WIDTH - 56, y: HEIGHT / 2 - 24, side: 'right', sign: 'The door is ajar... you see a foot hanging out.', color: '#2c3e50', ajar: true, dead: true },
];

// Input
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (gameState === 'title' && e.key === 'Enter') {
        gameState = 'playing';
        titleScreen.style.display = 'none';
    }
    if (gameState === 'dialog' && (e.key === 'Escape' || e.key === 'e' || e.key === 'Enter')) {
        if (currentDoorIsDead) {
            gameState = 'gameover';
            gameOverScreen.classList.add('visible');
            dialogBox.classList.remove('visible');
        } else {
            gameState = 'playing';
            dialogBox.classList.remove('visible');
        }
    }
    if (gameState === 'playing' && e.key.toLowerCase() === 'e' && nearDoor !== null) {
        gameState = 'dialog';
        currentDialog = doors[nearDoor].sign;
        currentDoorIsDead = doors[nearDoor].dead || false;
        if (currentDoorIsDead) {
            dialogBox.innerHTML = '<span style="color:#ff4444">You\'ve discovered a dead body!!</span><br><br><span style="color:#aaa">Press ENTER to continue...</span>';
        } else {
            dialogBox.innerHTML = currentDialog + '<br><br><span style="color:#aaa">Press ESC to close</span>';
        }
        dialogBox.classList.add('visible');
        promptEl.classList.remove('visible');
    }
    if (gameState === 'gameover' && e.key === 'Enter') {
        location.reload();
    }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

let currentDoorIsDead = false;

function drawWalls() {
    // Top wall
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, 0, WIDTH, 64);
    // Wall pattern
    for (let x = 0; x < WIDTH; x += 32) {
        ctx.fillStyle = COLORS.wallAccent;
        ctx.fillRect(x, 0, 2, 64);
        ctx.fillRect(x, 30, 32, 2);
    }
    // Wainscoting
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(0, 56, WIDTH, 8);

    // Bottom wall
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, HEIGHT - 64, WIDTH, 64);
    for (let x = 0; x < WIDTH; x += 32) {
        ctx.fillStyle = COLORS.wallAccent;
        ctx.fillRect(x, HEIGHT - 64, 2, 64);
        ctx.fillRect(x, HEIGHT - 34, 32, 2);
    }
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(0, HEIGHT - 64, WIDTH, 8);

    // Right wall (end of hallway)
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(WIDTH - 32, 64, 32, HEIGHT - 128);
    for (let y = 64; y < HEIGHT - 64; y += 32) {
        ctx.fillStyle = COLORS.wallAccent;
        ctx.fillRect(WIDTH - 32, y, 32, 2);
    }
}

function drawFloor() {
    // Carpet runner
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(0, 64, WIDTH - 32, HEIGHT - 128);

    // Carpet pattern
    for (let x = 0; x < WIDTH - 32; x += 24) {
        for (let y = 64; y < HEIGHT - 64; y += 24) {
            ctx.fillStyle = COLORS.carpetPattern;
            ctx.fillRect(x + 4, y + 4, 8, 8);
            ctx.fillRect(x + 14, y + 14, 6, 6);
        }
    }

    // Floor edges
    ctx.fillStyle = COLORS.floorTile;
    ctx.fillRect(0, 64, WIDTH - 32, 4);
    ctx.fillRect(0, HEIGHT - 68, WIDTH - 32, 4);
}

function drawDoor(door, index) {
    let dx = door.x;
    let dy = door.y;
    let dw = 40;
    let dh = 56;

    if (door.side === 'right') {
        dw = 32;
        dh = 48;
    }

    // Door frame
    ctx.fillStyle = COLORS.doorFrame;
    ctx.fillRect(dx - 3, dy - 3, dw + 6, dh + 6);

    // Door
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(dx, dy, dw, dh);

    // Door panels
    ctx.fillStyle = '#6d3a0a';
    ctx.fillRect(dx + 4, dy + 4, dw - 8, 20);
    ctx.fillRect(dx + 4, dy + 28, dw - 8, 24);

    // Doorknob
    ctx.fillStyle = COLORS.doorKnob;
    if (door.side === 'top') {
        ctx.fillRect(dx + dw - 10, dy + dh - 20, 4, 4);
    } else if (door.side === 'bottom') {
        ctx.fillRect(dx + dw - 10, dy + 16, 4, 4);
    } else {
        ctx.fillRect(dx + 4, dy + dh / 2, 4, 4);
    }

    // Ajar door effect
    if (door.ajar) {
        ctx.fillStyle = '#111';
        ctx.fillRect(dx + 4, dy + 4, 12, dh - 8);
        // Foot
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(dx + 2, dy + dh - 12, 14, 6);
        ctx.fillStyle = '#333';
        ctx.fillRect(dx + 2, dy + dh - 14, 14, 3);
    }

    // Sign indicator (small colored square above door)
    ctx.fillStyle = door.color;
    if (door.side === 'top') {
        ctx.fillRect(dx + dw / 2 - 8, dy - 8, 16, 6);
    } else if (door.side === 'bottom') {
        ctx.fillRect(dx + dw / 2 - 8, dy + dh + 2, 16, 6);
    }

    // Highlight if near
    if (nearDoor === index) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx - 5, dy - 5, dw + 10, dh + 10);
    }
}

function drawPlayer() {
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);

    // Bounce animation
    const bounce = Math.sin(player.animTimer * 0.15) * (isMoving() ? 2 : 0);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(px - 1, py + player.height - 2, player.width + 2, 4);

    // Legs
    ctx.fillStyle = COLORS.skin;
    const legOffset = isMoving() ? Math.sin(player.animTimer * 0.2) * 2 : 0;
    ctx.fillRect(px + 3, py + 16 + bounce, 4, 8);
    ctx.fillRect(px + 9, py + 16 + bounce + legOffset, 4, 8);

    // Speedo
    ctx.fillStyle = COLORS.speedo;
    ctx.fillRect(px + 2, py + 14 + bounce, 12, 5);

    // Torso (skin showing between speedo and crop top)
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 2, py + 10 + bounce, 12, 5);

    // Crop top
    ctx.fillStyle = COLORS.croptop;
    ctx.fillRect(px + 1, py + 4 + bounce, 14, 7);

    // Arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px - 1, py + 5 + bounce, 3, 8);
    ctx.fillRect(px + 14, py + 5 + bounce, 3, 8);

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(px + 3, py - 2 + bounce, 10, 7);

    // Hair
    ctx.fillStyle = COLORS.hair;
    ctx.fillRect(px + 3, py - 4 + bounce, 10, 4);
    ctx.fillRect(px + 2, py - 3 + bounce, 2, 3);

    // Sunglasses
    ctx.fillStyle = '#111';
    if (player.facing === 'right') {
        ctx.fillRect(px + 7, py + bounce, 5, 3);
    } else if (player.facing === 'left') {
        ctx.fillRect(px + 4, py + bounce, 5, 3);
    } else {
        ctx.fillRect(px + 4, py + bounce, 8, 3);
    }
}

function isMoving() {
    return keys['arrowleft'] || keys['arrowright'] || keys['arrowup'] || keys['arrowdown'] ||
           keys['a'] || keys['d'] || keys['w'] || keys['s'];
}

function update() {
    if (gameState !== 'playing') return;

    let moved = false;
    const prevX = player.x;
    const prevY = player.y;

    if (keys['arrowleft'] || keys['a']) { player.x -= player.speed; player.facing = 'left'; moved = true; }
    if (keys['arrowright'] || keys['d']) { player.x += player.speed; player.facing = 'right'; moved = true; }
    if (keys['arrowup'] || keys['w']) { player.y -= player.speed; player.facing = 'up'; moved = true; }
    if (keys['arrowdown'] || keys['s']) { player.y += player.speed; player.facing = 'down'; moved = true; }

    // Bounds
    if (player.x < 4) player.x = 4;
    if (player.x > WIDTH - 52) player.x = WIDTH - 52;
    if (player.y < 68) player.y = 68;
    if (player.y > HEIGHT - 92) player.y = HEIGHT - 92;

    if (moved) player.animTimer++;

    // Check proximity to doors
    nearDoor = null;
    for (let i = 0; i < doors.length; i++) {
        const door = doors[i];
        const doorCenterX = door.x + 20;
        const doorCenterY = door.y + 28;
        const playerCenterX = player.x + 8;
        const playerCenterY = player.y + 12;
        const dist = Math.sqrt((doorCenterX - playerCenterX) ** 2 + (doorCenterY - playerCenterY) ** 2);
        if (dist < 45) {
            nearDoor = i;
            break;
        }
    }

    if (nearDoor !== null) {
        promptEl.classList.add('visible');
    } else {
        promptEl.classList.remove('visible');
    }
}

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    drawFloor();
    drawWalls();

    // Draw doors
    for (let i = 0; i < doors.length; i++) {
        drawDoor(doors[i], i);
    }

    // Draw player
    drawPlayer();

    // Hallway lighting effect
    const gradient = ctx.createRadialGradient(player.x + 8, player.y + 12, 30, player.x + 8, player.y + 12, 150);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 64, WIDTH - 32, HEIGHT - 128);

    // Wall sconces (lights)
    for (let x = 80; x < WIDTH - 40; x += 160) {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x, 58, 6, 6);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(x + 3, 64, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x, HEIGHT - 64, 6, 6);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(x + 3, HEIGHT - 64, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
