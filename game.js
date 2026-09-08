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

// Comic cutscene state
let comicPanel = 0;
let comicTimer = 0;
let comicEnteredAt = 0;

// Level 3 shop state
let l3ShopTextAlpha = 0;
let l3ShopTextPhase = 'fadein';
let l3ShopTextIndex = 0;
const L3_SHOP_THOUGHTS = ["It's that book!", "The theater should be empty by now.\nI should talk to the security guy."];
let l3ShopTimer = 0;

// Level 3 state
let l3State = 'shop-intro'; // 'shop-intro', 'free', 'chat', 'notebook', 'accuse', 'complete'
let l3Room = 'shop'; // 'shop', 'roundabout', 'theater', 'chucks-room', 'jewelry'
let l3Camera = { y: 0 };
const L3_ROUNDABOUT_HEIGHT = 700; // total height of merged roundabout+hallway room
let l3PlayerX = 228, l3PlayerY = 230, l3PlayerFacing = 'up';
let l3NearNpc = null, l3NearDoor = null;
let l3TalkedTo = { chuck: false, flint: false, aj: false };
let l3DialogIndex = { shopkeeper: 0, guard: 0, flint: 0, chuck: 0, aj: 0, blake: 0, abraham: 0, vanessa: 0 };
let l3GridUnlocked = false;
let l3DiscoveredClues = [];
let l3Notebook = {
    open: false,
    suspectItem: [['','',''],['','',''],['','','']],
    suspectPersona: [['','',''],['','',''],['','','']],
    personaItem: [['','',''],['','',''],['','','']],
    autoMarks: {},
};
let l3TalkingTo = null;
let l3AccusationOpen = false;
let l3ShopkeeperTalked = false;
let l3BookReveal = false;
let l3Typewriting = null; // { full, current, charIndex }
let l3TypeTimer = 0;
let l3Solved = false;
let l3CompleteTimer = 0;
let l3FlintWalkX = 0, l3FlintWalkY = 0, l3FlintWalkPhase = 'to-hallway'; // phases: 'to-hallway', 'to-door', 'done'
function l3sy(worldY) { return worldY - l3Camera.y; }

const L3_SUSPECTS = ['Chuck', 'Flint', 'AJ'];
const L3_ITEMS = ['Book', 'PrEP', 'Mic'];
const L3_PERSONAS = ['Jiggly', 'Mariah', 'Cher'];

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
    if (gameState === 'level2-complete') {
        dialogBox.classList.remove('visible');
        promptEl.classList.remove('visible');
        comicPanel = 0;
        comicTimer = 0;
        comicEnteredAt = Date.now();
        gameState = 'comic-cutscene';
        return;
    }
    if (gameState === 'comic-cutscene') {
        if (Date.now() - comicEnteredAt < 400) return;
        comicPanel++;
        comicEnteredAt = Date.now();
        if (comicPanel >= 15) {
            startLevel3();
        }
        return;
    }
    if (gameState === 'level3') { handleLevel3Action(key); return; }
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
    } else if (level === 3) {
        selectedChar = selectedChar || CHARACTERS[0];
        comicPanel = 0;
        comicTimer = 0;
        comicEnteredAt = Date.now();
        GameMusic.stopMusic();
        if (musicEnabled) GameMusic.startMusic('level3');
        gameState = 'comic-cutscene';
        return;
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
        else if (gameState === 'level3') GameMusic.startMusic(l3Room === 'chucks-room' || l3Room === 'roundabout' ? 'piano' : 'level3');
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

    if (gameState === 'comic-cutscene') {
        comicTimer++;
        return;
    }

    if (gameState === 'level3') {
        updateLevel3();
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

    if (gameState === 'comic-cutscene') {
        drawComicPanel(comicPanel);
        return;
    }

    if (gameState === 'level3') {
        drawLevel3();
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
        dialogBox.innerHTML = '<span style="color:#ffcc00; font-size:16px;">Level 2 Complete!</span><br><br>You solved the mystery! Vanessa had the room key in her bosoms the whole time.<br><br><span style="color:#aaa">Press any key to continue...</span>';
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
    if (gameState === 'level3') {
        if (l3AccusationOpen) return;
        if (l3State === 'chat') advanceLevel3Dialog();
        return;
    }
    if (l2AccusationOpen) return;
    if (l2State === 'chat') advanceLevel2Dialog();
});

// Notebook button
document.getElementById('notebook-btn').addEventListener('click', () => {
    if (gameState === 'level3' && l3State === 'free') { openL3Notebook(); return; }
    if (l2State === 'free' && l2HasNotebook) openNotebook();
});
document.getElementById('notebook-overlay').addEventListener('click', () => {
    if (gameState === 'level3') {
        l3Notebook.open = false;
        l3State = 'free';
        document.getElementById('notebook-overlay').style.display = 'none';
        return;
    }
    l2Notebook.open = false;
    l2State = 'free';
    document.getElementById('notebook-overlay').style.display = 'none';
});

// ═══════════════════════════════════════════════════════════════
// COMIC CUTSCENE — Between Level 2 and Level 3
// ═══════════════════════════════════════════════════════════════

const COMIC_BLUE_BAG = '#4488cc';
const COMIC_BORDER = 6;

function drawComicPanel(n) {
    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    switch (n) {
        case 0: drawComicPanel1(); break;
        case 1: drawComicPanel1b(); break;
        case 2: drawComicPanel2(); break;
        case 3: drawComicPanel3(); break;
        case 4: drawComicPanel4(); break;
        case 5: drawComicPanel4b(); break;
        case 6: drawComicPanel5(); break;
        case 7: drawComicPanel5b(); break;
        case 8: drawComicPanel6(); break;
        case 9: drawComicPanel6b(); break;
        case 10: drawComicPanel6c(); break;
        case 11: drawComicPanel7(); break;
        case 12: drawComicPanel8(); break;
        case 13: drawComicPanel8b(); break;
        case 14: drawComicPanel8c(); break;
    }

    // Thick comic border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = COMIC_BORDER;
    ctx.strokeRect(COMIC_BORDER / 2, COMIC_BORDER / 2, WIDTH - COMIC_BORDER, HEIGHT - COMIC_BORDER);

    // "TAP TO CONTINUE" prompt
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, HEIGHT - 24, WIDTH, 24);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    const promptText = isMobile() ? 'TAP LOOK TO CONTINUE' : 'PRESS LOOK TO CONTINUE';
    const blink = Math.floor(comicTimer / 30) % 2 === 0;
    if (blink) ctx.fillText(promptText, WIDTH / 2, HEIGHT - 9);
    ctx.textAlign = 'left';
}

// Helper: draw a comic speech bubble with pointed tail
function drawComicSpeechBubble(text, bx, by, bw, bh, tailX, tailY) {
    // White bubble with thick black border and rounded corners
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Tail
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const tailBase = Math.min(Math.max(tailX, bx + 15), bx + bw - 15);
    ctx.moveTo(tailBase - 8, by + bh - 1);
    ctx.lineTo(tailX, tailY);
    ctx.lineTo(tailBase + 8, by + bh - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Redraw bottom edge to hide tail base overlap
    ctx.fillStyle = '#fff';
    ctx.fillRect(tailBase - 7, by + bh - 3, 14, 4);
    // Text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], bx + 10, by + 16 + i * 14);
    }
    ctx.textAlign = 'left';
}

// Helper: draw a comic thought bubble (cloud border)
function drawComicThoughtBubble(text, bx, by, bw, bh, tailX, tailY) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    // Cloud-shaped bubble using overlapping circles
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cloud bumps along edges
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(bx + 12 + i * ((bw - 24) / 5), by, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + 12 + i * ((bw - 24) / 5), by + bh, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    // Redraw border after cloud bumps
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(bx + 12 + i * ((bw - 24) / 5), by, 7, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bx + 12 + i * ((bw - 24) / 5), by + bh, 7, 0, Math.PI);
        ctx.stroke();
    }
    // Thought tail (small circles leading to speaker)
    const dx = tailX - (bx + bw / 2);
    const dy = tailY - (by + bh);
    for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bx + bw / 2 + dx * t, by + bh + dy * t, 5 - i, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    // Text (italic for thoughts)
    ctx.fillStyle = '#000';
    ctx.font = 'italic 11px monospace';
    ctx.textAlign = 'left';
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], bx + 10, by + 16 + i * 14);
    }
    ctx.textAlign = 'left';
}

// Helper: draw a narration box (yellow/cream rectangle in corner)
function drawComicNarration(text, x, y, w) {
    const lines = text.split('\n');
    const h = lines.length * 14 + 16;
    // Cream background
    ctx.fillStyle = '#fff8dc';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    // Text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x + 8, y + 14 + i * 14);
    }
}

// Helper: draw a blue bag/purse
function drawBlueBag(x, y, scale) {
    const s = scale || 1;
    ctx.fillStyle = COMIC_BLUE_BAG;
    ctx.fillRect(x, y, 14 * s, 12 * s);
    ctx.fillStyle = '#3366aa';
    ctx.fillRect(x, y, 14 * s, 3 * s);
    // Handle
    ctx.strokeStyle = '#3366aa';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(x + 7 * s, y - 2 * s, 5 * s, Math.PI, Math.PI * 2);
    ctx.stroke();
    // Clasp
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 5 * s, y + 2 * s, 4 * s, 3 * s);
}

// Helper: draw the player character at position (static, facing direction)
function drawComicPlayerChar(x, y, facing) {
    const char = selectedChar || CHARACTERS[0];
    if (facing === 'down') drawCharFront(x, y, 0, 0, 0, char);
    else if (facing === 'up') drawCharBack(x, y, 0, 0, 0, char);
    else if (facing === 'left') drawCharSide(x, y, 0, 0, 0, -1, char);
    else drawCharSide(x, y, 0, 0, 0, 1, char);
}

// Helper: draw a hooded/murderer figure (same style as drawMurderer but no knife)
function drawHoodedFigure(x, y) {
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 6, y + 26, 5, 10);
    ctx.fillRect(x + 13, y + 26, 5, 10);
    ctx.fillRect(x + 4, y + 8, 16, 20);
    ctx.fillRect(x + 1, y + 10, 4, 12);
    ctx.fillRect(x + 19, y + 10, 4, 12);
    ctx.fillRect(x + 6, y - 4, 12, 12);
    // Hood detail
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 5, y - 6, 14, 4);
}

// Helper: draw a security guard in white uniform
function drawSecurityGuard(x, y, facing) {
    const b = 0;
    // Legs
    ctx.fillStyle = '#1a1a44';
    ctx.fillRect(x + 6, y + 26 + b, 5, 10);
    ctx.fillRect(x + 13, y + 26 + b, 5, 10);
    // Pants
    ctx.fillStyle = '#1a1a44';
    ctx.fillRect(x + 5, y + 22 + b, 14, 6);
    // Torso (white uniform)
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 3, y + 7 + b, 18, 16);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x + 3, y + 21 + b, 18, 2);
    // Badge
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 5, y + 10, 4, 4);
    // Arms
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 1, y + 8 + b, 3, 12);
    ctx.fillRect(x + 20, y + 8 + b, 3, 12);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 6, y - 2 + b, 12, 10);
    // Cap
    ctx.fillStyle = '#1a1a44';
    ctx.fillRect(x + 4, y - 6 + b, 16, 5);
    ctx.fillRect(x + 3, y - 2 + b, 18, 2);
    // Eyes
    if (facing === 'down' || facing === 'left' || facing === 'right') {
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 8, y + 1, 2, 2);
        ctx.fillRect(x + 14, y + 1, 2, 2);
    }
}

// Helper: draw a shopkeeper
function drawShopkeeper(x, y) {
    // Legs
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 6, y + 26, 5, 10);
    ctx.fillRect(x + 13, y + 26, 5, 10);
    // Apron/body
    ctx.fillStyle = '#cc8844';
    ctx.fillRect(x + 3, y + 7, 18, 20);
    // Apron front
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 5, y + 12, 14, 14);
    // Arms
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 1, y + 8, 3, 12);
    ctx.fillRect(x + 20, y + 8, 3, 12);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 6, y - 2, 12, 10);
    // Hair
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 5, y - 5, 14, 4);
    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 8, y + 1, 2, 2);
    ctx.fillRect(x + 14, y + 1, 2, 2);
    // Mouth (distressed in panel 2, neutral otherwise)
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(x + 9, y + 5, 6, 2);
}

// Helper: draw a drag queen on stage
function drawDragQueen(x, y, wigColor, outfitColor, outfitShade) {
    // Legs (heels)
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 7, y + 28, 4, 8);
    ctx.fillRect(x + 13, y + 28, 4, 8);
    ctx.fillStyle = outfitColor;
    ctx.fillRect(x + 6, y + 34, 5, 3);
    ctx.fillRect(x + 12, y + 34, 5, 3);
    // Dress
    ctx.fillStyle = outfitColor;
    ctx.fillRect(x + 2, y + 7, 20, 22);
    ctx.fillStyle = outfitShade;
    ctx.fillRect(x + 2, y + 27, 20, 3);
    // Sparkle detail
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 6, y + 10, 2, 2);
    ctx.fillRect(x + 14, y + 14, 2, 2);
    ctx.fillRect(x + 8, y + 20, 2, 2);
    // Arms
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 0, y + 8, 3, 10);
    ctx.fillRect(x + 21, y + 8, 3, 10);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 6, y - 2, 12, 10);
    // Wig
    ctx.fillStyle = wigColor;
    ctx.fillRect(x + 3, y - 12, 18, 12);
    ctx.fillRect(x + 2, y - 8, 20, 8);
    ctx.fillRect(x + 1, y - 4, 4, 10);
    ctx.fillRect(x + 19, y - 4, 4, 10);
    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 8, y + 1, 2, 2);
    ctx.fillRect(x + 14, y + 1, 2, 2);
    // Lips
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(x + 9, y + 5, 6, 2);
}

