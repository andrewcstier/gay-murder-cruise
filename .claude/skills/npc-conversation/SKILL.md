---
name: npc-conversation
description: Use when adding NPC conversations to this game. Covers portraits, chat UI, typewriter text, hardcoded dialog trees, goodbye flow, and notebook integration.
version: 3.0.0
---

# NPC Conversation System

This skill defines how NPC conversations work in Gay Murder Cruise.

## Architecture

All conversation state lives in `game.js`. The chat UI is DOM elements below the canvas. Portraits are on a separate 96x96 canvas.

## Dialog Types

### Simple sequential (one speaker)
```javascript
const L3_DIALOG = {
    npcKey: [
        "First line.",
        "Second line.",
    ],
};
```

### Multi-speaker combined conversation (AJ+RJ pattern)
```javascript
const L3_DIALOG = {
    aj: [
        {speaker: 'aj', text: "Oh hi! We're just looking at rings."},
        {speaker: 'rj', text: "Hey! AJ won't stop talking about the show."},
        {speaker: 'aj', text: "I was Cher!"},
    ],
    rj: [], // empty — RJ redirects to AJ's combined dialog
};
```
When `npcKey === 'rj'`, redirect to 'aj'. The render function checks `typeof lineData === 'object'` and uses `lineData.speaker` to look up name/color/portrait.

## Opening a Conversation

```javascript
function openLevel3Chat(npcKey) {
    if (npcKey === 'rj') npcKey = 'aj'; // redirect combined NPCs
    l3State = 'chat';
    l3TalkingTo = npcKey;

    const npc = L3_NPCS[npcKey];
    const panel = document.getElementById('chat-panel');
    panel.style.display = 'block';
    panel.style.borderColor = npc.color;
    // ... set portrait, name, colors

    const lines = L3_DIALOG[npcKey];
    const idx = l3DialogIndex[npcKey];
    const lineData = lines[Math.min(idx, lines.length - 1)];
    const line = typeof lineData === 'object' ? lineData.text : lineData;
    startLevel3Typing(line);
    renderL3ChatLine(npcKey, lineData);

    // Trigger clues on first talk
    if (npcKey === 'guard' && l3DialogIndex.guard === 0) {
        l3GridUnlocked = true;
        addL3Clue("...");
    }
}
```

## Typewriter Effect

```javascript
l3Typewriting = { full: text, current: '', charIndex: 0 };
// In update: advance 2 chars per frame
// First click = skip to full text, second click = advance
```

## Rendering with Speaker Support

```javascript
function renderL3ChatLine(npcKey, lineData) {
    const speaker = typeof lineData === 'object' ? lineData.speaker : null;
    const speakerKey = speaker || npcKey;
    const displayNpc = L3_NPCS[speakerKey];
    // Update name, color, portrait for current speaker
    container.innerHTML = `<div class="msg-npc"><span style="color:${displayNpc.color}">${displayNpc.name}:</span> ${text}</div>`;
}
```

## Chat UI Layout (DOM)

```
┌─────────────────────────────┐
│         GAME CANVAS         │
└─────────────────────────────┘
┌─────────[NPC COLOR BORDER]──┐
│        [96x96 PORTRAIT]     │
│       ─── NPC NAME ───      │
│  NPC_NAME: dialog text...   │
│  [ NEXT ]                   │
│  [ Accuse NAME ]            │  ← optional, per-suspect
└─────────────────────────────┘
```

## Accusation System (Level 3 pattern)

- Track which suspects have been talked to: `l3TalkedTo = { chuck: false, flint: false, aj: false }`
- Record whether all were talked to BEFORE current chat: `l3AllTalkedBeforeChat`
- "Accuse [Name]" button shows for the current suspect only
- Clicking shows "Are you sure?" with YES/NO
- Wrong: NPC denies, chat closes, level continues
- Correct: cutscene triggers

### Critical: Event handler race condition
The chat-next button has BOTH an `addEventListener('click')` (permanent) and an `.onclick` (dynamic). When setting up a CONTINUE button for cutscene triggers, keep `l3AccusationOpen = true` so the addEventListener returns early. Handle panel cleanup directly in the onclick, NOT via `closeLevel3Chat()` (which sets state to 'free').

## NPC Sprites

Each NPC needs:
- `drawXxxSprite(x, y, facing)` — ~24-32px wide game sprite
- Portrait function for the 96x96 chat portrait canvas
- Sprite variations: Chuck is wide (32px, suit), Flint is emo (black, hair over eye), AJ+RJ have muscle tanks

## L-Shaped Notebook Grid

Three 3x3 sub-grids in an L shape (single HTML table):
```
              Items              Personas
           Book PrEP Mic    Jiggly Mariah Cher
Chuck    [  ][  ][  ]  |  [  ][  ][  ]
Flint    [  ][  ][  ]  |  [  ][  ][  ]
AJ       [  ][  ][  ]  |  [  ][  ][  ]
         ─────────────────
Jiggly   [  ][  ][  ]
Mariah   [  ][  ][  ]
Cher     [  ][  ][  ]
```
- Auto-marks only apply within each sub-grid
- Bottom-right quadrant is empty (no interaction)
- Clues section is scrollable (max-height: 120px; overflow-y: auto)
- Grid is locked until a specific NPC is talked to (`l3GridUnlocked`)

## Clue Text

Don't include parenthetical solver hints like "(Cher != Book)". State facts plainly:
- "Cher was already on stage when the robbery happened."
- "Chuck is 340 pounds — physically impossible for him to be Skinny Mariah Carey."
