---
name: create-level
description: Use when the user asks to create a new level, room, or area in the game. Covers room layout, doors, interactions, collision, and transitions.
version: 3.0.0
---

# Create a Level

This skill provides the rules and patterns for creating new levels/rooms in Gay Murder Cruise.

## Architecture

The game is in `game.js` (single file, vanilla JS canvas 480x320). Levels are rendered via the `draw()` function which checks `gameState`. Movement is handled in `update()`.

## Level Types

### Single-room (Level 2 pattern)
- One gameState, sub-states for flow control
- Fixed 480x320 room, no camera

### Multi-room with scrolling (Level 3 pattern — recommended)
- Multiple rooms connected by walk-through doors
- One room (roundabout) scrolls vertically with a camera
- Room switching changes drawing function and player position
- Camera tracks player in scrollable rooms

## Level 3 Pattern (Current Reference)

### State Variables
```javascript
let l3State = 'shop-intro'; // sub-states: 'free', 'chat', 'notebook', 'accuse', 'complete', etc.
let l3Room = 'shop'; // current room name
let l3PlayerX = 228, l3PlayerY = 230, l3PlayerFacing = 'up';
let l3NearNpc = null, l3NearDoor = null;
let l3Camera = { y: 0 };
const L3_ROUNDABOUT_HEIGHT = 700; // total height of scrollable room
function l3sy(worldY) { return worldY - l3Camera.y; } // screen-space conversion
```

### Multi-Room Doors
```javascript
const L3_DOORS = {
    shop: [
        { x: 0, y: 100, w: 28, h: 100, target: 'roundabout', playerX: 410, playerY: 160, facing: 'left', label: 'Exit' },
    ],
    roundabout: [
        { x: 420, y: 120, w: 60, h: 80, target: 'shop', playerX: 30, playerY: 160, facing: 'right', label: 'Shop' },
    ],
};
```
Door zones must be wide enough (40-60px min dimension) and reachable within player bounds.

### Room Transitions
```javascript
for (const door of doors) {
    if (pcx > door.x && pcx < door.x + door.w && pcy > door.y && pcy < door.y + door.h) {
        l3Room = door.target;
        l3PlayerX = door.playerX;
        l3PlayerY = door.playerY;
        l3PlayerFacing = door.facing;
        // Switch music if needed
        return;
    }
}
```

### Scrollable Room Camera
```javascript
if (l3Room === 'roundabout') {
    l3Camera.y = l3PlayerY - HEIGHT / 2 + 18;
    if (l3Camera.y < 0) l3Camera.y = 0;
    if (l3Camera.y > L3_ROUNDABOUT_HEIGHT - HEIGHT) l3Camera.y = ...;
} else {
    l3Camera.y = 0;
}
// All drawing in scrollable rooms uses l3sy(worldY) for y-coordinates
```

### Variable-Width Bounds (roundabout narrows into hallway)
```javascript
if (l3Room === 'roundabout') {
    if (newY > 350) { // hallway section — narrow
        if (newX < 134) newX = 134;
        if (newX > 310) newX = 310;
    }
}
```

### Blocking Exit Until Condition Met
```javascript
if (l3Room === 'shop' && !l3ShopkeeperTalked) {
    l3State = 'shop-exit-blocked';
    dialogBox.innerHTML = '<span style="color:#ffcc00;">I should talk to the shop owner first.</span>';
    dialogBox.classList.add('visible');
    return;
}
```

### Fade-to-Room Teleport
```javascript
if (l3State === 'fade-to-theater') {
    l3FadeToTheaterAlpha += 0.02;
    if (l3FadeToTheaterAlpha >= 1) {
        l3Room = 'theater';
        l3PlayerX = 228; l3PlayerY = 200;
        l3State = 'free';
    }
}
// Draw: ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fillRect(...)
```

### Room Drawing Dispatch
```javascript
function drawLevel3() {
    switch (l3Room) {
        case 'shop': drawL3Shop(); break;
        case 'roundabout': drawL3Roundabout(); break;
        case 'theater': drawL3Theater(); break;
    }
}
```

## Hooking Into the Game

### 1. handleAction() dispatcher
```javascript
if (gameState === 'levelN') { handleLevelNAction(key); return; }
```

### 2. update() and draw()
```javascript
if (gameState === 'levelN') { updateLevelN(); return; }
if (gameState === 'levelN') { drawLevelN(); return; }
```

### 3. Level select (only visible with #dev hash)
```javascript
} else if (level === N) {
    selectedChar = selectedChar || CHARACTERS[0];
    startLevelN();
}
```

## Comic Book Cutscenes

Levels can start with comic panel sequences:
- `gameState = 'comic-cutscene'`, `comicPanel` tracks current panel
- Each panel is a function drawing to the full canvas
- Panels advance on tap/keypress with 400ms debounce
- After all panels: `startLevelN()`
- `drawComicPanel(n)` dispatches via switch statement

## Mandatory Rules

### Doors
- Door zones must be 40-60px minimum in the narrow dimension
- Door zones must overlap with the walkable area (verify against bounds)
- Doors flush inside walls, never floating
- Player bounds must allow reaching all door zones (verify mathematically)

### Collision
- Every solid object needs a collider
- NPCs need colliders: `{ x: npc.x + 4, y: npc.y + 8, w: 16, h: 28 }`
- Use `collidesWithAny()` with axis-sliding
- Wall colliders need gaps aligned with door zones

### Room Size
- Canvas is 480x320
- Scrollable rooms can be taller (e.g. 700px) with camera

### Player Drawing
- Use character system: `drawCharFront/Back/Side(px, py, bounce, legSwing, armSwing, char)`
- In scrollable rooms: use `l3sy()` for y-coordinate
- Include shadow ellipse

### Music
- Different tracks per room area: `GameMusic.startMusic('trackName')`
- Switch on room transitions
- Tracks defined in music.js TRACKS object