// ──────────────────────────────
// Panel 1: "Leaving the Room"
// ──────────────────────────────
function drawComicRoundaboutBg() {
    // Shared roundabout background for panels 1 and 1b — matches in-game drawL3Roundabout
    const B = COMIC_BORDER;
    const W = WIDTH - B * 2;
    const H = HEIGHT - B * 2;

    // Floor (matches in-game #2a1a3a base with #321e44 tiles)
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(B, B, W, H);
    for (let x = B; x < WIDTH - B; x += 18) {
        for (let y = B; y < HEIGHT - B; y += 18) {
            ctx.fillStyle = '#321e44';
            ctx.fillRect(x + 2, y + 2, 7, 7);
        }
    }

    // Walls (matches in-game #3a2a5c)
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(B, B, W, 30);              // north wall
    ctx.fillRect(B, B, 30, H);              // west wall
    ctx.fillRect(WIDTH - 30 - B, B, 30, H); // east wall
    // Wall trim (#4a2a1a)
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(B, B + 27, W, 3);
    ctx.fillRect(B + 27, B, 3, H);
    ctx.fillRect(WIDTH - 30 - B, B, 3, H);

    // Grand piano in center (scaled-down version of in-game piano, NO Flint)
    const px = 155, py = 55;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(px, py, 50, 70);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(px + 4, py + 4, 42, 62);
    // Piano curve (left side)
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(px, py + 35, 10, 35, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(px - 10, py, 10, 70);
    ctx.fillStyle = '#333';
    ctx.fillRect(px - 8, py + 2, 7, 66);
    // Keyboard (right side)
    ctx.fillStyle = '#eee';
    ctx.fillRect(px + 46, py + 8, 9, 56);
    for (let k = 0; k < 7; k++) {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(px + 46, py + 9 + k * 8, 9, 1);
    }
    for (let k = 0; k < 5; k++) {
        if (k % 3 !== 2) {
            ctx.fillStyle = '#111';
            ctx.fillRect(px + 46, py + 11 + k * 10, 5, 5);
        }
    }
    // Piano legs
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(px + 2, py + 68, 3, 7);
    ctx.fillRect(px + 42, py + 68, 3, 7);
    // Bench
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(px + 56, py + 20, 12, 28);
    ctx.fillStyle = '#3a1a0a';
    ctx.fillRect(px + 58, py + 22, 8, 24);

    // Door frames — matching in-game layout
    // North (theater) - top wall
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(185, B, 70, 8);
    ctx.fillStyle = '#030305';
    ctx.fillRect(190, B, 60, 5);
    ctx.fillStyle = '#e8d070';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THEATER', 220, B + 18);
    // East (shop) - right wall
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(WIDTH - B - 30, 85, 24, 60);
    ctx.fillStyle = '#030305';
    ctx.fillRect(WIDTH - B - 26, 90, 20, 50);
    ctx.fillStyle = '#e8d070';
    ctx.font = '7px monospace';
    ctx.fillText('SHOP', WIDTH - B - 14, 80);
    // West (jewelry) - left wall
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(B, 85, 8, 60);
    ctx.fillStyle = '#030305';
    ctx.fillRect(B, 90, 5, 50);
    ctx.fillStyle = '#e8d070';
    ctx.fillText('JEWELRY', B + 14, 80);

    // Hallway entrance at bottom (where group came from)
    ctx.fillStyle = '#030305';
    ctx.fillRect(180, HEIGHT - B - 30, 80, 36);
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(185, HEIGHT - B - 25, 70, 30);

    // Sconces (matching in-game positions)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(B + 30, 55, 4, 4);
    ctx.fillRect(WIDTH - B - 34, 55, 4, 4);
    ctx.fillRect(B + 30, 155, 4, 4);
    ctx.fillRect(WIDTH - B - 34, 155, 4, 4);
    ctx.fillStyle = 'rgba(255, 200, 0, 0.10)';
    ctx.beginPath(); ctx.arc(B + 32, 57, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(WIDTH - B - 32, 57, 12, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left';
}

function drawComicPanel1() {
    // Group just entered the roundabout from the hallway, Blake urges them
    drawComicRoundaboutBg();

    // Group near bottom, having just walked in from the hallway entrance
    const groupY = 210;
    drawComicPlayerChar(185, groupY, 'up');
    drawBlakeSprite(215, groupY, 'up');
    drawAbrahamSprite(245, groupY, 'up');
    drawVanessaSprite(275, groupY, 'up');

    // Blake speech bubble
    drawComicSpeechBubble(
        'Let\'s hurry to the drag\nshow. The Cher impersonator\nis already on stage!',
        110, 100, 260, 60,
        227, groupY - 5
    );
}

function drawComicPanel1b() {
    // Same roundabout — group hears off-screen "No!"
    drawComicRoundaboutBg();

    // Group stopped, looking right (toward the shop)
    const groupY = 210;
    drawComicPlayerChar(185, groupY, 'right');
    drawBlakeSprite(215, groupY, 'right');
    drawAbrahamSprite(245, groupY, 'right');
    drawVanessaSprite(275, groupY, 'right');

    // Exclamation points above each character
    ctx.fillStyle = '#fff';
    const exclPositions = [197, 227, 257, 287];
    for (const ex of exclPositions) {
        ctx.fillRect(ex - 6, groupY - 28, 12, 18);
    }
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    for (const ex of exclPositions) {
        ctx.fillText('!', ex, groupY - 14);
    }
    ctx.textAlign = 'left';

    // Off-screen "No!" coming from the right (shop direction)
    ctx.save();
    ctx.fillStyle = '#ff4444';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'right';
    ctx.strokeText('No!!', WIDTH - 20, 100);
    ctx.fillText('No!!', WIDTH - 20, 100);
    ctx.restore();

    // Jagged speech tail pointing off-screen right toward shop door
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WIDTH - 10, 78);
    ctx.lineTo(WIDTH - 50, 72);
    ctx.lineTo(WIDTH - 44, 86);
    ctx.lineTo(WIDTH - 70, 82);
    ctx.lineTo(WIDTH - 48, 94);
    ctx.closePath();
    ctx.stroke();
}

// ──────────────────────────────
// Panel 2: "The Robbery"
// ──────────────────────────────
function drawComicPanel2() {
    // Ship interior corridor with shop storefront
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Corridor floor
    ctx.fillStyle = '#4a0e2e';
    ctx.fillRect(COMIC_BORDER, 180, WIDTH - COMIC_BORDER * 2, HEIGHT - 180 - COMIC_BORDER);
    for (let x = 10; x < WIDTH - 10; x += 24) {
        ctx.fillStyle = '#5c1438';
        ctx.fillRect(x, 185, 10, 10);
        ctx.fillRect(x + 12, 205, 10, 10);
    }

    // Corridor walls
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, 50);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(COMIC_BORDER, 46, WIDTH - COMIC_BORDER * 2, 4);

    // Shop storefront (right side, built into wall)
    ctx.fillStyle = '#8b6040';
    ctx.fillRect(300, 50, 170, 140);
    // Shop sign
    ctx.fillStyle = '#fff8dc';
    ctx.fillRect(330, 54, 110, 16);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ANTIQUES', 385, 66);
    ctx.textAlign = 'left';
    // Shop window
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(320, 80, 60, 50);
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 2;
    ctx.strokeRect(320, 80, 60, 50);
    // Shop counter
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(310, 150, 100, 20);
    // Door
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(400, 80, 40, 90);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(432, 130, 4, 4);

    // Shopkeeper behind counter (distressed)
    drawShopkeeper(340, 115);
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', 352, 108);

    // Hooded figure running left with blue bag
    drawHoodedFigure(130, 190);
    drawBlueBag(110, 204, 1.2);

    // Motion lines
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        const ly = 195 + i * 8;
        ctx.beginPath();
        ctx.moveTo(170, ly);
        ctx.lineTo(200 + i * 5, ly);
        ctx.stroke();
    }

    // Sound effect text
    ctx.save();
    ctx.fillStyle = '#ff0000';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.strokeText('STOP! THIEF!', 240, 170);
    ctx.fillText('STOP! THIEF!', 240, 170);
    ctx.restore();

    // Wall sconces
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(50, 60, 6, 8);
    ctx.fillRect(200, 60, 6, 8);
    ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
    ctx.fillRect(44, 55, 18, 24);
    ctx.fillRect(194, 55, 18, 24);
}

// ──────────────────────────────
// Panel 3: "The Chase"
// ──────────────────────────────
function drawComicPanel3() {
    // Ship interior corridor, guards chasing
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Corridor floor
    ctx.fillStyle = '#4a0e2e';
    ctx.fillRect(COMIC_BORDER, 160, WIDTH - COMIC_BORDER * 2, HEIGHT - 160 - COMIC_BORDER);
    for (let x = 10; x < WIDTH - 10; x += 24) {
        ctx.fillStyle = '#5c1438';
        ctx.fillRect(x, 165, 10, 10);
        ctx.fillRect(x + 12, 185, 10, 10);
    }

    // Corridor walls
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, 50);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(COMIC_BORDER, 46, WIDTH - COMIC_BORDER * 2, 4);
    // Wall accent
    ctx.fillStyle = '#3d2a5c';
    ctx.fillRect(COMIC_BORDER, 80, WIDTH - COMIC_BORDER * 2, 4);
    ctx.fillRect(COMIC_BORDER, 130, WIDTH - COMIC_BORDER * 2, 4);

    // Hooded figure running (far left)
    drawHoodedFigure(40, 170);
    drawBlueBag(20, 184, 1);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(75, 176 + i * 7);
        ctx.lineTo(100 + i * 4, 176 + i * 7);
        ctx.stroke();
    }

    // Two security guards chasing
    drawSecurityGuard(140, 175, 'left');
    drawSecurityGuard(180, 180, 'left');
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(215, 182 + i * 6);
        ctx.lineTo(232, 182 + i * 6);
        ctx.stroke();
    }

    // The group watching from the right side
    const groupX = 330;
    const groupY = 185;
    drawComicPlayerChar(groupX, groupY, 'left');
    drawBlakeSprite(groupX + 28, groupY, 'left');
    drawAbrahamSprite(groupX + 56, groupY, 'left');
    drawVanessaSprite(groupX + 84, groupY, 'left');

    // Wall sconces
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(260, 60, 6, 8);
    ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
    ctx.fillRect(254, 55, 18, 24);

    // Abraham speech bubble
    drawComicSpeechBubble(
        'I hope they\'re able\nto catch him.',
        290, 90, 180, 46,
        groupX + 68, groupY - 5
    );
}

// ──────────────────────────────
// Panel 4: "Off to the Show"
// ──────────────────────────────
function drawComicPanel4() {
    // Close-up of Blake looking excited
    // Dark background suggesting indoor/close-up vibe
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Radial highlight behind Blake
    const grd = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 20, WIDTH / 2, HEIGHT / 2, 200);
    grd.addColorStop(0, '#4a2a5c');
    grd.addColorStop(1, '#1a0e28');
    ctx.fillStyle = grd;
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Big Blake (3x scale, close-up)
    ctx.save();
    ctx.translate(WIDTH / 2 - 36, HEIGHT / 2 - 40);
    ctx.scale(3, 3);
    drawBlakeSprite(0, 0, 'down');
    ctx.restore();

    // Excitement marks around Blake
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('*', WIDTH / 2 - 60, HEIGHT / 2 - 30);
    ctx.fillText('*', WIDTH / 2 + 60, HEIGHT / 2 - 20);
    ctx.fillText('*', WIDTH / 2 - 50, HEIGHT / 2 + 40);

    // Blake speech bubble at top
    drawComicSpeechBubble(
        'But let\'s go.\nThe show\'s starting soon.',
        140, 20, 220, 46,
        WIDTH / 2, HEIGHT / 2 - 50
    );
}

// ──────────────────────────────
// Panel 4b: Announcer introduces the queens
// ──────────────────────────────
function drawComicPanel4b() {
    // Theater interior — spotlight on announcer/emcee at a mic stand
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Stage floor
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(60, 140, WIDTH - 120, 120);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(60, 135, WIDTH - 120, 8);

    // Red curtains
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 10, 55, 250);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(15, 10, 20, 250);
    ctx.fillRect(WIDTH - 65, 10, 55, 250);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(WIDTH - 55, 10, 20, 250);

    // Curtain valance
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 10, WIDTH - 20, 25);

    // Spotlight center
    ctx.fillStyle = 'rgba(255, 255, 200, 0.2)';
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 10);
    ctx.lineTo(WIDTH / 2 - 60, 260);
    ctx.lineTo(WIDTH / 2 + 60, 260);
    ctx.closePath();
    ctx.fill();

    // Mic stand (center stage)
    ctx.fillStyle = '#888';
    ctx.fillRect(WIDTH / 2 - 1, 155, 3, 50);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(WIDTH / 2 - 8, 200, 17, 4);
    // Mic head
    ctx.fillStyle = '#333';
    ctx.fillRect(WIDTH / 2 - 4, 148, 9, 8);

    // Audience silhouettes
    ctx.fillStyle = '#111';
    for (let x = 80; x < WIDTH - 80; x += 28) {
        ctx.beginPath();
        ctx.arc(x + 14, HEIGHT - 40, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + 6, HEIGHT - 32, 16, 12);
    }

    // Announcer speech bubble (big, dramatic)
    drawComicSpeechBubble(
        'Ladies and gentlemen...\nPlease welcome to the stage:\nJIGGLYPUFF! SKINNY MARIAH\nCAREY! and CHER!',
        100, 20, 280, 80,
        WIDTH / 2, 148
    );
}

