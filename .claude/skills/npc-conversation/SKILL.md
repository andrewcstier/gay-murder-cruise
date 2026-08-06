---
name: npc-conversation
description: Use when adding NPC conversations to this game. Covers portraits, chat UI, typewriter text, hardcoded dialog trees, goodbye flow, and notebook integration.
version: 1.0.0
---

# NPC Conversation System

This skill defines how NPC conversations work in Gay Murder Cruise. The system is modeled after guard-riddle-rpg but uses hardcoded dialog instead of LLM calls.

## Architecture

All conversation state lives in `game.js`. The chat UI is rendered via DOM elements (not canvas) positioned below the game canvas. Portraits are drawn on a separate small canvas element.

## Core State Variables

```javascript
let chatOpen = false;
let talkingTo = null;           // NPC key string
let chatMessages = {};          // { npcKey: [{role:'assistant'|'user', text:'...'}] }
let sayingBye = false;
let typingText = null;          // { full: '...', current: '...', charIndex: 0, timer: null }
let chatInput = '';
```

## NPC Definition

Each NPC needs:
```javascript
const NPCS = [
    {
        key: 'unique-id',
        name: 'DISPLAY NAME',
        color: '#hexcolor',          // border/name color in chat
        x: ..., y: ...,              // position in room
        drawSprite: function(ctx, x, y) { ... },      // 32x32 sprite
        drawPortrait: function(ctx) { ... },           // 96x96 portrait
        greeting: 'First message when player talks to them',
        responses: { ... },          // dialog tree (see below)
        goodbye: 'Farewell message',
    },
];
```

## Dialog Tree (Hardcoded)

For non-LLM NPCs, responses are matched by keyword:
```javascript
responses: {
    // Each key is a keyword/phrase to match in player input (lowercased)
    'notebook': 'Here, take my notebook! It helps organize clues.',
    'help': 'Talk to everyone and gather information.',
    'key': 'I swear I didn\'t have the key!',
    // Special: '_default' fires when no keyword matches
    '_default': 'Hmm, I\'m not sure about that.',
    // Special: '_first' is the greeting (shown on first open only)
    '_first': 'Hey there! Welcome!',
}
```

## Interaction Flow

### Opening a Conversation
1. Player presses E/SPACE/LOOK near an NPC (proximity check same as room items)
2. `chatOpen = true`, `talkingTo = npc.key`
3. Show portrait canvas + chat panel below game
4. If first time talking, show greeting with typewriter effect
5. If already talked before, show existing message history
6. Player input box is focused

### Sending a Message
1. Player types text and presses Enter (or taps Send button)
2. Add `{role: 'user', text: input}` to `chatMessages[talkingTo]`
3. Match input against NPC's `responses` keywords (case-insensitive, check all keys, first match wins)
4. Add `{role: 'assistant', text: response}` to messages
5. Start typewriter effect on the response
6. Trigger any clue/item discoveries based on response key

### Typewriter Effect
```javascript
function startTyping(text) {
    typingText = { full: text, current: '', charIndex: 0 };
    // In game loop or setInterval, advance charIndex every ~30ms
    // Clicking/tapping the chat area skips to full text
}
function stopTyping() {
    if (typingText) typingText.current = typingText.full;
    typingText = null;
}
```

