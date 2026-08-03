// "What Shall We Do with the Drunken Sailor" - from MIDI file
// Key of B minor, 140 BPM chiptune arrangement
// Melody extracted from Traditional - Drunken Sailor [MIDIfind.com].mid

let audioCtx = null;
let musicPlaying = false;
let masterGain = null;
let schedulerTimer = null;

const BPM = 140;
const BEAT = 60 / BPM;
const EIGHTH = BEAT / 2;

// Melody from MIDI Track 0, transposed up one octave for chiptune brightness
// Format: [frequency, duration_in_eighths]
const melody = [
    // Verse phrase 1: "What shall we do with the drunken sailor"
    [493.88, 2], [493.88, 2], [493.88, 1], [329.62, 1], [392.0, 1], [493.88, 1],
    [440.0, 2], [440.0, 2], [440.0, 1], [293.66, 1], [370.0, 1], [440.0, 1],
    [493.88, 2], [493.88, 2], [493.88, 1], [554.36, 1], [587.32, 1], [659.26, 1],
    [587.32, 1], [493.88, 1], [523.26, 1], [493.88, 1], [440.0, 1], [370.0, 1],
    [329.62, 2], [329.62, 2],

    // Verse phrase 2 (repeat): "What shall we do with the drunken sailor"
    [493.88, 2], [493.88, 2], [493.88, 1], [329.62, 1], [392.0, 1], [493.88, 1],
    [440.0, 2], [440.0, 2], [440.0, 1], [293.66, 1], [370.0, 1], [440.0, 1],
    [493.88, 2], [493.88, 2], [493.88, 1], [554.36, 1], [587.32, 1], [659.26, 1],
    [587.32, 1], [493.88, 1], [523.26, 1], [493.88, 1], [440.0, 1], [370.0, 1],
    [329.62, 2], [329.62, 2],

    // Chorus: "Hooray and up she rises" (faster rhythm - eighth notes)
    [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1],
    [329.62, 1], [392.0, 1], [493.88, 1],
    [440.0, 1], [440.0, 1], [440.0, 1], [440.0, 1], [440.0, 1], [440.0, 1], [440.0, 1], [440.0, 1],
    [293.66, 1], [370.0, 1], [440.0, 1],
    [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1], [493.88, 1],
    [554.36, 1], [587.32, 1], [659.26, 1],
    [587.32, 1], [493.88, 1], [523.26, 1], [493.88, 1], [440.0, 1], [370.0, 1],
    [329.62, 2], [329.62, 2],
];

// Bass line from MIDI Track 2 (G2=98Hz and F#2=92.5Hz alternating, root notes)
// Simplified pattern: G on Em measures, F# on D/F#m measures
const bass = [
    // Verse bass (follows chord changes: Em - D - Em - ending)
    [98.0, 2], [98.0, 2], [98.0, 2], [98.0, 2],   // Em
    [92.5, 2], [92.5, 2], [92.5, 2], [92.5, 2],   // D/F#
    [98.0, 2], [98.0, 2], [98.0, 2], [98.0, 2],   // Em
    [92.5, 2], [92.5, 2], [98.0, 2], [98.0, 2],   // D -> Em
    // Repeat for phrase 2
    [98.0, 2], [98.0, 2], [98.0, 2], [98.0, 2],
    [92.5, 2], [92.5, 2], [92.5, 2], [92.5, 2],
    [98.0, 2], [98.0, 2], [98.0, 2], [98.0, 2],
    [92.5, 2], [92.5, 2], [98.0, 2], [98.0, 2],
    // Chorus bass
    [98.0, 2], [98.0, 2], [98.0, 2], [98.0, 2],
    [92.5, 2], [92.5, 2],
    [92.5, 2], [92.5, 2], [92.5, 2], [92.5, 2],
    [98.0, 2], [98.0, 2],
    [98.0, 2], [98.0, 2], [98.0, 2], [98.0, 2],
    [92.5, 2], [92.5, 2],
    [92.5, 2], [92.5, 2], [98.0, 2], [98.0, 2],
    [98.0, 2], [98.0, 2],
];

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

// Playback state
let nextNoteTime = 0;
let melodyEighthPos = 0;
let bassEighthPos = 0;
let eighthCount = 0;

// Get total eighths in a pattern
function totalEighths(pattern) {
    let t = 0;
    for (const [, dur] of pattern) t += dur;
    return t;
}

// Find which note is playing at a given eighth position
function getNoteAt(pattern, pos) {
    let acc = 0;
    for (const [freq, dur] of pattern) {
        if (pos < acc + dur) return { freq, dur, isStart: pos === acc };
        acc += dur;
    }
    return { freq: 0, dur: 1, isStart: false };
}

const melodyTotal = totalEighths(melody);
const bassTotal = totalEighths(bass);

function scheduleNotes() {
    if (!musicPlaying) return;
    const now = audioCtx.currentTime;

    while (nextNoteTime < now + 0.3) {
        const t = nextNoteTime;

        // Melody
        const melPos = melodyEighthPos % melodyTotal;
        const mel = getNoteAt(melody, melPos);
        if (mel.isStart && mel.freq > 0) {
            const dur = mel.dur * EIGHTH;
            createOsc('square', mel.freq, t, dur * 0.8, 0.07, 0);
            createOsc('square', mel.freq, t, dur * 0.8, 0.025, 7);
        }

        // Bass
        const bPos = bassEighthPos % bassTotal;
        const bas = getNoteAt(bass, bPos);
        if (bas.isStart && bas.freq > 0) {
            const dur = bas.dur * EIGHTH;
            createOsc('triangle', bas.freq, t, dur * 0.65, 0.14, 0);
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

        melodyEighthPos++;
        bassEighthPos++;
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
    melodyEighthPos = 0;
    bassEighthPos = 0;
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