// ──────────────────────────────
// Panel 5: "The Drag Show" (wide panel)
// ──────────────────────────────
function drawComicPanel5() {
    // Theater interior
    // Dark theater background
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Stage floor
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(60, 160, WIDTH - 120, 100);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(60, 155, WIDTH - 120, 8);

    // Red curtains on sides
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 10, 55, 250);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(15, 10, 20, 250);
    ctx.fillRect(40, 10, 15, 250);
    // Right curtain
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(WIDTH - 65, 10, 55, 250);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(WIDTH - 55, 10, 20, 250);
    ctx.fillRect(WIDTH - 35, 10, 15, 250);

    // Curtain valance at top
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 10, WIDTH - 20, 25);
    ctx.fillStyle = '#cc2222';
    for (let x = 20; x < WIDTH - 20; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 35);
        ctx.lineTo(x + 15, 50);
        ctx.lineTo(x + 30, 35);
        ctx.fill();
    }

    // Spotlights
    ctx.fillStyle = 'rgba(255, 255, 200, 0.15)';
    ctx.beginPath();
    ctx.moveTo(150, 10);
    ctx.lineTo(120, 250);
    ctx.lineTo(180, 250);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(240, 10);
    ctx.lineTo(210, 250);
    ctx.lineTo(270, 250);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(330, 10);
    ctx.lineTo(300, 250);
    ctx.lineTo(360, 250);
    ctx.closePath();
    ctx.fill();

    // Three drag queens on stage — exaggerated bodies & outfits

    // 1. Jigglypuff — round/puffy pink body, huge pink wig, cute face
    const jx = 130, jy = 155;
    ctx.fillStyle = '#ff99cc';
    ctx.beginPath(); ctx.ellipse(jx + 12, jy + 18, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffaacc';
    ctx.beginPath(); ctx.ellipse(jx + 12, jy + 10, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff88bb';
    ctx.fillRect(jx + 6, jy + 32, 5, 8);
    ctx.fillRect(jx + 13, jy + 32, 5, 8);
    // Huge pink wig (round like Jigglypuff)
    ctx.fillStyle = '#ff77aa';
    ctx.beginPath(); ctx.ellipse(jx + 12, jy - 2, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff99cc';
    ctx.beginPath(); ctx.arc(jx + 12, jy - 12, 8, 0, Math.PI * 2); ctx.fill();
    // Cute eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(jx + 7, jy + 4, 4, 4);
    ctx.fillRect(jx + 14, jy + 4, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(jx + 8, jy + 4, 2, 2);
    ctx.fillRect(jx + 15, jy + 4, 2, 2);
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(jx + 9, jy + 10, 6, 2);
    drawBlueBag(jx - 5, jy + 30, 1);

    // 2. Mariah Carey — curvy body, long flowing brown hair, sparkly corset, high heels
    const mx = 220, my = 158;
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(mx + 7, my + 30, 4, 10);
    ctx.fillRect(mx + 13, my + 30, 4, 10);
    ctx.fillStyle = '#cc3366';
    ctx.fillRect(mx + 5, my + 38, 6, 4);
    ctx.fillRect(mx + 13, my + 38, 6, 4);
    // Sparkly corset — hourglass shape
    ctx.fillStyle = '#cc3366';
    ctx.fillRect(mx + 2, my + 8, 20, 10);
    ctx.fillStyle = '#ff4488';
    ctx.fillRect(mx + 4, my + 18, 16, 14);
    // Sparkles
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx + 6, my + 10, 2, 2);
    ctx.fillRect(mx + 14, my + 12, 2, 2);
    ctx.fillRect(mx + 10, my + 22, 2, 2);
    ctx.fillRect(mx + 8, my + 16, 1, 1);
    ctx.fillRect(mx + 16, my + 20, 1, 1);
    // Arms out (diva pose)
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(mx - 4, my + 10, 7, 4);
    ctx.fillRect(mx + 21, my + 10, 7, 4);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(mx + 6, my - 2, 12, 10);
    // Long flowing brown hair
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(mx + 3, my - 10, 18, 12);
    ctx.fillRect(mx + 1, my - 4, 4, 20);
    ctx.fillRect(mx + 19, my - 4, 4, 20);
    ctx.fillRect(mx + 0, my + 10, 3, 14);
    ctx.fillRect(mx + 21, my + 10, 3, 14);
    // Eyes + lips
    ctx.fillStyle = '#333';
    ctx.fillRect(mx + 8, my + 1, 3, 3);
    ctx.fillRect(mx + 14, my + 1, 3, 3);
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(mx + 9, my + 5, 6, 2);
    drawBlueBag(mx + 20, my + 30, 1);

    // 3. Cher — tall, long straight black hair to the floor, sparkly bodysuit
    const cx2 = 310, cy2 = 150;
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(cx2 + 8, cy2 + 36, 4, 12);
    ctx.fillRect(cx2 + 13, cy2 + 36, 4, 12);
    ctx.fillStyle = '#cc44ff';
    ctx.fillRect(cx2 + 7, cy2 + 46, 5, 4);
    ctx.fillRect(cx2 + 12, cy2 + 46, 5, 4);
    // Sparkly bodysuit — form-fitting
    ctx.fillStyle = '#cc44ff';
    ctx.fillRect(cx2 + 5, cy2 + 8, 14, 30);
    ctx.fillStyle = '#9933cc';
    ctx.fillRect(cx2 + 5, cy2 + 8, 14, 3);
    ctx.fillRect(cx2 + 5, cy2 + 35, 14, 3);
    // Sparkles all over
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 8; i++) {
        ctx.fillRect(cx2 + 6 + (i % 4) * 3, cy2 + 12 + Math.floor(i / 4) * 12, 1, 1);
    }
    // Arms
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(cx2 + 2, cy2 + 10, 4, 10);
    ctx.fillRect(cx2 + 18, cy2 + 10, 4, 10);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(cx2 + 6, cy2 - 2, 12, 10);
    // Super long straight black hair
    ctx.fillStyle = '#111';
    ctx.fillRect(cx2 + 4, cy2 - 12, 16, 14);
    ctx.fillRect(cx2 + 2, cy2 - 4, 4, 46);
    ctx.fillRect(cx2 + 18, cy2 - 4, 4, 46);
    ctx.fillRect(cx2 + 1, cy2 + 30, 3, 16);
    ctx.fillRect(cx2 + 20, cy2 + 30, 3, 16);
    // Eyes + lips
    ctx.fillStyle = '#333';
    ctx.fillRect(cx2 + 8, cy2 + 1, 3, 3);
    ctx.fillRect(cx2 + 14, cy2 + 1, 3, 3);
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(cx2 + 9, cy2 + 5, 6, 2);
    drawBlueBag(cx2 + 18, cy2 + 38, 1);

    // Audience silhouettes in foreground
    ctx.fillStyle = '#111';
    for (let x = 20; x < WIDTH - 20; x += 28) {
        // Head silhouette
        ctx.beginPath();
        ctx.arc(x + 14, HEIGHT - 45, 10, 0, Math.PI * 2);
        ctx.fill();
        // Shoulders
        ctx.fillRect(x + 4, HEIGHT - 35, 20, 15);
    }

    // Narration
    drawComicNarration('The Queens dazzle\nthe crowd.', WIDTH - 190, 55, 170);
}

// ──────────────────────────────
// Panel 5b: Jigglypuff pulls mic from purse, sings
// ──────────────────────────────
function drawComicPanel5b() {
    // Close-up of Jigglypuff on stage pulling mic from blue purse
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Stage floor
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(60, 180, WIDTH - 120, 130);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(60, 175, WIDTH - 120, 8);

    // Spotlight on Jigglypuff
    ctx.fillStyle = 'rgba(255, 255, 200, 0.2)';
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 10);
    ctx.lineTo(WIDTH / 2 - 80, 280);
    ctx.lineTo(WIDTH / 2 + 80, 280);
    ctx.closePath();
    ctx.fill();

    // Big Jigglypuff (2.5x scale, center stage)
    const jx = WIDTH / 2 - 30, jy = 100;
    ctx.save();
    ctx.translate(jx, jy);
    ctx.scale(2.5, 2.5);
    // Round puffy pink body
    ctx.fillStyle = '#ff99cc';
    ctx.beginPath(); ctx.ellipse(12, 18, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffaacc';
    ctx.beginPath(); ctx.ellipse(12, 10, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Feet
    ctx.fillStyle = '#ff88bb';
    ctx.fillRect(6, 32, 5, 8);
    ctx.fillRect(13, 32, 5, 8);
    // Big pink wig
    ctx.fillStyle = '#ff77aa';
    ctx.beginPath(); ctx.ellipse(12, -2, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff99cc';
    ctx.beginPath(); ctx.arc(12, -12, 8, 0, Math.PI * 2); ctx.fill();
    // Cute eyes (big, sparkly)
    ctx.fillStyle = '#333';
    ctx.fillRect(7, 4, 4, 4);
    ctx.fillRect(14, 4, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(8, 4, 2, 2);
    ctx.fillRect(15, 4, 2, 2);
    // Open mouth (singing!)
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(8, 10, 8, 4);
    ctx.fillStyle = '#111';
    ctx.fillRect(9, 11, 6, 2);
    // Arm reaching into purse
    ctx.fillStyle = '#ffaacc';
    ctx.fillRect(-2, 14, 6, 4);
    // Arm holding mic up high
    ctx.fillStyle = '#ffaacc';
    ctx.fillRect(20, 4, 4, 10);
    // Microphone in raised hand
    ctx.fillStyle = '#888';
    ctx.fillRect(21, -4, 3, 8);
    ctx.fillStyle = '#333';
    ctx.fillRect(19, -8, 7, 5);
    ctx.restore();

    // Blue purse at her feet (open, mic was just pulled out)
    ctx.save();
    ctx.translate(jx - 20, jy + 80);
    ctx.scale(2, 2);
    ctx.fillStyle = COMIC_BLUE_BAG;
    ctx.fillRect(0, 0, 14, 12);
    ctx.fillStyle = '#3366aa';
    ctx.fillRect(0, 0, 14, 3);
    // Open top (flap open)
    ctx.fillStyle = '#5599cc';
    ctx.fillRect(0, -3, 14, 4);
    ctx.strokeStyle = '#3366aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(7, -4, 5, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(5, 2, 4, 3);
    ctx.restore();

    // Music notes floating around
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('♪', jx - 30, jy + 20);
    ctx.fillText('♫', jx + 90, jy + 10);
    ctx.fillText('♪', jx + 70, jy - 10);
    ctx.font = 'bold 24px monospace';
    ctx.fillText('♫', jx - 10, jy - 20);
    ctx.textAlign = 'left';

    // Narration
    drawComicNarration('Jigglypuff pulls a mic\nfrom her purse...', 14, 10, 210);
}

// ──────────────────────────────
// Panel 6: "The Purses"
// ──────────────────────────────
function drawComicPanel6() {
    // Closer shot: focus on three purses + player's noticing eyes
    // Stage floor background
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, 30);

    // Spotlight effect
    const grd = ctx.createRadialGradient(WIDTH / 2, 140, 30, WIDTH / 2, 140, 200);
    grd.addColorStop(0, 'rgba(255, 255, 200, 0.2)');
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Three identical blue purses prominently displayed
    ctx.save();
    ctx.translate(80, 80);
    ctx.scale(3, 3);
    drawBlueBag(0, 0, 1);
    ctx.restore();

    ctx.save();
    ctx.translate(200, 80);
    ctx.scale(3, 3);
    drawBlueBag(0, 0, 1);
    ctx.restore();

    ctx.save();
    ctx.translate(320, 80);
    ctx.scale(3, 3);
    drawBlueBag(0, 0, 1);
    ctx.restore();

    // Emphasis lines around the purses
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const cx = [122, 242, 362][i];
        for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * 30, 100 + Math.sin(angle) * 25);
            ctx.lineTo(cx + Math.cos(angle) * 38, 100 + Math.sin(angle) * 32);
            ctx.stroke();
        }
    }

    // Player eyes close-up at bottom
    // Eye background (face strip)
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(140, 210, 200, 50);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(140, 210, 200, 50);
    // Left eye
    ctx.fillStyle = '#fff';
    ctx.fillRect(175, 222, 30, 20);
    ctx.fillStyle = '#4477aa';
    ctx.fillRect(184, 226, 14, 14);
    ctx.fillStyle = '#222';
    ctx.fillRect(188, 229, 8, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(191, 230, 3, 3);
    // Right eye
    ctx.fillStyle = '#fff';
    ctx.fillRect(275, 222, 30, 20);
    ctx.fillStyle = '#4477aa';
    ctx.fillRect(284, 226, 14, 14);
    ctx.fillStyle = '#222';
    ctx.fillRect(288, 229, 8, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(291, 230, 3, 3);
    // Eyebrows (slightly raised = noticing)
    ctx.fillStyle = selectedChar && selectedChar.type === 'redhead' ? '#cc3300' : '#3a2a1a';
    ctx.fillRect(174, 216, 32, 5);
    ctx.fillRect(274, 216, 32, 5);

    // Thought bubble
    drawComicThoughtBubble(
        'They each have the same\nblue purse as the thief...',
        110, 140, 260, 46,
        240, 210
    );
}

// ──────────────────────────────
// Panel 6b: "Show Ends" — curtain closing, audience applauding
// ──────────────────────────────
function drawComicPanel6b() {
    // Theater interior — show ending, curtains closing, lights coming up
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Stage floor
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(60, 160, WIDTH - 120, 100);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(60, 155, WIDTH - 120, 8);

    // Red curtains closing (wider than before, covering most of stage)
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 10, 180, 250);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(15, 10, 40, 250);
    ctx.fillRect(60, 10, 30, 250);
    ctx.fillRect(100, 10, 20, 250);
    ctx.fillRect(140, 10, 15, 250);
    ctx.fillRect(WIDTH - 190, 10, 180, 250);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(WIDTH - 185, 10, 40, 250);
    ctx.fillRect(WIDTH - 130, 10, 30, 250);
    ctx.fillRect(WIDTH - 90, 10, 20, 250);
    ctx.fillRect(WIDTH - 55, 10, 15, 250);

    // Curtain valance
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 10, WIDTH - 20, 25);

    // Small gap in center showing empty stage
    ctx.fillStyle = '#2a1a1a';
    ctx.fillRect(190, 35, 100, 120);

    // Overhead lights coming up (warm glow)
    ctx.fillStyle = 'rgba(255, 220, 150, 0.15)';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Audience standing and applauding
    ctx.fillStyle = '#111';
    for (let x = 30; x < WIDTH - 30; x += 24) {
        // Standing silhouettes (taller than sitting)
        ctx.beginPath();
        ctx.arc(x + 12, HEIGHT - 65, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + 4, HEIGHT - 57, 16, 20);
        // Raised hands (clapping)
        if (x % 48 < 24) {
            ctx.fillRect(x + 2, HEIGHT - 72, 4, 8);
            ctx.fillRect(x + 18, HEIGHT - 70, 4, 8);
        } else {
            ctx.fillRect(x + 3, HEIGHT - 68, 4, 6);
            ctx.fillRect(x + 17, HEIGHT - 72, 4, 8);
        }
    }

    // Applause text
    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CLAP CLAP CLAP', WIDTH / 2, HEIGHT - 88);
    ctx.font = 'bold 10px monospace';
    ctx.fillText('CLAP CLAP', WIDTH / 2 - 80, HEIGHT - 78);
    ctx.fillText('CLAP CLAP', WIDTH / 2 + 80, HEIGHT - 78);
    ctx.restore();

    // Narration
    drawComicNarration('The show ends.\nThe lights come up.', 14, 10, 190);
}

// ──────────────────────────────
// Panel 6c: Player approaches guard at EXIT, queue of men
// ──────────────────────────────
function drawComicPanel6c() {
    // Theater interior — guard by EXIT door, line of people queuing
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Theater floor
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(COMIC_BORDER, 100, WIDTH - COMIC_BORDER * 2, HEIGHT - 100 - COMIC_BORDER);
    for (let x = 10; x < WIDTH - 10; x += 24) {
        ctx.fillStyle = '#321e44';
        ctx.fillRect(x, 110, 10, 10);
        ctx.fillRect(x + 12, 130, 10, 10);
    }

    // EXIT door on right wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(WIDTH - 60, COMIC_BORDER, 60, HEIGHT - COMIC_BORDER * 2);
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(WIDTH - 50, 100, 40, 80);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(WIDTH - 46, 104, 32, 72);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(WIDTH - 42, 138, 4, 4);
    // EXIT sign above door
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(WIDTH - 52, 85, 44, 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', WIDTH - 30, 96);
    ctx.textAlign = 'left';

    // Security guard by the door (large, 2x scale)
    ctx.save();
    ctx.translate(WIDTH - 100, 115);
    ctx.scale(1.8, 1.8);
    drawSecurityGuard(0, 0, 'left');
    ctx.restore();

    // Queue of gay men heading toward the exit (5 people in a line)
    const queueStartX = 180;
    for (let i = 0; i < 5; i++) {
        const qx = queueStartX + i * 30;
        const qy = 160 + (i % 2) * 4;
        // Simple figure silhouettes with varied colors
        const colors = ['#ff69b4', '#33ccff', '#cc44ff', '#44cc88', '#ffcc00'];
        ctx.fillStyle = '#d4a076';
        ctx.fillRect(qx + 6, qy - 2, 12, 10);
        ctx.fillStyle = colors[i];
        ctx.fillRect(qx + 3, qy + 7, 18, 16);
        ctx.fillStyle = '#333';
        ctx.fillRect(qx + 6, qy + 22, 5, 10);
        ctx.fillRect(qx + 13, qy + 22, 5, 10);
        // Hair
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(qx + 5, qy - 5, 14, 4);
    }

    // Player approaching from the left/below
    drawComicPlayerChar(80, 200, 'right');

    // Player speech bubble
    drawComicSpeechBubble(
        'Excuse me,\nsecurity officer?',
        30, 130, 160, 40,
        92, 200
    );

    // Guard speech bubble (above the guard)
    drawComicSpeechBubble(
        'I\'m busy. Come back\nafter the theater empties.',
        270, 20, 200, 46,
        WIDTH - 80, 100
    );
}

// ──────────────────────────────
// Panel 7: "A Decision"
// ──────────────────────────────
function drawComicPanel7() {
    // Player turning to friends
    // Dark indoor theater lobby background
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);
    // Floor
    ctx.fillStyle = '#4a0e2e';
    ctx.fillRect(COMIC_BORDER, 200, WIDTH - COMIC_BORDER * 2, HEIGHT - 200 - COMIC_BORDER);
    for (let x = 10; x < WIDTH - 10; x += 24) {
        ctx.fillStyle = '#5c1438';
        ctx.fillRect(x, 205, 10, 10);
    }

    // Wall details
    ctx.fillStyle = '#3d2a5c';
    ctx.fillRect(10, 80, WIDTH - 20, 6);
    ctx.fillRect(10, 160, WIDTH - 20, 4);

    // Player character facing right toward friends
    drawComicPlayerChar(120, 210, 'right');

    // Friends group (facing left, looking confused)
    drawBlakeSprite(280, 210, 'left');
    drawAbrahamSprite(315, 215, 'left');
    drawVanessaSprite(350, 208, 'left');

    // Confusion marks above friends
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('?', 292, 200);
    ctx.fillText('?', 327, 205);
    ctx.fillText('?', 362, 198);

    // Player speech bubble
    drawComicSpeechBubble(
        'You guys go ahead --\nI need to go talk to\nthe shop owner.',
        60, 100, 220, 60,
        132, 210
    );
}

// ──────────────────────────────
// Panel 8: "The Shop"
// ──────────────────────────────
function drawComicPanel8() {
    // Ship interior — player approaching the shop entrance
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Corridor floor
    ctx.fillStyle = '#4a0e2e';
    ctx.fillRect(COMIC_BORDER, 200, WIDTH - COMIC_BORDER * 2, HEIGHT - 200 - COMIC_BORDER);
    for (let x = 10; x < WIDTH - 10; x += 24) {
        ctx.fillStyle = '#5c1438';
        ctx.fillRect(x, 205, 10, 10);
        ctx.fillRect(x + 12, 225, 10, 10);
    }

    // Corridor walls
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, 50);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(COMIC_BORDER, 46, WIDTH - COMIC_BORDER * 2, 4);
    ctx.fillStyle = '#3d2a5c';
    ctx.fillRect(COMIC_BORDER, 90, WIDTH - COMIC_BORDER * 2, 4);
    ctx.fillRect(COMIC_BORDER, 140, WIDTH - COMIC_BORDER * 2, 4);

    // Shop storefront built into wall (large, prominent)
    ctx.fillStyle = '#8b6040';
    ctx.fillRect(100, 50, 280, 160);
    // Shop sign
    ctx.fillStyle = '#fff8dc';
    ctx.fillRect(170, 54, 140, 16);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ANTIQUES', 240, 66);
    ctx.textAlign = 'left';
    // Windows (warm light from inside)
    ctx.fillStyle = '#ffeeaa';
    ctx.fillRect(120, 80, 80, 60);
    ctx.fillRect(280, 80, 80, 60);
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 80, 80, 60);
    ctx.strokeRect(280, 80, 80, 60);
    // Window cross frames
    ctx.beginPath();
    ctx.moveTo(160, 80); ctx.lineTo(160, 140);
    ctx.moveTo(120, 110); ctx.lineTo(200, 110);
    ctx.moveTo(320, 80); ctx.lineTo(320, 140);
    ctx.moveTo(280, 110); ctx.lineTo(360, 110);
    ctx.stroke();
    // Door (center, warm light)
    ctx.fillStyle = '#ffddaa';
    ctx.fillRect(210, 90, 60, 120);
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 2;
    ctx.strokeRect(210, 90, 60, 120);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(260, 155, 5, 5);

    // Player approaching
    drawComicPlayerChar(240, 230, 'up');

    // Warm light from doorway
    ctx.fillStyle = 'rgba(255, 220, 150, 0.15)';
    ctx.beginPath();
    ctx.moveTo(210, 210);
    ctx.lineTo(195, 280);
    ctx.lineTo(285, 280);
    ctx.lineTo(270, 210);
    ctx.closePath();
    ctx.fill();

    // Wall sconces
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(50, 70, 6, 8);
    ctx.fillRect(430, 70, 6, 8);
    ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
    ctx.fillRect(44, 65, 18, 24);
    ctx.fillRect(424, 65, 18, 24);

    // Narration
    drawComicNarration('You return to the\nscene of the crime...', 14, 10, 200);
}