### Goodbye Flow
1. Player clicks "THANKS, GOODBYE" button (or it's the only option in some states)
2. Show ONLY the farewell message (hide input, hide other buttons)
3. Start typewriter on farewell text
4. After 1.5 seconds (or text length * 25ms + 500ms, whichever is greater), auto-close chat
5. `chatOpen = false`, `talkingTo = null`, `sayingBye = false`

### Closing Without Goodbye
- Press Escape: immediately close chat, no farewell
- This is an alternate path — goodbye is the "polite" close

## Portrait Rendering

Portraits are 96x96 pixel art drawn on a dedicated canvas:
```javascript
function drawPortrait(ctx, npc) {
    // Background
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(0, 0, 96, 96);
    // Character (bigger, more detailed version of their sprite)
    npc.drawPortrait(ctx);
}
```

Portraits MUST match the sprite visually (same colors, same features, just larger/more detailed).

## Chat UI Layout (DOM)

The chat panel appears BELOW the game canvas (not overlaid):
```
┌─────────────────────────────┐
│         GAME CANVAS         │
└─────────────────────────────┘
┌─────────[NPC COLOR BORDER]──┐
│        [96x96 PORTRAIT]     │
│       ─── NPC NAME ───      │
│                             │
│  NPC: greeting text...      │
│  YOU: player question       │
│  NPC: response text...      │
│                             │
│  [input box............] [▶]│
│  [  THANKS, GOODBYE     ]  │
└─────────────────────────────┘
```

## Input Handling During Chat

When `chatOpen === true`:
- Arrow keys, WASD: blocked (player cannot move)
- E/SPACE: do NOT trigger examine
- Escape: close chat
- Enter: send message
- All keyboard input goes to the text input

## Mobile Considerations

- Input does NOT auto-focus (prevents keyboard popup on mobile)
- Send button is always visible next to input
- "THANKS, GOODBYE" button is large tap target
- Typewriter can be skipped by tapping the message area
- LOOK button acts as "send" if input has text, otherwise does nothing in chat

## Notebook Integration

When an NPC gives the player a notebook:
1. Set `hasNotebook = true`
2. Show notebook icon button (bottom-left, fixed position)
3. Press C to toggle notebook (when not in chat)
4. Notebook is a fullscreen overlay with deduction grid

### Notebook Grid Structure
```javascript
let notebook = {
    open: false,
    grid: [['','',''], ['','',''], ['','','']],  // rows x cols, values: '' | 'check' | 'x' | '?'
    autoMarks: {},
};
```

### Grid Toggle Logic
Clicking a cell cycles: empty → ✓ (check) → ✗ (x) → ? → empty

When a ✓ is placed:
- All other cells in that row get auto-✗
- All other cells in that column get auto-✗
- These auto-marks are tracked in `autoMarks` and can be undone if the ✓ is removed

### Notebook Tutorial (Blake's tutorial)
When player asks for tutorial, Blake explains:
- "Each row is a person, each column is an item"
- "Click a cell to mark ✓ (they had it), ✗ (they didn't), or ? (maybe)"
- "When you mark ✓, other cells in that row and column get ✗ automatically"
- "Use the clues to figure out who had what!"

## Clue Discovery

Clues are discovered by:
1. Talking to an NPC (greeting triggers a clue)
2. NPC response to a specific keyword triggers a clue
3. Examining an object (separate from conversation)

```javascript
let discoveredClues = [];

function addClue(text) {
    if (!discoveredClues.includes(text)) discoveredClues.push(text);
}
```

Clues appear in the notebook's "CLUES & EVIDENCE" section.

## Template: Adding a New NPC

```javascript
const NEW_NPC = {
    key: 'npc-key',
    name: 'NPC NAME',
    color: '#ff69b4',
    x: 200, y: 150,
    greeting: 'Hello! First thing they say.',
    goodbye: 'See you later!',
    responses: {
        'keyword1': { text: 'Response to keyword1', clue: 'Clue text discovered' },
        'keyword2': { text: 'Response to keyword2', item: 'notebook' },
        '_default': { text: 'Generic response' },
    },
    drawSprite(ctx, x, y) {
        // 32x32 pixel art at (x, y)
    },
    drawPortrait(ctx) {
        // 96x96 pixel art filling the portrait canvas
    },
};
```

## Exclamation Point (Attention Getter)

When an NPC needs the player's attention (e.g., after getting out of bed):
```javascript
// Draw "!" above NPC
ctx.fillStyle = '#fff';
ctx.fillRect(npcX + 8, npcY - 20, 16, 18);
ctx.fillStyle = '#ff0000';
ctx.font = 'bold 14px monospace';
ctx.textAlign = 'center';
ctx.fillText('!', npcX + 16, npcY - 6);
```

The exclamation appears for ~60 frames then disappears. NPC faces the player during this.
