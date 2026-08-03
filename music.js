// "What Shall We Do with the Drunken Sailor" - from sheet music
// Key of E minor, 2/4 time, 140 BPM chiptune arrangement

let audioCtx = null;
let musicPlaying = false;
let masterGain = null;
let schedulerTimer = null;

const BPM = 140;
const BEAT = 60 / BPM;
const EIGHTH = BEAT / 2;

// Note frequencies (E minor)
const N = {
    R: 0,
    E3: 164.81, F3s: 185.00, G3: 196.00, A3: 220.00, B3: 246.94,
    E4: 329.63, F4s: 369.99, G4: 392.00, A4: 440.00, B4: 493.88,
    E5: 659.25,
    E2: 82.41, B2: 123.47, G2: 98.00, A2: 110.00, D3: 146.83,
};

// Transcribed from the sheet music screenshot
// Each entry is [note, duration_in_eighths]
// Verse: "What shall we do with the drunken sailor" x3 + "Early in the morning"
// Chorus: "Hooray and up she rises" x3 + "Early in the morning"

const verse = [
    // "What shall we do with the drunken sail-or"
    [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.F4s, 1], [N.F4s, 1],
    // "What shall we do with the drunken sail-or"
    [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.F4s, 1], [N.F4s, 1],
    // "what shall we do with the drunken sail-or"
    [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.E4, 1], [N.F4s, 1], [N.F4s, 1],
    // "Ear-ly in the Mor-ning"
    [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.A4, 1], [N.A4, 1], [N.G4, 1], [N.F4s, 1],
];

const chorus = [
    // "Hoo-ray and up she ri-ses"
    [N.E4, 1], [N.E4, 1], [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.A4, 1], [N.G4, 1],
    // "Hoo-ray and up she ri-ses"
    [N.E4, 1], [N.E4, 1], [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.A4, 1], [N.G4, 1],
    // "Hoo-ray and up she ri-ses"
    [N.E4, 1], [N.E4, 1], [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.A4, 1], [N.G4, 1],
    // "Ear-ly in the Mor-ning"
    [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.B4, 1], [N.A4, 1], [N.A4, 1], [N.G4, 1], [N.F4s, 1],
];

// Full melody: verse then chorus
const melody = [...verse, ...chorus];

// Bass line (Em - Em - Em - Em | Em - D - C - B pattern for verse)
// Follows root notes
const bassVerse = [
    [N.E2, 2], [N.E3, 2], [N.E2, 2], [N.E3, 2],
    [N.E2, 2], [N.E3, 2], [N.E2, 2], [N.E3, 2],
    [N.E2, 2], [N.E3, 2], [N.E2, 2], [N.E3, 2],
    [N.B2, 2], [N.B2, 2], [N.A2, 2], [N.E2, 2],
];

const bassChorus = [
    [N.E2, 2], [N.E3, 2], [N.B2, 2], [N.B2, 2],
    [N.E2, 2], [N.E3, 2], [N.B2, 2], [N.B2, 2],
    [N.E2, 2], [N.E3, 2], [N.B2, 2], [N.B2, 2],
    [N.B2, 2], [N.B2, 2], [N.A2, 2], [N.E2, 2],
];

const bass = [...bassVerse, ...bassChorus];

function createOsc(type, freq, startTime, duration, gain, detune) {
    if (freq === 0) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    g.gain.setValueAtTime(gain, startTime);
    g.gain.setValueAtTime(gain * 0.6, startTime + duration * 0.7);
    g.gain.linearRampToValueAtTime(0, startTime + duration * 0.9);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function createKick(startTime) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.08);
    g.gain.setValueAtTime(0.2, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.12);
}

function createHiHat(startTime, accent) {
    const bufSize = audioCtx.sampleRate * 0.03;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain();
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 8000;
    g.gain.setValueAtTime(accent ? 0.06 : 0.03, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);
    src.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    src.start(startTime);
    src.stop(startTime + 0.03);
}

let nextNoteTime = 0;
let melodyPos = 0; // position in eighths through the melody
let bassPos = 0;
let eighthCount = 0;

function getTotalEighths(arr) {
    let total = 0;
    for (const [, dur] of arr) total += dur;
    return total;
}

function getNoteAtPos(arr, pos) {
    let acc = 0;
    for (const [note, dur] of arr) {
        if (pos < acc + dur) return { note, isStart: pos === acc, dur };
        acc += dur;
    }
    return { note: 0, isStart: false, dur: 1 };
}

const melodyTotalEighths = getTotalEighths(melody);
const bassTotalEighths = getTotalEighths(bass);

function scheduleNotes() {
    if (!musicPlaying) return;
    const now = audioCtx.currentTime;

    while (nextNoteTime < now + 0.3) {
        const t = nextNoteTime;

        // Melody
        const melPos = melodyPos % melodyTotalEighths;
        const mel = getNoteAtPos(melody, melPos);
        if (mel.isStart && mel.note > 0) {
            const dur = mel.dur * EIGHTH;
            createOsc('square', mel.note, t, dur * 0.8, 0.07, 0);
            createOsc('square', mel.note, t, dur * 0.8, 0.025, 7);
        }

        // Bass
        const bPos = bassPos % bassTotalEighths;
        const bas = getNoteAtPos(bass, bPos);
        if (bas.isStart && bas.note > 0) {
            const dur = bas.dur * EIGHTH;
            createOsc('triangle', bas.note, t, dur * 0.65, 0.14, 0);
        }

        // Kick on beats (every 2 eighths)
        if (eighthCount % 2 === 0) createKick(t);

        // Hi-hat every eighth, accent off-beats
        createHiHat(t, eighthCount % 2 === 1);

        // Snare on beat 2 of each bar (every 4 eighths, offset by 2)
        if (eighthCount % 4 === 2) {
            const snBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
            const snD = snBuf.getChannelData(0);
            for (let i = 0; i < snD.length; i++) snD[i] = Math.random() * 2 - 1;
            const snSrc = audioCtx.createBufferSource();
            snSrc.buffer = snBuf;
            const snG = audioCtx.createGain();
            const snF = audioCtx.createBiquadFilter();
            snF.type = 'bandpass'; snF.frequency.value = 3000;
            snG.gain.setValueAtTime(0.07, t);
            snG.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            snSrc.connect(snF); snF.connect(snG); snG.connect(masterGain);
            snSrc.start(t); snSrc.stop(t + 0.05);
        }

        melodyPos++;
        bassPos++;
        eighthCount++;
        nextNoteTime += EIGHTH;
    }
}

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
}

function startMusic() {
    if (musicPlaying) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    musicPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.05;
    melodyPos = 0;
    bassPos = 0;
    eighthCount = 0;
    schedulerTimer = setInterval(scheduleNotes, 80);
    scheduleNotes();
}

function stopMusic() {
    musicPlaying = false;
    if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
}

function setMusicVolume(vol) {
    if (masterGain) masterGain.gain.value = vol;
}

window.GameMusic = { startMusic, stopMusic, setMusicVolume, initAudio };