// ──────────────────────────────
// Panel 8b: Blake calls after you
// ──────────────────────────────
function drawComicPanel8b() {
    // Same corridor as panel 8 — Blake calling from behind
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Corridor floor
    ctx.fillStyle = '#4a0e2e';
    ctx.fillRect(COMIC_BORDER, 200, WIDTH - COMIC_BORDER * 2, HEIGHT - 200 - COMIC_BORDER);
    for (let x = 10; x < WIDTH - 10; x += 24) {
        ctx.fillStyle = '#5c1438';
        ctx.fillRect(x, 205, 10, 10);
        ctx.fillRect(x + 12, 225, 10, 10);
    }

    // Corridor walls
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, 50);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(COMIC_BORDER, 46, WIDTH - COMIC_BORDER * 2, 4);

    // Blake (left side, calling out)
    drawBlakeSprite(100, 220, 'right');

    // Player (right side, turning back to face Blake)
    drawComicPlayerChar(340, 215, 'left');

    // Blake speech bubble
    drawComicSpeechBubble(
        'Where are you going?',
        60, 130, 180, 34,
        112, 220
    );

    // Player speech bubble
    drawComicSpeechBubble(
        'I need to report this\ndetail concerning the\ncrime to the shop owner!',
        250, 100, 210, 60,
        352, 215
    );
}

// ──────────────────────────────
// Panel 8c: Blake responds
// ──────────────────────────────
function drawComicPanel8c() {
    // Close-up of Blake looking exasperated
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Radial highlight behind Blake
    const grd = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 20, WIDTH / 2, HEIGHT / 2, 200);
    grd.addColorStop(0, '#4a2a5c');
    grd.addColorStop(1, '#1a0e28');
    ctx.fillStyle = grd;
    ctx.fillRect(COMIC_BORDER, COMIC_BORDER, WIDTH - COMIC_BORDER * 2, HEIGHT - COMIC_BORDER * 2);

    // Big Blake (3x scale, close-up)
    ctx.save();
    ctx.translate(WIDTH / 2 - 36, HEIGHT / 2 - 30);
    ctx.scale(3, 3);
    drawBlakeSprite(0, 0, 'down');
    ctx.restore();

    // Frustration marks
    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('#', WIDTH / 2 - 70, HEIGHT / 2 - 30);
    ctx.fillText('!', WIDTH / 2 + 70, HEIGHT / 2 - 20);

    // Blake speech bubble at top
    drawComicSpeechBubble(
        'You don\'t need to get\ninvolved in every\ninvestigation!',
        110, 15, 260, 60,
        WIDTH / 2, HEIGHT / 2 - 40
    );
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 3 — The Blue Purse Mystery
// ═══════════════════════════════════════════════════════════════

const L3_NPCS = {
    shopkeeper: { room: 'shop', x: 230, y: 140, facing: 'down', name: 'SHOPKEEPER', color: '#cc8844' },
    guard: { room: 'theater', x: 230, y: 160, facing: 'down', name: 'SECURITY', color: '#cccccc' },
    flint: { room: 'roundabout', x: 250, y: 138, facing: 'left', name: 'FLINT', color: '#ff8800' },
    chuck: { room: 'chucks-room', x: 240, y: 140, facing: 'down', name: 'CHUCK', color: '#cc4444' },
    aj: { room: 'jewelry', x: 200, y: 160, facing: 'right', name: 'AJ', color: '#33ccff' },
    rj: { room: 'jewelry', x: 224, y: 160, facing: 'left', name: 'RJ', color: '#33cc99' },
    blake: { room: 'roundabout', x: 260, y: 400, facing: 'down', name: 'BLAKE', color: '#ff69b4' },
    abraham: { room: 'jewelry', x: 350, y: 220, facing: 'left', name: 'ABRAHAM', color: '#44cc88' },
    vanessa: { room: 'roundabout', x: 160, y: 520, facing: 'right', name: 'VANESSA', color: '#cc44ff' },
};

const L3_DIALOG = {
    shopkeeper: [
        "Someone stole one of my antique books! A rare, valuable one. The thief grabbed it right off the display and ran.",
        "Security is handling it, but I'm beside myself. It was in one of those blue bags -- you know, the ones from the drag show.",
        "Here, let me show you a picture of what was taken...",
    ],
    guard: [
        "Those blue purses? Yeah I remember them. They stood out because they were identical.",
        "I had to check everyone's bag on the way in, even the performers.",
        "I remember the contents of the blue purses. One had a book, one had a bottle of PrEP, and one had a microphone.",
    ],
    flint: [
        "I can't talk now, I'm playing.",
        "You want to talk to me about the robbery? I already discussed with security.",
        "You know, it's funny. Chuck is so 'masc' that he's ashamed he does drag, and tells everyone he doesn't. I wonder if someone like that can be trusted?",
    ],
    chuck: [
        "You want to talk to me about the robbery? Ain't those drag queens the suspects?",
        "I don't do drag. I'm not THAT gay.",
        "I have a reputation to uphold as a senator.",
        "I'm 340 pounds. It would be physically impossible for me to be Mariah Carey.",
        "Can you imagine me in that corset? Ha!",
        "You know AJ cheats on his husband, right? I wonder if someone like that can be trusted.",
    ],
    aj: [
        {speaker: 'aj', text: "Oh hi! We're just looking at rings."},
        {speaker: 'rj', text: "Hey! Nice to meet you. AJ won't stop talking about the drag show."},
        {speaker: 'aj', text: "I was Cher! It was so much fun performing. The crowd loved it."},
        {speaker: 'rj', text: "He was incredible up there, I'm so proud of him."},
        {speaker: 'aj', text: "My purse? I... no. I don't... I don't want to talk about that. There was nothing in it. It was just a prop, okay?"},
        {speaker: 'aj', text: "What about Flint? Did you know he's a side? I wonder if someone like that can be trusted."},
    ],
    rj: [],
    blake: [
        "I can't believe you're doing this on our vacation.",
        "You always have to get involved in everything!",
        "Fine. I'll help. Cher was already on stage when the robbery happened. So it couldn't have been whoever was performing as Cher.",
    ],
    abraham: [
        "Can you believe someone robbed the antique shop? During a drag show!",
        "I swear, this cruise gets crazier every day.",
        "Oh hey, you know Cher was already on stage when the robbery happened. So it couldn't have been whoever was performing as Cher.",
    ],
    vanessa: [
        "Darling, I could solve this faster than you. But I'll let you have your moment.",
        "The drag show was EVERYTHING though. Those queens were fierce.",
        "Did you see Jigglypuff pull that microphone out of her purse? Iconic. She literally used it as a prop for the whole act.",
    ],
};

// Room door definitions: { x, y, w, h, target, playerX, playerY, facing, label }
const L3_DOORS = {
    shop: [
        { x: 0, y: 100, w: 28, h: 100, target: 'roundabout', playerX: 410, playerY: 160, facing: 'left', label: 'Exit to Roundabout' },
    ],
    roundabout: [
        { x: 420, y: 120, w: 60, h: 80, target: 'shop', playerX: 30, playerY: 160, facing: 'right', label: 'Antique Shop' },
        { x: 190, y: 0, w: 100, h: 40, target: 'theater', playerX: 228, playerY: 270, facing: 'up', label: 'Theater' },
        { x: 0, y: 120, w: 60, h: 80, target: 'jewelry', playerX: 410, playerY: 160, facing: 'left', label: 'Jewelry' },
        { x: 130, y: 430, w: 44, h: 60, target: 'chucks-room', playerX: 430, playerY: 160, facing: 'left', label: "Chuck's Room" },
    ],
    theater: [
        { x: 190, y: 286, w: 100, h: 40, target: 'roundabout', playerX: 228, playerY: 50, facing: 'down', label: 'Roundabout' },
    ],
    jewelry: [
        { x: 440, y: 120, w: 40, h: 80, target: 'roundabout', playerX: 50, playerY: 160, facing: 'right', label: 'Roundabout' },
    ],
    'chucks-room': [
        { x: 440, y: 120, w: 40, h: 80, target: 'roundabout', playerX: 180, playerY: 460, facing: 'right', label: 'Hallway' },
    ],
};

// Colliders per room (furniture, walls, counters)
const L3_COLLIDERS = {
    shop: [
        { x: 160, y: 175, w: 160, h: 30 }, // counter
        { x: 190, y: 50, w: 100, h: 80 },  // display case
        { x: 40, y: 30, w: 100, h: 90 },   // left shelves (narrower, leaves path to door)
        { x: 340, y: 30, w: 120, h: 105 }, // right shelves
    ],
    roundabout: [
        { x: 155, y: 105, w: 115, h: 105 }, // piano + bench
        // Roundabout section walls (with gaps for doors)
        // Top wall — gap at x:190-290 for theater door
        { x: 0, y: 0, w: 190, h: 40 },
        { x: 290, y: 0, w: 190, h: 40 },
        // Left wall — gap at y:120-200 for jewelry door
        { x: 0, y: 0, w: 40, h: 120 },
        { x: 0, y: 200, w: 40, h: 120 },
        // Right wall — gap at y:120-200 for shop door
        { x: 440, y: 0, w: 40, h: 120 },
        { x: 440, y: 200, w: 40, h: 120 },
        // Hallway section walls (narrow corridor from y:340 downward)
        // Left wall — gap for Chuck's door at y:430-490
        { x: 0, y: 340, w: 130, h: 90 },
        { x: 0, y: 490, w: 130, h: 220 },
        // Right wall — decorative doors but solid
        { x: 340, y: 340, w: 140, h: 370 },
    ],
    theater: [
        { x: 60, y: 40, w: 360, h: 80 },  // stage
        { x: 10, y: 10, w: 55, h: 250 },   // left curtain
        { x: 415, y: 10, w: 55, h: 250 },  // right curtain
    ],
    'chucks-room': [
        { x: 50, y: 60, w: 110, h: 140 },  // bed
        { x: 50, y: 40, w: 44, h: 20 },     // bedside table
    ],
    jewelry: [
        { x: 140, y: 50, w: 200, h: 30 },  // display counter
        { x: 60, y: 120, w: 80, h: 40 },    // left display
        { x: 340, y: 120, w: 80, h: 40 },   // right display
    ],
};

function startLevel3() {
    gameState = 'level3';
    l3State = 'free';
    l3Room = 'shop';
    l3PlayerX = 228;
    l3PlayerY = 230;
    l3PlayerFacing = 'up';
    l3Camera = { y: 0 };
    l3ShopTextAlpha = 0;
    l3ShopTextPhase = 'done';
    l3ShopTimer = 0;
    l3BookReveal = false;
    l3ShopkeeperTalked = false;
    l3NearNpc = null;
    l3NearDoor = null;
    l3TalkedTo = { chuck: false, flint: false, aj: false };
    l3DialogIndex = { shopkeeper: 0, guard: 0, flint: 0, chuck: 0, aj: 0, rj: 0, blake: 0, abraham: 0, vanessa: 0 };
    l3GridUnlocked = false;
    l3DiscoveredClues = [];
    l3Notebook = {
        open: false,
        suspectItem: [['','',''],['','',''],['','','']],
        suspectPersona: [['','',''],['','',''],['','','']],
        personaItem: [['','',''],['','',''],['','','']],
        autoMarks: {},
    };
    l3TalkingTo = null;
    l3AccusationOpen = false;
    l3Typewriting = null;
    l3TypeTimer = 0;
    l3Solved = false;
    l3CompleteTimer = 0;
    document.getElementById('chat-panel').style.display = 'none';
    document.getElementById('notebook-overlay').style.display = 'none';
    document.getElementById('notebook-btn').style.display = 'none';
    dialogBox.classList.remove('visible');
    promptEl.classList.remove('visible');
    GameMusic.stopMusic();
    if (musicEnabled) GameMusic.startMusic('level3');
}

function handleLevel3Action(key) {
    const k = key.toLowerCase();
    if (l3State === 'shop-intro') return;
    if (l3State === 'book-reveal') {
        l3State = 'shop-intro';
        l3ShopTextIndex = 0;
        l3ShopTextAlpha = 0;
        l3ShopTextPhase = 'fadein';
        l3ShopTimer = 0;
        return;
    }
    if (l3State === 'complete') return;
    if (l3State === 'shop-exit-blocked') {
        dialogBox.classList.remove('visible');
        l3State = 'free';
        return;
    }
    if (l3State === 'chat') {
        if (k === 'escape') {
            closeLevel3Chat();
            return;
        }
        if (k === 'e' || k === ' ' || k === 'examine') {
            advanceLevel3Dialog();
            return;
        }
        return;
    }
    if (l3State === 'notebook') {
        if (k === 'escape' || k === 'c') {
            l3Notebook.open = false;
            l3State = 'free';
            document.getElementById('notebook-overlay').style.display = 'none';
            return;
        }
        return;
    }
    if (l3State === 'free') {
        if (k === 'c' && l3GridUnlocked) {
            openL3Notebook();
            return;
        }
        if ((k === 'e' || k === ' ' || k === 'examine') && l3NearNpc) {
            openLevel3Chat(l3NearNpc);
            return;
        }
    }
}

// ── Level 3 Chat System ──

function openLevel3Chat(npcKey) {
    // Redirect RJ talk to combined AJ+RJ conversation
    if (npcKey === 'rj') npcKey = 'aj';
    l3State = 'chat';
    l3TalkingTo = npcKey;

    const npc = L3_NPCS[npcKey];
    const panel = document.getElementById('chat-panel');
    panel.style.display = 'block';
    panel.style.borderColor = npc.color;
    document.getElementById('chat-portrait').style.borderColor = npc.color;
    document.getElementById('chat-portrait').style.boxShadow = `0 0 10px ${npc.color}66`;
    document.getElementById('chat-npc-name').style.color = npc.color;
    document.getElementById('chat-npc-name').textContent = `--- ${npc.name} ---`;
    document.getElementById('chat-next').textContent = 'NEXT';
    document.getElementById('chat-next').style.display = 'block';
    document.getElementById('chat-next').onclick = null;

    drawLevel3Portrait(npcKey);

    const lines = L3_DIALOG[npcKey];
    const idx = l3DialogIndex[npcKey];
    const lineData = lines[Math.min(idx, lines.length - 1)];
    const line = typeof lineData === 'object' ? lineData.text : lineData;
    const speaker = typeof lineData === 'object' ? lineData.speaker : null;
    startLevel3Typing(line);
    renderL3ChatLine(npcKey, line, speaker);
    // Update portrait and name for current speaker
    if (speaker) {
        const speakerNpc = L3_NPCS[speaker];
        document.getElementById('chat-npc-name').style.color = speakerNpc.color;
        document.getElementById('chat-npc-name').textContent = `--- ${speakerNpc.name} ---`;
        document.getElementById('chat-portrait').style.borderColor = speakerNpc.color;
        document.getElementById('chat-portrait').style.boxShadow = `0 0 10px ${speakerNpc.color}66`;
        drawLevel3Portrait(speaker);
    }

    // Trigger clues on first talk
    if (npcKey === 'shopkeeper') l3ShopkeeperTalked = true;
    if (npcKey === 'guard' && l3DialogIndex.guard === 0) {
        l3GridUnlocked = true;
        document.getElementById('notebook-btn').style.display = 'flex';
        addL3Clue("Performers: Jigglypuff, Mariah Carey, Cher.");
        addL3Clue("Purse contents: Book, PrEP, Microphone.");
    }
    if (npcKey === 'abraham' && l3DialogIndex.abraham === 0) {
        addL3Clue("Cher was already on stage when the robbery happened.");
    }
    if (npcKey === 'vanessa' && l3DialogIndex.vanessa === 0) {
        addL3Clue("Jigglypuff pulled a microphone from her purse during the show.");
    }
    if (npcKey === 'flint' && l3DialogIndex.flint === 0) {
        l3TalkedTo.flint = true;
        addL3Clue("Flint says Chuck is ashamed of doing drag and hides it from people.");
    }
    if (npcKey === 'chuck' && l3DialogIndex.chuck === 0) {
        l3TalkedTo.chuck = true;
        addL3Clue("Chuck is 340 pounds — physically impossible for him to be Skinny Mariah Carey.");
    }
    if (npcKey === 'aj' && l3DialogIndex.aj === 0) {
        l3TalkedTo.aj = true;
        addL3Clue("AJ says he performed as Cher.");
    }

    updateL3AccusationButton();
}

function closeLevel3Chat() {
    l3TalkingTo = null;
    l3State = 'free';
    l3Typewriting = null;
    l3AccusationOpen = false;
    document.getElementById('chat-panel').style.display = 'none';
    document.getElementById('chat-next').onclick = null;
    // Remove accuse button if it exists
    const accuseBtn = document.getElementById('l3-chat-accuse');
    if (accuseBtn) accuseBtn.remove();
}

