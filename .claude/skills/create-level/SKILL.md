---
name: create-level
description: Use when the user asks to create a new level, room, or area in the game. Covers room layout, doors, interactions, collision, and transitions.
version: 1.0.0
---

# Create a Level

This skill provides the rules and patterns for creating new levels/rooms in Gay Murder Cruise.

## Architecture

The game is in `game.js` (single file, vanilla JS canvas). Levels are rendered via the `draw()` function which checks `gameState` and `roomState` to decide what to render. Movement is handled in `update()`.

## Room Creation Checklist

When creating a new room/level:

1. **Define colliders** for all solid objects (beds, tables, fixtures, etc.)
2. **Define interaction items** with `{ id, x, y, w, h }` for examinable objects
3. **Add a draw function** that renders walls, floor, objects, player, and prompt
4. **Add movement bounds** in `update()` with `minX, maxX, minY, maxY`
5. **Add walk-through door transitions** that check player position and swap `roomState`
6. **Set spawn position** right in front of the door the player entered through

## Mandatory Rules

### Doors
- Doors on top/bottom walls must be VERTICAL (taller than wide, with panel details)
- Doors on left/right walls are horizontal
- Doors must ALWAYS be drawn flush inside the wall they belong to — never floating in open space
- Door frame rect must overlap with the wall rect
- When entering a room through a door on the right wall, the exit door in the new room should be on the LEFT wall (and vice versa). Top/bottom follow the same logic.

### Collision
- Player must NEVER walk through or over solid objects
- Every piece of furniture/fixture needs a collision rect in the room's colliders array
- Use `collidesWithAny(x, y, pw, ph, colliders)` to check
- Implement axis-sliding: if full movement blocked, try X-only then Y-only

### Room Transitions
- Doors between rooms are walk-through (no examine needed) — detect when player reaches the wall edge near the door
- Only transition if player Y/X is within the door's range on that wall
- Spawn the player right in front of the door they came through, facing into the room
- Spawn positions must be safely within the new room's movement bounds (not at/past edges, or the transition will re-trigger)

### Room Size
- Rooms should be tight — only enough walking space to navigate. No large empty areas.
- A "tiny" room means 2-3 steps of movement at most.

### Interactions
- Items the player can examine need entries in the room's items array
- Proximity check: `Math.abs(rpx - icx) < 50 && Math.abs(rpy - icy) < 50`
- Show prompt when near, hide when not near or when in dialog
- Set `gameState = 'room-dialog'` and show `dialogBox` for text interactions
- `closeDialog()` returns to `gameState = 'room'`

### Drawing
- Always draw: floor with pattern, walls on all sides with trim, doors in walls, objects, then player on top
- Use the existing `drawRoomPlayer()` function for the player character
- Canvas is 480x320 (`ROOM_W` x `ROOM_H`)

## Game States

- `'room'` — player can move and interact in the current room
- `'room-dialog'` — dialog box is showing, player frozen
- `'book-closeup'` / `'book-open'` — special fullscreen views
- Rooms are sub-states via `roomState`: `'room'`, `'bathroom'`, `'balcony'`, etc.

## Template

```javascript
// Colliders for new room
const NEW_ROOM_COLLIDERS = [
    { x: ..., y: ..., w: ..., h: ... },  // furniture
];

// Interaction items
const NEW_ROOM_ITEMS = [
    { id: 'item-name', x: ..., y: ..., w: ..., h: ... },
];

function drawNewRoom() {
    // Floor
    ctx.fillStyle = '#...';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);

    // Walls (all four sides, tight)
    // ...

    // Door in wall (flush, correct orientation)
    // ...

    // Furniture/objects (matching colliders)
    // ...

    drawRoomPlayer();

    if (roomNearItem && gameState === 'room') {
        promptEl.classList.add('visible');
        promptEl.textContent = isMobile() ? 'Tap LOOK to examine' : 'Press E or SPACE to examine';
    } else if (gameState === 'room') {
        promptEl.classList.remove('visible');
    }
}
```

## Movement bounds in update()

```javascript
if (roomState === 'newroom') {
    minX = wallLeft + 4; maxX = wallRight - 28;
    minY = wallTop + 4; maxY = wallBottom - 40;
    colliders = NEW_ROOM_COLLIDERS;
}
```

## Walk-through transition

```javascript
// Entering new room from main room (e.g. door in right wall)
if (roomPlayerX >= maxX && roomPlayerY > doorTop && roomPlayerY < doorBottom) {
    roomState = 'newroom';
    roomPlayerX = spawnX;  // safely inside new room bounds
    roomPlayerY = spawnY;  // right in front of the left-wall door
    roomPlayerFacing = 'right';
    roomNearItem = null;
    return;
}
```