function advanceLevel3Dialog() {
    if (!l3TalkingTo || l3AccusationOpen) return;

    // If typewriter still going, skip to end
    if (l3Typewriting && l3Typewriting.current !== l3Typewriting.full) {
        l3Typewriting.current = l3Typewriting.full;
        l3Typewriting.charIndex = l3Typewriting.full.length;
        renderL3ChatLine(l3TalkingTo, l3Typewriting.full);
        return;
    }

    const npcKey = l3TalkingTo;
    const lines = L3_DIALOG[npcKey];

    l3DialogIndex[npcKey]++;
    const idx = l3DialogIndex[npcKey];

    if (idx >= lines.length) {
        if (npcKey === 'shopkeeper' && !l3BookReveal) {
            l3BookReveal = true;
            closeLevel3Chat();
            l3State = 'book-reveal';
            return;
        }
        closeLevel3Chat();
        return;
    }

    const lineData = lines[idx];
    const line = typeof lineData === 'object' ? lineData.text : lineData;
    const speaker = typeof lineData === 'object' ? lineData.speaker : null;
    startLevel3Typing(line);
    renderL3ChatLine(npcKey, line, speaker);
    if (speaker) {
        const speakerNpc = L3_NPCS[speaker];
        document.getElementById('chat-npc-name').style.color = speakerNpc.color;
        document.getElementById('chat-npc-name').textContent = `--- ${speakerNpc.name} ---`;
        document.getElementById('chat-portrait').style.borderColor = speakerNpc.color;
        document.getElementById('chat-portrait').style.boxShadow = `0 0 10px ${speakerNpc.color}66`;
        drawLevel3Portrait(speaker);
    }
}

function startLevel3Typing(text) {
    l3Typewriting = { full: text, current: '', charIndex: 0 };
    l3TypeTimer = 0;
}

function renderL3ChatLine(npcKey, text, speakerKey) {
    const container = document.getElementById('chat-messages');
    const displayNpc = speakerKey ? L3_NPCS[speakerKey] : L3_NPCS[npcKey];
    const displayText = (l3Typewriting && l3Typewriting.current !== l3Typewriting.full)
        ? l3Typewriting.current : text;
    container.innerHTML = `<div class="msg-npc"><span style="color:${displayNpc.color}">${displayNpc.name}:</span> ${displayText}</div>`;
    document.getElementById('chat-next').style.display = 'block';
}

function updateL3ChatDisplay() {
    if (!l3TalkingTo || !l3Typewriting) return;
    const container = document.getElementById('chat-messages');
    const lines = L3_DIALOG[l3TalkingTo];
    const idx = l3DialogIndex[l3TalkingTo];
    const lineData = lines[Math.min(idx, lines.length - 1)];
    const speaker = typeof lineData === 'object' ? lineData.speaker : null;
    const displayNpc = speaker ? L3_NPCS[speaker] : L3_NPCS[l3TalkingTo];
    const firstDiv = container.querySelector('.msg-npc');
    if (firstDiv) {
        firstDiv.innerHTML = `<span style="color:${displayNpc.color}">${displayNpc.name}:</span> ${l3Typewriting.current}`;
    }
}

function addL3Clue(text) {
    if (!l3DiscoveredClues.includes(text)) l3DiscoveredClues.push(text);
}

function updateL3AccusationButton() {
    const allTalked = l3TalkedTo.chuck && l3TalkedTo.flint && l3TalkedTo.aj;
    const isSuspect = l3TalkingTo === 'chuck' || l3TalkingTo === 'flint' || l3TalkingTo === 'aj';

    let btn = document.getElementById('l3-chat-accuse');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'l3-chat-accuse';
        btn.style.cssText = 'margin-top:6px; width:calc(100% - 16px); margin-left:8px; background:#cc3030; border:2px solid #ff4444; border-radius:4px; color:#fff; font-family:monospace; font-size:11px; padding:6px 8px; cursor:pointer; box-shadow:0 0 10px rgba(204,48,48,0.3);';
        btn.addEventListener('click', openL3Accusation);
        document.getElementById('chat-panel').appendChild(btn);
    }
    const suspectName = l3TalkingTo ? (L3_NPCS[l3TalkingTo] ? L3_NPCS[l3TalkingTo].name : '') : '';
    btn.textContent = 'Accuse ' + suspectName;
    btn.style.display = (allTalked && isSuspect && !l3Solved && !l3AccusationOpen) ? 'block' : 'none';
}

function openL3Accusation() {
    l3AccusationOpen = true;
    const target = l3TalkingTo;
    const container = document.getElementById('chat-messages');
    const npc = L3_NPCS[target];
    container.innerHTML = `<div class="msg-npc"><span style="color:#ffcc00">You:</span> I think it was you, ${npc.name}.</div>`;
    container.innerHTML += '<div style="margin-top:8px; text-align:center; color:#aaa; font-size:11px;">Are you sure?</div>';
    container.innerHTML += '<div style="margin-top:6px; display:flex; gap:8px; justify-content:center;">';
    container.innerHTML += `<button id="l3-accuse-yes" style="padding:6px 20px; font-family:monospace; font-size:11px; cursor:pointer; background:#cc3030; border:2px solid #ff4444; border-radius:4px; color:#fff;">YES</button>`;
    container.innerHTML += `<button id="l3-accuse-no" style="padding:6px 20px; font-family:monospace; font-size:11px; cursor:pointer; background:rgba(255,255,255,0.1); border:2px solid #888; border-radius:4px; color:#aaa;">NO</button>`;
    container.innerHTML += '</div>';
    document.getElementById('chat-next').style.display = 'none';
    const accuseBtn = document.getElementById('l3-chat-accuse');
    if (accuseBtn) accuseBtn.style.display = 'none';

    setTimeout(() => {
        const yesBtn = document.getElementById('l3-accuse-yes');
        const noBtn = document.getElementById('l3-accuse-no');
        if (yesBtn) yesBtn.addEventListener('click', () => handleL3Accusation(target));
        if (noBtn) noBtn.addEventListener('click', () => {
            l3AccusationOpen = false;
            const lines = L3_DIALOG[target];
            const idx = l3DialogIndex[target];
            const lineData = lines[Math.min(idx, lines.length - 1)];
            const line = typeof lineData === 'object' ? lineData.text : lineData;
            renderL3ChatLine(target, line);
            document.getElementById('chat-next').style.display = 'block';
            updateL3AccusationButton();
        });
    }, 0);
}

function handleL3Accusation(target) {
    const container = document.getElementById('chat-messages');

    if (target === 'chuck') {
        container.innerHTML = '<div class="msg-npc"><span style="color:#cc4444">CHUCK:</span> No, it wasn\'t me.</div>';
        document.getElementById('chat-next').textContent = 'CLOSE';
        document.getElementById('chat-next').style.display = 'block';
        document.getElementById('chat-next').onclick = () => {
            l3AccusationOpen = false;
            document.getElementById('chat-next').onclick = null;
            closeLevel3Chat();
        };
    } else if (target === 'aj') {
        container.innerHTML = '<div class="msg-npc"><span style="color:#33ccff">AJ:</span> No, it wasn\'t me.</div>';
        document.getElementById('chat-next').textContent = 'CLOSE';
        document.getElementById('chat-next').style.display = 'block';
        document.getElementById('chat-next').onclick = () => {
            l3AccusationOpen = false;
            document.getElementById('chat-next').onclick = null;
            closeLevel3Chat();
        };
    } else if (target === 'flint') {
        document.getElementById('chat-next').style.display = 'none';
        container.innerHTML = '<div class="msg-npc"><span style="color:#ff8800">FLINT:</span> ...</div>';
        setTimeout(() => {
            container.innerHTML = '<div class="msg-npc"><span style="color:#ff8800">FLINT:</span> You\'re right. It was me.</div>';
            setTimeout(() => {
                container.innerHTML = '<div class="msg-npc"><span style="color:#ff8800">FLINT:</span> I was testing you, and you passed. Come, come now. I must show you something.</div>';
                setTimeout(() => {
                    container.innerHTML += '<div class="msg-npc" style="color:#ffcc00; text-align:center; margin-top:8px;">Follow me...</div>';
                    l3Solved = true;
                    l3AccusationOpen = false;
                    const accuseBtn = document.getElementById('l3-chat-accuse');
                    if (accuseBtn) accuseBtn.style.display = 'none';
                    document.getElementById('chat-next').textContent = 'CONTINUE';
                    document.getElementById('chat-next').style.display = 'block';
                    document.getElementById('chat-next').onclick = () => {
                        document.getElementById('chat-next').onclick = null;
                        closeLevel3Chat();
                        // Start Flint walking cutscene
                        l3FlintWalkX = L3_NPCS.flint.x;
                        l3FlintWalkY = L3_NPCS.flint.y;
                        l3FlintWalkPhase = 'to-hallway';
                        l3State = 'flint-walking';
                    };
                }, 1500);
            }, 1500);
        }, 1000);
    }
}

// ── Level 3 Notebook ──

function openL3Notebook() {
    l3State = 'notebook';
    l3Notebook.open = true;
    renderL3Notebook();
    document.getElementById('notebook-overlay').style.display = 'flex';
}

function renderL3Notebook() {
    const content = document.getElementById('notebook-content');
    let html = '<div style="color:#e8d070; font-size:12px; margin-bottom:12px; text-align:center; letter-spacing:2px;">--- DETECTIVE\'S NOTEBOOK ---</div>';

    if (!l3GridUnlocked) {
        html += '<div style="color:#8a8a7a; font-size:11px; line-height:20px; font-style:italic; text-align:center; padding:20px;">I need more info before I can start organizing...</div>';
    } else {
        // L-shaped grid: one unified table
        // Columns: [row label] | Book | PrEP | Mic | Jiggly | Mariah | Cher
        // Top 3 rows: Chuck, Flint, AJ (suspectItem left, suspectPersona right)
        // Bottom 3 rows: Jiggly, Mariah, Cher (personaItem left, empty right)
        html += '<table style="border-collapse:collapse; margin:0 auto 12px; font-family:monospace;">';
        // Column headers
        html += '<thead><tr><td style="width:46px;"></td>';
        // Items header group
        for (let c = 0; c < 3; c++) {
            const borderRight = (c === 2) ? 'border-right:2px solid #6a5090;' : '';
            html += `<td style="width:30px; text-align:center; color:#e8d070; font-size:8px; padding:2px; ${borderRight}">${L3_ITEMS[c]}</td>`;
        }
        // Personas header group
        for (let c = 0; c < 3; c++) {
            html += `<td style="width:30px; text-align:center; color:#e8d070; font-size:8px; padding:2px;">${L3_PERSONAS[c]}</td>`;
        }
        html += '</tr></thead><tbody>';

        // Top 3 rows: Suspects
        for (let r = 0; r < 3; r++) {
            const borderBottom = (r === 2) ? 'border-bottom:2px solid #6a5090;' : '';
            html += `<tr><td style="color:#e8d070; font-size:9px; text-align:right; padding-right:4px; ${borderBottom}">${L3_SUSPECTS[r]}</td>`;
            // Suspect x Item cells (top-left quadrant)
            for (let c = 0; c < 3; c++) {
                const val = l3Notebook.suspectItem[r][c];
                const display = val === 'check' ? '✓' : val === 'x' ? '✗' : val === '?' ? '?' : '';
                const color = val === 'check' ? '#44ff44' : val === 'x' ? '#ff4444' : val === '?' ? '#e8d070' : '#888';
                const brRight = (c === 2) ? 'border-right:2px solid #6a5090;' : '';
                html += `<td data-grid="si" data-r="${r}" data-c="${c}" class="l3-nb-cell" style="width:30px; height:30px; border:1px solid #3a3060; background:#1a1420; text-align:center; cursor:pointer; font-size:14px; color:${color}; user-select:none; ${borderBottom}${brRight}">${display}</td>`;
            }
            // Suspect x Persona cells (top-right quadrant)
            for (let c = 0; c < 3; c++) {
                const val = l3Notebook.suspectPersona[r][c];
                const display = val === 'check' ? '✓' : val === 'x' ? '✗' : val === '?' ? '?' : '';
                const color = val === 'check' ? '#44ff44' : val === 'x' ? '#ff4444' : val === '?' ? '#e8d070' : '#888';
                html += `<td data-grid="sp" data-r="${r}" data-c="${c}" class="l3-nb-cell" style="width:30px; height:30px; border:1px solid #3a3060; background:#1a1420; text-align:center; cursor:pointer; font-size:14px; color:${color}; user-select:none; ${borderBottom}">${display}</td>`;
            }
            html += '</tr>';
        }

        // Bottom 3 rows: Personas
        for (let r = 0; r < 3; r++) {
            html += `<tr><td style="color:#e8d070; font-size:9px; text-align:right; padding-right:4px;">${L3_PERSONAS[r]}</td>`;
            // Persona x Item cells (bottom-left quadrant)
            for (let c = 0; c < 3; c++) {
                const val = l3Notebook.personaItem[r][c];
                const display = val === 'check' ? '✓' : val === 'x' ? '✗' : val === '?' ? '?' : '';
                const color = val === 'check' ? '#44ff44' : val === 'x' ? '#ff4444' : val === '?' ? '#e8d070' : '#888';
                const brRight = (c === 2) ? 'border-right:2px solid #6a5090;' : '';
                html += `<td data-grid="pi" data-r="${r}" data-c="${c}" class="l3-nb-cell" style="width:30px; height:30px; border:1px solid #3a3060; background:#1a1420; text-align:center; cursor:pointer; font-size:14px; color:${color}; user-select:none; ${brRight}">${display}</td>`;
            }
            // Empty cells (bottom-right quadrant — Persona x Persona, no interaction)
            for (let c = 0; c < 3; c++) {
                html += '<td style="width:30px; height:30px; border:1px solid #2a2040; background:#0f0a18;"></td>';
            }
            html += '</tr>';
        }

        html += '</tbody></table>';
    }

    // Clues (scrollable)
    html += '<div style="border-top:1px solid #3a3060; padding-top:10px; margin-bottom:10px; max-height:120px; overflow-y:auto;">';
    html += '<div style="color:#e8d070; font-size:10px; margin-bottom:6px; text-align:center;">--- CLUES & EVIDENCE ---</div>';
    if (l3DiscoveredClues.length === 0) {
        html += '<div style="color:#8a8a7a; font-size:10px; line-height:18px; font-style:italic;">No clues discovered yet. Talk to people.</div>';
    } else {
        for (const clue of l3DiscoveredClues) {
            html += `<div style="color:#c8b880; font-size:10px; line-height:18px; margin-bottom:4px;">* ${clue}</div>`;
        }
    }
    html += '</div>';

    // Buttons
    html += '<div style="display:flex; gap:8px; justify-content:center;">';
    html += '<button id="l3-nb-reset" style="font-family:monospace; font-size:10px; padding:6px 12px; background:transparent; color:#ff6644; border:1px solid #ff6644; border-radius:4px; cursor:pointer;">RESET GRID</button>';
    html += '<button id="l3-nb-close" style="font-family:monospace; font-size:10px; padding:6px 12px; background:transparent; color:#e8d070; border:2px solid #e8d070; border-radius:4px; cursor:pointer;">CLOSE (ESC)</button>';
    html += '</div>';

    content.innerHTML = html;

    // Cell click handlers
    content.querySelectorAll('.l3-nb-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            const gridType = cell.dataset.grid;
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);
            toggleL3NotebookCell(gridType, r, c);
            renderL3Notebook();
        });
    });

    const resetBtn = document.getElementById('l3-nb-reset');
    if (resetBtn) resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        l3Notebook.suspectItem = [['','',''],['','',''],['','','']];
        l3Notebook.suspectPersona = [['','',''],['','',''],['','','']];
        l3Notebook.personaItem = [['','',''],['','',''],['','','']];
        l3Notebook.autoMarks = {};
        renderL3Notebook();
    });
    const closeBtn = document.getElementById('l3-nb-close');
    if (closeBtn) closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        l3Notebook.open = false;
        l3State = 'free';
        document.getElementById('notebook-overlay').style.display = 'none';
    });
}

function getL3Grid(gridType) {
    if (gridType === 'si') return l3Notebook.suspectItem;
    if (gridType === 'sp') return l3Notebook.suspectPersona;
    if (gridType === 'pi') return l3Notebook.personaItem;
    return null;
}

function toggleL3NotebookCell(gridType, row, col) {
    const grid = getL3Grid(gridType);
    if (!grid) return;
    const current = grid[row][col];
    const cycle = { '': 'check', 'check': 'x', 'x': '?', '?': '' };
    const next = cycle[current] || '';

    // Remove old auto-marks
    const cellKey = `${gridType}-${row}-${col}`;
    if (l3Notebook.autoMarks[cellKey]) {
        for (const mark of l3Notebook.autoMarks[cellKey]) {
            const g = getL3Grid(mark.grid);
            if (g && g[mark.r][mark.c] === 'x') {
                g[mark.r][mark.c] = '';
            }
        }
        delete l3Notebook.autoMarks[cellKey];
    }

    grid[row][col] = next;

    // If placing a check, auto-x the rest of row and column within this sub-grid
    if (next === 'check') {
        const marked = [];
        for (let c = 0; c < 3; c++) {
            if (c !== col && grid[row][c] === '') {
                grid[row][c] = 'x';
                marked.push({ grid: gridType, r: row, c });
            }
        }
        for (let r = 0; r < 3; r++) {
            if (r !== row && grid[r][col] === '') {
                grid[r][col] = 'x';
                marked.push({ grid: gridType, r, c: col });
            }
        }
        l3Notebook.autoMarks[cellKey] = marked;
    }
}

// ── Level 3 Update ──

function updateLevel3() {
    // Typewriter advancement
    if (l3Typewriting && l3Typewriting.charIndex < l3Typewriting.full.length) {
        l3TypeTimer++;
        if (l3TypeTimer >= 1) {
            l3TypeTimer = 0;
            l3Typewriting.charIndex += 2;
            if (l3Typewriting.charIndex > l3Typewriting.full.length) l3Typewriting.charIndex = l3Typewriting.full.length;
            l3Typewriting.current = l3Typewriting.full.substring(0, l3Typewriting.charIndex);
            if (l3TalkingTo) updateL3ChatDisplay();
        }
    }

    if (l3State === 'shop-intro') {
        l3ShopTimer++;
        if (l3ShopTextPhase === 'fadein') {
            l3ShopTextAlpha += 0.015;
            if (l3ShopTextAlpha >= 1) { l3ShopTextAlpha = 1; l3ShopTextPhase = 'hold'; l3ShopTimer = 0; }
        } else if (l3ShopTextPhase === 'hold') {
            if (l3ShopTimer > 120) { l3ShopTextPhase = 'fadeout'; }
        } else if (l3ShopTextPhase === 'fadeout') {
            l3ShopTextAlpha -= 0.015;
            if (l3ShopTextAlpha <= 0) {
                l3ShopTextAlpha = 0;
                l3ShopTextIndex++;
                if (l3ShopTextIndex < L3_SHOP_THOUGHTS.length) {
                    l3ShopTextPhase = 'fadein';
                    l3ShopTimer = 0;
                } else {
                    l3ShopTextPhase = 'done';
                    l3State = 'free';
                }
            }
        }
        return;
    }

    if (l3State === 'chat') return;
    if (l3State === 'notebook') return;

    if (l3State === 'complete') {
        l3CompleteTimer++;
        return;
    }

    if (l3State === 'flint-walking') {
        const walkSpd = 1.5;
        const doorX = 340, doorY = 460; // middle decorative door on right wall
        if (l3FlintWalkPhase === 'to-hallway') {
            // Flint walks down from piano area into the hallway
            l3FlintWalkY += walkSpd;
            if (l3FlintWalkY >= 400) {
                l3FlintWalkPhase = 'to-door';
            }
        } else if (l3FlintWalkPhase === 'to-door') {
            // Flint walks toward the decorative door on the right wall
            const dx = doorX - l3FlintWalkX;
            const dy = doorY - l3FlintWalkY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 4) {
                l3FlintWalkPhase = 'done';
                l3State = 'complete';
                l3CompleteTimer = 0;
            } else {
                l3FlintWalkX += (dx / dist) * walkSpd;
                l3FlintWalkY += (dy / dist) * walkSpd;
            }
        }
        // Player auto-follows behind Flint
        const followDist = 40;
        const pfx = l3FlintWalkX;
        const pfy = l3FlintWalkY - followDist;
        const pdx = pfx - l3PlayerX;
        const pdy = pfy - l3PlayerY;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pDist > 4) {
            l3PlayerX += (pdx / pDist) * walkSpd;
            l3PlayerY += (pdy / pDist) * walkSpd;
        }
        // Update player facing direction
        if (Math.abs(pdx) > Math.abs(pdy)) {
            l3PlayerFacing = pdx > 0 ? 'right' : 'left';
        } else {
            l3PlayerFacing = pdy > 0 ? 'down' : 'up';
        }
        // Camera follows the player
        if (l3Room === 'roundabout') {
            const targetCamY = l3PlayerY - HEIGHT / 2;
            l3Camera.y = Math.max(0, Math.min(targetCamY, L3_ROUNDABOUT_HEIGHT - HEIGHT));
        }
        return;
    }

    if (l3State !== 'free') return;

    // Player movement
    let moved = false;
    let newX = l3PlayerX;
    let newY = l3PlayerY;
    const spd = 2.5;

    if (keys['arrowleft'] || keys['a']) { newX -= spd; l3PlayerFacing = 'left'; moved = true; }
    if (keys['arrowright'] || keys['d']) { newX += spd; l3PlayerFacing = 'right'; moved = true; }
    if (keys['arrowup'] || keys['w']) { newY -= spd; l3PlayerFacing = 'up'; moved = true; }
    if (keys['arrowdown'] || keys['s']) { newY += spd; l3PlayerFacing = 'down'; moved = true; }

    // Bounds — roundabout room has variable width (wide top, narrow hallway bottom)
    if (l3Room === 'roundabout') {
        // Outer bounds for full room
        let minX = 4, maxX = 450, minY = 4, maxY = L3_ROUNDABOUT_HEIGHT - 40;
        if (newX < minX) newX = minX;
        if (newX > maxX) newX = maxX;
        if (newY < minY) newY = minY;
        if (newY > maxY) newY = maxY;
        // Transition zone (y: 280-350): walls narrow linearly
        if (newY > 280 && newY <= 350) {
            const t = (newY - 280) / 70; // 0 at y=280, 1 at y=350
            const leftWall = 44 + t * (134 - 44);
            const rightWall = 430 - t * (430 - 310);
            if (newX < leftWall) newX = leftWall;
            if (newX > rightWall) newX = rightWall;
        }
        // In hallway section, constrain X to narrow corridor
        if (newY > 350) {
            if (newX < 134) newX = 134;
            if (newX > 310) newX = 310;
        }
    } else {
        const minX = 4;
        const maxX = 452;
        const minY = 4;
        const maxY = 290;
        if (newX < minX) newX = minX;
        if (newX > maxX) newX = maxX;
        if (newY < minY) newY = minY;
        if (newY > maxY) newY = maxY;
    }

    // Collision
    const pw = 24, ph = 36;
    const roomColliders = L3_COLLIDERS[l3Room] || [];
    // Add NPC colliders for current room
    const npcColliders = [];
    for (const key of Object.keys(L3_NPCS)) {
        const npc = L3_NPCS[key];
        if (npc.room === l3Room) {
            npcColliders.push({ x: npc.x + 4, y: npc.y + 8, w: 16, h: 28 });
        }
    }
    const allColliders = roomColliders.concat(npcColliders);

    if (!collidesWithAny(newX, newY, pw, ph, allColliders)) {
        l3PlayerX = newX;
        l3PlayerY = newY;
    } else {
        if (!collidesWithAny(newX, l3PlayerY, pw, ph, allColliders)) {
            l3PlayerX = newX;
        } else if (!collidesWithAny(l3PlayerX, newY, pw, ph, allColliders)) {
            l3PlayerY = newY;
        }
    }
    if (moved) player.animTimer++;

    // Camera tracking for roundabout (scrolls vertically)
    if (l3Room === 'roundabout') {
        l3Camera.y = l3PlayerY - HEIGHT / 2 + 18;
        if (l3Camera.y < 0) l3Camera.y = 0;
        if (l3Camera.y > L3_ROUNDABOUT_HEIGHT - HEIGHT) l3Camera.y = L3_ROUNDABOUT_HEIGHT - HEIGHT;
    } else {
        l3Camera.y = 0;
    }

    // Music: piano in roundabout+chucks-room, level3 everywhere else
    if (musicEnabled) {
        const wantPiano = l3Room === 'roundabout' || l3Room === 'chucks-room';
        GameMusic.startMusic(wantPiano ? 'piano' : 'level3');
    }

    // Door proximity / transition
    l3NearDoor = null;
    const doors = L3_DOORS[l3Room] || [];
    const pcx = l3PlayerX + 12;
    const pcy = l3PlayerY + 18;
    for (const door of doors) {
        if (pcx > door.x && pcx < door.x + door.w && pcy > door.y && pcy < door.y + door.h) {
            // Block shop exit until shopkeeper talked to
            if (l3Room === 'shop' && !l3ShopkeeperTalked) {
                l3State = 'shop-exit-blocked';
                dialogBox.innerHTML = '<span style="color:#ffcc00;">I should talk to the shop owner first.</span><br><br><span style="color:#aaa">Press any key...</span>';
                dialogBox.classList.add('visible');
                promptEl.classList.remove('visible');
                l3PlayerX = 30;
                return;
            }
            const prevRoom = l3Room;
            const prevY = l3PlayerY;
            l3Room = door.target;
            l3PlayerX = door.playerX;
            l3PlayerY = door.playerY;
            l3PlayerFacing = door.facing;
            l3NearNpc = null;
            promptEl.classList.remove('visible');
            if (musicEnabled) {
                const prevPiano = prevRoom === 'chucks-room' || prevRoom === 'roundabout';
                const nowPiano = l3Room === 'chucks-room' || l3Room === 'roundabout';
                if (prevPiano !== nowPiano) {
                    GameMusic.stopMusic();
                    GameMusic.startMusic(nowPiano ? 'piano' : 'level3');
                }
            }
            return;
        }
        // Near door indicator
        const dcx = door.x + door.w / 2;
        const dcy = door.y + door.h / 2;
        if (Math.abs(pcx - dcx) < 40 && Math.abs(pcy - dcy) < 40) {
            l3NearDoor = door;
        }
    }

    // NPC proximity check (shopkeeper gets extra range — talk across counter)
    l3NearNpc = null;
    for (const key of Object.keys(L3_NPCS)) {
        const npc = L3_NPCS[key];
        if (npc.room !== l3Room) continue;
        const ncx = npc.x + 12;
        const ncy = npc.y + 18;
        const range = key === 'shopkeeper' ? 80 : 50;
        if (Math.abs(pcx - ncx) < range && Math.abs(pcy - ncy) < range) {
            l3NearNpc = key;
            break;
        }
    }

    if (l3NearNpc && gameState === 'level3') {
        promptEl.classList.add('visible');
        promptEl.textContent = isMobile() ? 'Tap LOOK to talk' : 'Press E or SPACE to talk';
    } else if (l3NearDoor) {
        promptEl.classList.add('visible');
        promptEl.textContent = l3NearDoor.label || 'Door';
    } else {
        promptEl.classList.remove('visible');
    }
}

// ── Level 3 Drawing ──

function drawLevel3() {
    switch (l3Room) {
        case 'shop': drawL3Shop(); break;
        case 'roundabout': drawL3Roundabout(); break;
        case 'theater': drawL3Theater(); break;
        case 'chucks-room': drawL3ChucksRoom(); break;
        case 'jewelry': drawL3Jewelry(); break;
    }

    // NPC highlight when near
    if (l3NearNpc && l3State === 'free') {
        const npc = L3_NPCS[l3NearNpc];
        if (npc.room === l3Room) {
            const bob = Math.sin(Date.now() * 0.005) * 3;
            const camY = (l3Room === 'roundabout') ? l3Camera.y : 0;
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(npc.x + 12, npc.y - 10 + bob - camY);
            ctx.lineTo(npc.x + 7, npc.y - 18 + bob - camY);
            ctx.lineTo(npc.x + 17, npc.y - 18 + bob - camY);
            ctx.fill();
        }
    }

    // Book reveal overlay (same purple book from the dream)
    if (l3State === 'book-reveal') {
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        // Large purple book
        ctx.fillStyle = '#5a1a7a';
        ctx.fillRect(140, 40, 200, 240);
        ctx.fillStyle = '#7a2a9a';
        ctx.fillRect(145, 45, 190, 230);
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
    }

    // Thought text overlay for shop intro
    if (l3State === 'shop-intro' && l3ShopTextAlpha > 0 && l3ShopTextIndex < L3_SHOP_THOUGHTS.length) {
        const text = L3_SHOP_THOUGHTS[l3ShopTextIndex];
        const lines = text.split('\n');
        const bandH = 20 + lines.length * 18;
        ctx.fillStyle = `rgba(0, 0, 20, ${l3ShopTextAlpha * 0.7})`;
        ctx.fillRect(0, HEIGHT / 2 - bandH / 2, WIDTH, bandH);
        ctx.fillStyle = `rgba(255, 255, 255, ${l3ShopTextAlpha})`;
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], WIDTH / 2, HEIGHT / 2 - (lines.length - 1) * 9 + i * 18 + 5);
        }
        ctx.textAlign = 'left';
    }

    // Complete overlay
    if (l3State === 'complete') {
        const alpha = Math.min(l3CompleteTimer / 120, 1);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        if (alpha > 0.3) {
            ctx.fillStyle = `rgba(255, 204, 0, ${Math.min((alpha - 0.3) / 0.3, 1)})`;
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL 3 COMPLETE', WIDTH / 2, HEIGHT / 2 - 10);
            ctx.font = '12px monospace';
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min((alpha - 0.3) / 0.3, 1)})`;
            ctx.fillText('Flint had the book all along...', WIDTH / 2, HEIGHT / 2 + 20);
            ctx.textAlign = 'left';
        }
    }

    // Room name indicator (top left)
    if (l3State === 'free' || l3State === 'shop-intro') {
        const roomNames = {
            'shop': 'Antique Shop', 'roundabout': (l3PlayerY > 350 ? 'Hallway' : 'Roundabout'), 'theater': 'Theater',
            'chucks-room': "Chuck's Room", 'jewelry': 'Jewelry Store'
        };
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(4, 4, 100, 18);
        ctx.fillStyle = '#e8d070';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(roomNames[l3Room] || l3Room, 8, 16);
    }
}

function drawL3Player() {
    const px = Math.floor(l3PlayerX);
    const py = Math.floor(l3Room === 'roundabout' ? l3sy(l3PlayerY) : l3PlayerY);
    const char = selectedChar || CHARACTERS[0];
    const moving = isMoving() && l3State === 'free';
    const bounce = Math.sin(player.animTimer * 0.15) * (moving ? 1.5 : 0);
    const legSwing = moving ? Math.sin(player.animTimer * 0.22) * 3 : 0;
    const armSwing = moving ? Math.sin(player.animTimer * 0.18) * 2 : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + 12, py + 36, 13, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (l3PlayerFacing === 'up') drawCharBack(px, py, bounce, legSwing, armSwing, char);
    else if (l3PlayerFacing === 'down') drawCharFront(px, py, bounce, legSwing, armSwing, char);
    else if (l3PlayerFacing === 'left') drawCharSide(px, py, bounce, legSwing, armSwing, -1, char);
    else drawCharSide(px, py, bounce, legSwing, armSwing, 1, char);
}

// ── Room Drawing Functions ──

function drawL3RoomFloor() {
    // Standard floor for most rooms
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let x = 0; x < WIDTH; x += 24) {
        for (let y = 0; y < HEIGHT; y += 24) {
            ctx.fillStyle = '#321e44';
            ctx.fillRect(x + 2, y + 2, 10, 10);
        }
    }
}

function drawL3ShopFloor() {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#4a3a2a';
    for (let x = 0; x < WIDTH; x += 32) {
        for (let y = 160; y < HEIGHT; y += 32) {
            ctx.fillRect(x + 1, y + 1, 30, 30);
        }
    }
}

function drawL3DoorIndicator(door) {
    // Draw a glowing door opening
    const isNear = l3NearDoor === door;
    ctx.fillStyle = isNear ? 'rgba(255, 204, 0, 0.4)' : 'rgba(100, 80, 60, 0.3)';
    ctx.fillRect(door.x, door.y, door.w, door.h);
    if (isNear) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(door.x, door.y, door.w, door.h);
    }
}

function drawL3Shop() {
    drawL3ShopFloor();

    // Back wall
    ctx.fillStyle = '#5c4a3a';
    ctx.fillRect(0, 0, WIDTH, 160);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(0, 155, WIDTH, 8);

    // Shelves
    ctx.fillStyle = '#8b6040';
    ctx.fillRect(20, 40, 120, 10);
    ctx.fillRect(20, 80, 120, 10);
    ctx.fillRect(20, 120, 120, 10);
    ctx.fillRect(340, 40, 120, 10);
    ctx.fillRect(340, 80, 120, 10);
    ctx.fillRect(340, 120, 120, 10);

    // Items on shelves
    const shelfItems = [
        [30, 28, '#ff6666'], [55, 30, '#66ff66'], [85, 26, '#6666ff'], [110, 28, '#ffcc00'],
        [30, 68, '#ff99cc'], [60, 70, '#99ffcc'], [90, 66, '#cc99ff'],
        [30, 108, '#ffaa44'], [65, 106, '#44aaff'], [95, 110, '#ff44aa'],
        [350, 28, '#66ccff'], [375, 30, '#ffcc66'], [400, 26, '#cc66ff'], [430, 28, '#66ffcc'],
        [350, 68, '#ff8844'], [380, 70, '#4488ff'], [410, 66, '#88ff44'],
        [350, 108, '#ff4488'], [385, 106, '#44ff88'], [420, 110, '#8844ff'],
    ];
    for (const [ix, iy, ic] of shelfItems) {
        ctx.fillStyle = ic;
        ctx.fillRect(ix, iy, 12, 10);
    }

    // Display case (center back) — empty spot where the book was
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(190, 50, 100, 80);
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 2;
    ctx.strokeRect(190, 50, 100, 80);
    // Empty book stand (the book was stolen)
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(225, 95, 30, 6);
    ctx.fillRect(232, 88, 16, 8);
    // "ANTIQUES" label on display case
    ctx.fillStyle = '#e8d070';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ANTIQUES', 240, 62);
    ctx.textAlign = 'left';

    // Counter
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(160, 180, 160, 25);
    ctx.fillStyle = '#8b6040';
    ctx.fillRect(160, 175, 160, 8);
    // Cash register
    ctx.fillStyle = '#444';
    ctx.fillRect(220, 165, 30, 18);
    ctx.fillStyle = '#66ff66';
    ctx.fillRect(225, 168, 20, 8);

    // Shopkeeper
    drawShopkeeper(L3_NPCS.shopkeeper.x, L3_NPCS.shopkeeper.y);

    // Door to roundabout (left wall)
    for (const door of L3_DOORS.shop) drawL3DoorIndicator(door);

    // Left wall door frame
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 95, 12, 110);
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 100, 8, 100);

    // Player
    drawL3Player();
}

function drawL3Roundabout() {
    // Full-height floor for scrollable room
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Floor tiles (only draw visible area for performance)
    const startTileY = Math.floor(l3Camera.y / 24) * 24;
    const endTileY = l3Camera.y + HEIGHT + 24;
    for (let x = 0; x < WIDTH; x += 24) {
        for (let wy = startTileY; wy < endTileY; wy += 24) {
            ctx.fillStyle = '#321e44';
            ctx.fillRect(x + 2, l3sy(wy) + 2, 10, 10);
        }
    }

    // === TOP AREA: Roundabout (y: 0 - 320) ===
    // Walls
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, l3sy(0), WIDTH, 40);     // north wall
    ctx.fillRect(0, l3sy(0), 40, 320);       // west wall
    ctx.fillRect(440, l3sy(0), 40, 320);     // east wall
    // Wall trim
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(0, l3sy(36), WIDTH, 4);
    ctx.fillRect(36, l3sy(0), 4, 320);
    ctx.fillRect(440, l3sy(0), 4, 320);

    // Grand piano in center
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(170, l3sy(105), 70, 100);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(175, l3sy(110), 60, 90);
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(170, l3sy(155), 15, 50, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(158, l3sy(105), 14, 100);
    ctx.fillStyle = '#333';
    ctx.fillRect(160, l3sy(108), 10, 94);
    ctx.fillStyle = '#444';
    ctx.fillRect(168, l3sy(115), 2, 30);
    ctx.fillStyle = '#eee';
    ctx.fillRect(235, l3sy(115), 12, 80);
    for (let k = 0; k < 10; k++) {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(235, l3sy(116 + k * 8), 12, 1);
    }
    for (let k = 0; k < 7; k++) {
        if (k % 3 !== 2) {
            ctx.fillStyle = '#111';
            ctx.fillRect(235, l3sy(118 + k * 11), 7, 6);
        }
    }
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(172, l3sy(200), 4, 10);
    ctx.fillRect(230, l3sy(200), 4, 10);
    ctx.fillRect(172, l3sy(105), 4, 8);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(248, l3sy(135), 16, 40);
    ctx.fillStyle = '#3a1a0a';
    ctx.fillRect(250, l3sy(137), 12, 36);

    // Door frames — roundabout top area
    // North (theater)
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(195, l3sy(0), 90, 10);
    ctx.fillStyle = '#030305';
    ctx.fillRect(200, l3sy(0), 80, 6);
    // East (shop)
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(450, l3sy(115), 30, 90);
    ctx.fillStyle = '#030305';
    ctx.fillRect(456, l3sy(120), 24, 80);
    // West (jewelry)
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, l3sy(115), 10, 90);
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, l3sy(120), 6, 80);

    // Sconces (top area)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(42, l3sy(80), 4, 4);
    ctx.fillRect(434, l3sy(80), 4, 4);
    ctx.fillRect(42, l3sy(220), 4, 4);
    ctx.fillRect(434, l3sy(220), 4, 4);
    ctx.fillStyle = 'rgba(255, 200, 0, 0.10)';
    ctx.beginPath(); ctx.arc(44, l3sy(82), 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(436, l3sy(82), 16, 0, Math.PI * 2); ctx.fill();

    // === TRANSITION ZONE (y: 280-350) ===
    // Walls narrow from 40px insets to hallway width (130px insets)
    ctx.fillStyle = '#3a2a5c';
    // Left wall narrows
    ctx.beginPath();
    ctx.moveTo(0, l3sy(280));
    ctx.lineTo(40, l3sy(280));
    ctx.lineTo(130, l3sy(350));
    ctx.lineTo(0, l3sy(350));
    ctx.fill();
    // Right wall narrows
    ctx.beginPath();
    ctx.moveTo(440, l3sy(280));
    ctx.lineTo(480, l3sy(280));
    ctx.lineTo(480, l3sy(350));
    ctx.lineTo(340, l3sy(350));
    ctx.fill();
    // Trim on transition walls
    ctx.fillStyle = '#4a2a1a';
    ctx.beginPath();
    ctx.moveTo(36, l3sy(280));
    ctx.lineTo(130, l3sy(350));
    ctx.lineTo(134, l3sy(350));
    ctx.lineTo(40, l3sy(280));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(440, l3sy(280));
    ctx.lineTo(340, l3sy(350));
    ctx.lineTo(336, l3sy(350));
    ctx.lineTo(444, l3sy(280));
    ctx.fill();

    // === HALLWAY AREA (y: 350 - 700) ===
    // Left wall (with gap for Chuck's door at y:430-490)
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, l3sy(350), 130, 80);     // above Chuck's door
    ctx.fillRect(0, l3sy(490), 130, 210);    // below Chuck's door
    // Right wall (solid, with decorative doors drawn on it)
    ctx.fillRect(340, l3sy(350), 140, 350);
    // Wall trim hallway
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(126, l3sy(350), 4, 80);     // left trim above door
    ctx.fillRect(126, l3sy(490), 4, 210);    // left trim below door
    ctx.fillRect(340, l3sy(350), 4, 350);    // right trim
    // End wall
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(130, l3sy(680), 210, 20);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(130, l3sy(676), 210, 4);

    // Chuck's door (left wall, y:430-490) — actual working door
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(130, l3sy(425), 4, 70);
    ctx.fillRect(130 + 40, l3sy(425), 4, 70);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(134, l3sy(430), 36, 60);
    ctx.fillStyle = '#6d3a0a';
    ctx.fillRect(138, l3sy(434), 28, 24);
    ctx.fillRect(138, l3sy(462), 28, 24);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(160, l3sy(458), 4, 4);
    // Room number
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('501', 152, l3sy(422));

    // Decorative locked doors (right wall)
    for (let i = 0; i < 3; i++) {
        const dy = 380 + i * 80;
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(336, l3sy(dy), 4, 60);
        ctx.fillRect(336 + 36, l3sy(dy), 4, 60);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(340, l3sy(dy + 4), 28, 52);
        ctx.fillStyle = '#6d3a0a';
        ctx.fillRect(344, l3sy(dy + 8), 20, 20);
        ctx.fillRect(344, l3sy(dy + 32), 20, 18);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(346, l3sy(dy + 28), 4, 4);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${502 + i}`, 354, l3sy(dy - 2));
    }

    // Hallway sconces
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(132, l3sy(520), 4, 4);
    ctx.fillRect(334, l3sy(520), 4, 4);
    ctx.fillStyle = 'rgba(255, 200, 0, 0.10)';
    ctx.beginPath(); ctx.arc(134, l3sy(522), 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(336, l3sy(522), 16, 0, Math.PI * 2); ctx.fill();

    // Door indicators (glow zones)
    for (const door of L3_DOORS.roundabout) {
        const isNear = l3NearDoor === door;
        ctx.fillStyle = isNear ? 'rgba(255, 204, 0, 0.4)' : 'rgba(100, 80, 60, 0.3)';
        ctx.fillRect(door.x, l3sy(door.y), door.w, door.h);
        if (isNear) {
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.strokeRect(door.x, l3sy(door.y), door.w, door.h);
        }
    }

    // Flint seated at piano (emo look — black clothes, long hair covering one eye, eyeliner)
    if (l3State !== 'flint-walking') {
    const fx = L3_NPCS.flint.x, fy = l3sy(L3_NPCS.flint.y);
    // Legs (skinny black jeans, seated)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(fx + 4, fy + 22, 6, 8);
    ctx.fillRect(fx + 12, fy + 22, 6, 8);
    // Seated hips
    ctx.fillStyle = '#111';
    ctx.fillRect(fx + 3, fy + 18, 18, 6);
    // Torso (black hoodie)
    ctx.fillStyle = '#111';
    ctx.fillRect(fx + 2, fy + 4, 16, 15);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(fx + 2, fy + 17, 16, 2);
    // Hood/collar detail
    ctx.fillStyle = '#222';
    ctx.fillRect(fx + 4, fy + 4, 12, 3);
    // Arms reaching to piano (slender, black sleeves)
    ctx.fillStyle = '#111';
    ctx.fillRect(fx - 6, fy + 8, 10, 3);
    ctx.fillRect(fx - 6, fy + 14, 10, 3);
    // Hands on keys
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(fx - 10, fy + 7, 5, 5);
    ctx.fillRect(fx - 10, fy + 13, 5, 5);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(fx + 4, fy - 6, 12, 10);
    // Long emo hair (covers one eye, swept to the side)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(fx + 3, fy - 11, 14, 6);
    ctx.fillRect(fx + 2, fy - 8, 6, 10); // hair hanging over left eye
    ctx.fillRect(fx + 14, fy - 8, 4, 5);
    // Hair fringe covering left side of face
    ctx.fillStyle = '#111';
    ctx.fillRect(fx + 3, fy - 5, 7, 6);
    // Only right eye visible with eyeliner
    ctx.fillStyle = '#000';
    ctx.fillRect(fx + 12, fy - 3, 4, 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(fx + 13, fy - 2, 2, 2);
    // Thin mouth
    ctx.fillStyle = '#666';
    ctx.fillRect(fx + 8, fy + 1, 5, 1);
    }

    // Flint walking (during accusation cutscene)
    if (l3State === 'flint-walking') {
        const fwFacing = l3FlintWalkPhase === 'to-hallway' ? 'down' :
            (l3FlintWalkX < 340 ? 'right' : 'down');
        drawFlintSprite(l3FlintWalkX, l3sy(l3FlintWalkY), fwFacing);
    }

    // Blake in hallway section
    drawBlakeSprite(L3_NPCS.blake.x, l3sy(L3_NPCS.blake.y), L3_NPCS.blake.facing);

    // Vanessa in hallway section
    drawVanessaSprite(L3_NPCS.vanessa.x, l3sy(L3_NPCS.vanessa.y), L3_NPCS.vanessa.facing);

    // Player
    drawL3Player();

    // Door labels
    ctx.fillStyle = '#e8d070';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THEATER', 240, l3sy(26));
    ctx.fillText('SHOP', 460, l3sy(112));
    ctx.fillText('JEWELRY', 16, l3sy(112));
    ctx.textAlign = 'left';
}

function drawL3Theater() {
    // Dark theater background
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Stage
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(60, 40, 360, 80);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(60, 115, 360, 8);

    // Red curtains
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 10, 55, 120);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(15, 10, 20, 120);
    ctx.fillRect(40, 10, 15, 120);
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(415, 10, 55, 120);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(420, 10, 20, 120);
    ctx.fillRect(445, 10, 15, 120);

    // Curtain valance
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 10, WIDTH - 20, 20);

    // Floor (audience area)
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(0, 130, WIDTH, HEIGHT - 130);
    for (let x = 0; x < WIDTH; x += 24) {
        for (let y = 130; y < HEIGHT; y += 24) {
            ctx.fillStyle = '#321e44';
            ctx.fillRect(x + 2, y + 2, 10, 10);
        }
    }

    // Chairs/seats (rows)
    for (let row = 0; row < 2; row++) {
        for (let seat = 0; seat < 8; seat++) {
            ctx.fillStyle = '#8b0000';
            ctx.fillRect(60 + seat * 46, 135 + row * 30, 36, 20);
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(62 + seat * 46, 137 + row * 30, 32, 10);
        }
    }

    // Security guard
    drawSecurityGuard(L3_NPCS.guard.x, L3_NPCS.guard.y, L3_NPCS.guard.facing);

    // Door to roundabout (south)
    for (const door of L3_DOORS.theater) drawL3DoorIndicator(door);
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(195, 306, 90, 14);
    ctx.fillStyle = '#030305';
    ctx.fillRect(200, 308, 80, 10);

    // Spotlights
    ctx.fillStyle = 'rgba(255, 255, 200, 0.08)';
    ctx.beginPath();
    ctx.moveTo(200, 10);
    ctx.lineTo(170, 120);
    ctx.lineTo(230, 120);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(300, 10);
    ctx.lineTo(270, 120);
    ctx.lineTo(330, 120);
    ctx.closePath();
    ctx.fill();

    // Player
    drawL3Player();

    ctx.fillStyle = '#e8d070';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', 240, 298);
    ctx.textAlign = 'left';
}

function drawL3ChucksRoom() {
    drawL3RoomFloor();

    // Walls
    ctx.fillStyle = '#3a2a5c';
    ctx.fillRect(0, 0, WIDTH, 50);
    ctx.fillRect(0, 270, WIDTH, 50);
    ctx.fillRect(0, 0, 50, HEIGHT);
    ctx.fillRect(440, 0, 40, HEIGHT);
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(0, 46, WIDTH, 4);
    ctx.fillRect(0, 270, WIDTH, 4);
    ctx.fillRect(46, 0, 4, HEIGHT);
    ctx.fillRect(440, 0, 4, HEIGHT);

    // Bed (left side)
    ctx.fillStyle = '#4a3a6a';
    ctx.fillRect(50, 60, 110, 140);
    ctx.fillStyle = '#5a4a7a';
    ctx.fillRect(54, 64, 102, 40);
    // Pillows
    ctx.fillStyle = '#ddd';
    ctx.fillRect(60, 68, 40, 25);
    ctx.fillRect(104, 68, 40, 25);
    // Blanket
    ctx.fillStyle = '#3a2a5a';
    ctx.fillRect(54, 110, 102, 4);

    // Bedside table
    ctx.fillStyle = '#7a5020';
    ctx.fillRect(50, 40, 44, 12);
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(50, 52, 44, 8);

    // Door (right wall)
    for (const door of L3_DOORS['chucks-room']) drawL3DoorIndicator(door);
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(440, 115, 20, 90);
    ctx.fillStyle = '#030305';
    ctx.fillRect(444, 120, 14, 80);

    // Chuck NPC
    drawChuckSprite(L3_NPCS.chuck.x, L3_NPCS.chuck.y, L3_NPCS.chuck.facing);

    // Player
    drawL3Player();

    ctx.fillStyle = '#e8d070';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', 240, 298);
    ctx.textAlign = 'left';
}

function drawL3Jewelry() {
    // Warm jewelry store floor
    ctx.fillStyle = '#2a2a1a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#3a3a2a';
    for (let x = 0; x < WIDTH; x += 24) {
        for (let y = 0; y < HEIGHT; y += 24) {
            ctx.fillRect(x + 2, y + 2, 10, 10);
        }
    }

    // Walls
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(0, 0, WIDTH, 40);
    ctx.fillRect(0, 280, WIDTH, 40);
    ctx.fillRect(0, 0, 40, HEIGHT);
    ctx.fillRect(440, 0, 40, HEIGHT);
    ctx.fillStyle = '#6b5a3a';
    ctx.fillRect(0, 36, WIDTH, 4);
    ctx.fillRect(0, 280, WIDTH, 4);
    ctx.fillRect(36, 0, 4, HEIGHT);
    ctx.fillRect(440, 0, 4, HEIGHT);

    // Display counter (center top)
    ctx.fillStyle = '#6b5a3a';
    ctx.fillRect(140, 50, 200, 30);
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(145, 52, 190, 24);
    ctx.strokeStyle = '#6b5a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(145, 52, 190, 24);
    // Jewelry items in display
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(170, 58, 8, 8);
    ctx.fillRect(210, 60, 10, 6);
    ctx.fillRect(260, 58, 8, 8);
    ctx.fillRect(300, 60, 10, 6);

    // Side displays
    ctx.fillStyle = '#6b5a3a';
    ctx.fillRect(60, 120, 80, 40);
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(64, 124, 72, 32);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(80, 132, 6, 6);
    ctx.fillRect(100, 134, 8, 4);
    ctx.fillRect(120, 132, 6, 6);

    ctx.fillStyle = '#6b5a3a';
    ctx.fillRect(340, 120, 80, 40);
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(344, 124, 72, 32);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(360, 132, 6, 6);
    ctx.fillRect(380, 134, 8, 4);
    ctx.fillRect(400, 132, 6, 6);

    // Door to roundabout (right wall)
    for (const door of L3_DOORS.jewelry) drawL3DoorIndicator(door);
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(450, 115, 30, 90);
    ctx.fillStyle = '#030305';
    ctx.fillRect(456, 120, 24, 80);

    // NPCs: AJ, RJ, and Abraham
    drawAJSprite(L3_NPCS.aj.x, L3_NPCS.aj.y, L3_NPCS.aj.facing);
    drawRJSprite(L3_NPCS.rj.x, L3_NPCS.rj.y, L3_NPCS.rj.facing);
    drawAbrahamSprite(L3_NPCS.abraham.x, L3_NPCS.abraham.y, L3_NPCS.abraham.facing);

    // Player
    drawL3Player();

    ctx.fillStyle = '#e8d070';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', 460, 112);
    ctx.textAlign = 'left';
}

// ── NPC Sprite Functions ──

function drawChuckSprite(x, y, facing) {
    // Chuck: 340lb man in a suit, wider body (~32px wide)
    const b = 0;
    const ox = -4; // offset to center wider sprite
    // Legs (thick)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 4 + ox, y + 28 + b, 8, 10);
    ctx.fillRect(x + 16 + ox, y + 28 + b, 8, 10);
    // Shoes
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 3 + ox, y + 36 + b, 9, 3);
    ctx.fillRect(x + 15 + ox, y + 36 + b, 9, 3);
    // Dark suit pants
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(x + 2 + ox, y + 22 + b, 24, 8);
    // Belt
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 2 + ox, y + 20 + b, 24, 3);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 12 + ox, y + 20 + b, 4, 3);
    // Torso (dark suit jacket, wide)
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(x + 0 + ox, y + 4 + b, 28, 18);
    // Suit lapels
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(x + 4 + ox, y + 5 + b, 4, 12);
    ctx.fillRect(x + 20 + ox, y + 5 + b, 4, 12);
    // White shirt showing
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 8 + ox, y + 5 + b, 12, 14);
    // Tie
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(x + 12 + ox, y + 5 + b, 4, 14);
    ctx.fillStyle = '#aa1111';
    ctx.fillRect(x + 13 + ox, y + 18 + b, 2, 3);
    // Arms (thick, suit sleeves)
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(x - 2 + ox, y + 5 + b, 4, 16);
    ctx.fillRect(x + 26 + ox, y + 5 + b, 4, 16);
    // Hands
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x - 2 + ox, y + 19 + b, 4, 4);
    ctx.fillRect(x + 26 + ox, y + 19 + b, 4, 4);
    // Head (bigger)
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 4 + ox, y - 4 + b, 20, 10);
    // Short hair
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x + 3 + ox, y - 7 + b, 22, 4);
    // Eyes
    if (facing === 'down') {
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 7 + ox, y - 1, 3, 2);
        ctx.fillRect(x + 16 + ox, y - 1, 3, 2);
        // Stubble
        ctx.fillStyle = 'rgba(60,40,20,0.3)';
        ctx.fillRect(x + 7 + ox, y + 3, 14, 3);
    }
}

function drawFlintSprite(x, y, facing) {
    // Flint: emo look — all black, longer hair covering one eye, slimmer, eyeliner
    const b = 0;
    // Legs (skinny black jeans)
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 7, y + 26 + b, 4, 10);
    ctx.fillRect(x + 13, y + 26 + b, 4, 10);
    // Black skinny jeans
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 6, y + 22 + b, 12, 6);
    // Torso (black shirt/hoodie)
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 4, y + 7 + b, 16, 16);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 4, y + 21 + b, 16, 2);
    // Hood/collar detail
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 6, y + 7 + b, 12, 3);
    // Arms (slender, black sleeves)
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 2, y + 8 + b, 3, 10);
    ctx.fillRect(x + 19, y + 8 + b, 3, 10);
    // Hands
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 2, y + 17 + b, 3, 4);
    ctx.fillRect(x + 19, y + 17 + b, 3, 4);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 6, y - 2 + b, 12, 10);
    // Long emo hair (covers one eye, swept to the side)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 4, y - 9 + b, 16, 8);
    ctx.fillRect(x + 3, y - 6 + b, 6, 10); // hair hanging over left eye
    ctx.fillRect(x + 15, y - 6 + b, 5, 6);
    // Hair fringe covering left side of face
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 4, y - 3 + b, 7, 6);
    // Eyes (only right eye visible, with eyeliner)
    if (facing === 'down') {
        // Eyeliner around right eye
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 13, y - 1, 5, 5);
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 14, y + 0, 3, 3);
        // Thin mouth
        ctx.fillStyle = '#666';
        ctx.fillRect(x + 10, y + 5, 5, 1);
    }
}

function drawAJSprite(x, y, facing) {
    // AJ: muscular, blue muscle tank (sleeveless), wider arms
    const b = 0;
    // Legs
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 6, y + 26 + b, 5, 10);
    ctx.fillRect(x + 13, y + 26 + b, 5, 10);
    // Shorts
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 5, y + 22 + b, 14, 6);
    // Torso (blue muscle tank — sleeveless)
    ctx.fillStyle = '#3366ff';
    ctx.fillRect(x + 4, y + 7 + b, 16, 16);
    ctx.fillStyle = '#2244cc';
    ctx.fillRect(x + 4, y + 21 + b, 16, 2);
    // Tank top neckline
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 7, y + 7 + b, 10, 3);
    // Arms (muscular — wider rectangles, skin showing)
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 0, y + 7 + b, 5, 14);
    ctx.fillRect(x + 19, y + 7 + b, 5, 14);
    // Arm muscle definition
    ctx.fillStyle = '#c09060';
    ctx.fillRect(x + 0, y + 12 + b, 5, 2);
    ctx.fillRect(x + 19, y + 12 + b, 5, 2);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 6, y - 2 + b, 12, 10);
    // Hair (blond-ish, short)
    ctx.fillStyle = '#ccaa44';
    ctx.fillRect(x + 5, y - 6 + b, 14, 5);
    // Eyes
    if (facing === 'down' || facing === 'right') {
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 8, y + 1, 2, 2);
        ctx.fillRect(x + 14, y + 1, 2, 2);
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(x + 9, y + 5, 6, 2);
    }
}

function drawRJSprite(x, y, facing) {
    // RJ: muscular, green muscle tank (sleeveless), wider arms
    const b = 0;
    // Legs
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 6, y + 26 + b, 5, 10);
    ctx.fillRect(x + 13, y + 26 + b, 5, 10);
    // Shorts
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 5, y + 22 + b, 14, 6);
    // Torso (green muscle tank — sleeveless)
    ctx.fillStyle = '#33cc66';
    ctx.fillRect(x + 4, y + 7 + b, 16, 16);
    ctx.fillStyle = '#229944';
    ctx.fillRect(x + 4, y + 21 + b, 16, 2);
    // Tank top neckline
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 7, y + 7 + b, 10, 3);
    // Arms (muscular — wider rectangles, skin showing)
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 0, y + 7 + b, 5, 14);
    ctx.fillRect(x + 19, y + 7 + b, 5, 14);
    // Arm muscle definition
    ctx.fillStyle = '#c09060';
    ctx.fillRect(x + 0, y + 12 + b, 5, 2);
    ctx.fillRect(x + 19, y + 12 + b, 5, 2);
    // Head
    ctx.fillStyle = '#d4a076';
    ctx.fillRect(x + 6, y - 2 + b, 12, 10);
    // Hair (dark, short)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 5, y - 6 + b, 14, 5);
    // Eyes
    if (facing === 'down' || facing === 'left') {
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 8, y + 1, 2, 2);
        ctx.fillRect(x + 14, y + 1, 2, 2);
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(x + 9, y + 5, 6, 2);
    }
}

// ── Level 3 Portraits ──

function drawLevel3Portrait(npcKey) {
    const pCanvas = document.getElementById('chat-portrait');
    const pCtx = pCanvas.getContext('2d');
    pCtx.fillStyle = '#1a1420';
    pCtx.fillRect(0, 0, 96, 96);

    if (npcKey === 'shopkeeper') {
        // Shopkeeper portrait
        pCtx.fillStyle = '#cc8844';
        pCtx.fillRect(16, 60, 64, 36);
        pCtx.fillStyle = '#eee';
        pCtx.fillRect(24, 65, 48, 28);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(38, 50, 20, 14);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(28, 20, 40, 34);
        pCtx.fillStyle = '#888';
        pCtx.fillRect(26, 12, 44, 12);
        pCtx.fillRect(28, 10, 40, 6);
        pCtx.fillStyle = '#333';
        pCtx.fillRect(34, 32, 6, 6);
        pCtx.fillRect(54, 32, 6, 6);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(35, 33, 2, 2);
        pCtx.fillRect(55, 33, 2, 2);
        pCtx.fillStyle = '#cc4444';
        pCtx.fillRect(38, 44, 20, 4);
    } else if (npcKey === 'guard') {
        // Security guard portrait
        pCtx.fillStyle = '#eee';
        pCtx.fillRect(16, 60, 64, 36);
        pCtx.fillStyle = '#ccc';
        pCtx.fillRect(16, 90, 64, 6);
        pCtx.fillStyle = '#ffd700';
        pCtx.fillRect(22, 66, 8, 8);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(38, 50, 20, 14);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(28, 20, 40, 34);
        pCtx.fillStyle = '#1a1a44';
        pCtx.fillRect(26, 10, 44, 14);
        pCtx.fillRect(24, 18, 48, 4);
        pCtx.fillStyle = '#333';
        pCtx.fillRect(34, 32, 6, 6);
        pCtx.fillRect(54, 32, 6, 6);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(35, 33, 2, 2);
        pCtx.fillRect(55, 33, 2, 2);
    } else if (npcKey === 'flint') {
        // Flint portrait: emo — black clothes, hair over one eye, eyeliner
        pCtx.fillStyle = '#111';
        pCtx.fillRect(16, 60, 64, 36);
        pCtx.fillStyle = '#1a1a1a';
        pCtx.fillRect(16, 90, 64, 6);
        // Hood/collar
        pCtx.fillStyle = '#222';
        pCtx.fillRect(24, 62, 48, 8);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(38, 50, 20, 14);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(28, 20, 40, 34);
        // Long emo hair
        pCtx.fillStyle = '#0a0a0a';
        pCtx.fillRect(22, 4, 52, 22);
        pCtx.fillRect(20, 12, 14, 24); // hair over left eye
        pCtx.fillRect(62, 12, 14, 16);
        // Hair fringe over left face
        pCtx.fillStyle = '#111';
        pCtx.fillRect(22, 18, 22, 18);
        // Right eye with eyeliner
        pCtx.fillStyle = '#000';
        pCtx.fillRect(52, 28, 10, 10);
        pCtx.fillStyle = '#333';
        pCtx.fillRect(54, 30, 6, 6);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(55, 31, 2, 2);
        // Thin mouth
        pCtx.fillStyle = '#666';
        pCtx.fillRect(40, 44, 16, 2);
    } else if (npcKey === 'chuck') {
        // Chuck portrait: 340lb man in suit
        // Suit jacket (wider)
        pCtx.fillStyle = '#1a1a3a';
        pCtx.fillRect(8, 56, 80, 40);
        pCtx.fillStyle = '#2a2a4a';
        pCtx.fillRect(14, 58, 10, 28);
        pCtx.fillRect(72, 58, 10, 28);
        // White shirt
        pCtx.fillStyle = '#eee';
        pCtx.fillRect(28, 58, 40, 28);
        // Tie
        pCtx.fillStyle = '#cc2222';
        pCtx.fillRect(44, 58, 8, 28);
        pCtx.fillStyle = '#aa1111';
        pCtx.fillRect(45, 84, 6, 6);
        // Neck
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(36, 46, 24, 14);
        // Head (bigger)
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(24, 16, 48, 34);
        // Short hair
        pCtx.fillStyle = '#3a2a1a';
        pCtx.fillRect(22, 8, 52, 12);
        // Eyes
        pCtx.fillStyle = '#333';
        pCtx.fillRect(32, 30, 6, 6);
        pCtx.fillRect(54, 30, 6, 6);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(33, 31, 2, 2);
        pCtx.fillRect(55, 31, 2, 2);
        // Stubble
        pCtx.fillStyle = 'rgba(60,40,20,0.3)';
        pCtx.fillRect(30, 42, 36, 8);
    } else if (npcKey === 'aj') {
        // AJ portrait: blue muscle tank, muscular arms showing
        pCtx.fillStyle = '#3366ff';
        pCtx.fillRect(24, 60, 48, 36);
        pCtx.fillStyle = '#2244cc';
        pCtx.fillRect(24, 90, 48, 6);
        // Bare muscular arms/shoulders
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(10, 58, 18, 30);
        pCtx.fillRect(68, 58, 18, 30);
        // Arm muscle lines
        pCtx.fillStyle = '#c09060';
        pCtx.fillRect(12, 70, 14, 3);
        pCtx.fillRect(70, 70, 14, 3);
        // Tank neckline
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(32, 60, 32, 8);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(38, 50, 20, 14);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(28, 20, 40, 34);
        pCtx.fillStyle = '#ccaa44';
        pCtx.fillRect(26, 10, 44, 14);
        pCtx.fillRect(28, 8, 40, 6);
        pCtx.fillStyle = '#333';
        pCtx.fillRect(34, 32, 6, 6);
        pCtx.fillRect(54, 32, 6, 6);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(35, 33, 2, 2);
        pCtx.fillRect(55, 33, 2, 2);
        pCtx.fillStyle = '#cc4444';
        pCtx.fillRect(38, 44, 20, 4);
    } else if (npcKey === 'rj') {
        // RJ portrait: green muscle tank, muscular arms showing
        pCtx.fillStyle = '#33cc66';
        pCtx.fillRect(24, 60, 48, 36);
        pCtx.fillStyle = '#229944';
        pCtx.fillRect(24, 90, 48, 6);
        // Bare muscular arms/shoulders
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(10, 58, 18, 30);
        pCtx.fillRect(68, 58, 18, 30);
        // Arm muscle lines
        pCtx.fillStyle = '#c09060';
        pCtx.fillRect(12, 70, 14, 3);
        pCtx.fillRect(70, 70, 14, 3);
        // Tank neckline
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(32, 60, 32, 8);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(38, 50, 20, 14);
        pCtx.fillStyle = '#d4a076';
        pCtx.fillRect(28, 20, 40, 34);
        pCtx.fillStyle = '#2a2a2a';
        pCtx.fillRect(26, 10, 44, 14);
        pCtx.fillRect(28, 8, 40, 6);
        pCtx.fillStyle = '#333';
        pCtx.fillRect(34, 32, 6, 6);
        pCtx.fillRect(54, 32, 6, 6);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(35, 33, 2, 2);
        pCtx.fillRect(55, 33, 2, 2);
        pCtx.fillStyle = '#cc4444';
        pCtx.fillRect(38, 44, 20, 4);
    } else if (npcKey === 'blake') {
        drawLevel2Portrait('blake');
    } else if (npcKey === 'abraham') {
        drawLevel2Portrait('abraham');
    } else if (npcKey === 'vanessa') {
        drawLevel2Portrait('vanessa');
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
