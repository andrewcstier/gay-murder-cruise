// "What Shall We Do with the Drunken Sailor" - public domain sea shanty
// Faithful melody in D minor, upbeat chiptune arrangement at 140 BPM

let audioCtx = null;
let musicPlaying = false;
let masterGain = null;
let schedulerTimer = null;

const BPM = 140;
const EIGHTH = (60 / BPM) / 2;

// D minor scale frequencies
const N = {
    D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, C4: 261.63,
    D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16, C5: 523.25,
    D5: 587.33, E5: 659.25, F5: 698.46,
    D2: 73.42, A2: 110.00, F2: 87.31, G2: 98.00, C3: 130.81, Bb2: 116.54,
    R: 0,
};

// Melody: "What shall we do with the drunken sailor" (faithful transcription)
// In Dm, 2/4 time, eighth note pulse
const melody = [
    // Verse line 1: "What shall we do with the drunken sailor"
    N.D4, N.D4, N.D4, N.D4, N.D4, N.D4, N.D4, N.E4,
    N.F4, N.F4, N.F4, N.F4, N.F4, N.F4, N.F4, N.G4,
    // Verse line 2: "What shall we do with the drunken sailor"
    N.A4, N.A4, N.A4, N.A4, N.A4, N.A4, N.G4, N.F4,
    N.E4, N.E4, N.E4, N.E4, N.E4, N.E4, N.E4, N.E4,
    // Verse line 3: "What shall we do with the drunken sailor"
    N.D4, N.D4, N.D4, N.D4, N.D4, N.D4, N.D4, N.E4,
    N.F4, N.F4, N.F4, N.F4, N.F4, N.F4, N.F4, N.G4,
    // Verse line 4: "Early in the morning"
    N.A4, N.A4, N.G4, N.F4, N.E4, N.E4, N.D4, N.D4,
    N.D4, N.D4, N.D4, N.D4, N.D4, N.D4, N.R, N.R,

    // Chorus line 1: "Way hey and up she rises"
    N.D4, N.D4, N.E4, N.F4, N.G4, N.G4, N.A4, N.A4,
    N.A4, N.A4, N.G4, N.F4, N.E4, N.E4, N.D4, N.D4,
    // Chorus line 2: "Way hey and up she rises"
    N.D4, N.D4, N.E4, N.F4, N.G4, N.G4, N.A4, N.A4,
    N.A4, N.A4, N.G4, N.F4, N.E4, N.E4, N.D4, N.D4,
    // Chorus line 3: "Way hey and up she rises"
    N.D4, N.D4, N.E4, N.F4, N.G4, N.G4, N.A4, N.A4,
    N.A4, N.A4, N.G4, N.F4, N.E4, N.E4, N.D4, N.D4,
    // Chorus line 4: "Early in the morning"
    N.A4, N.A4, N.G4, N.F4, N.E4, N.E4, N.D4, N.D4,
    N.D4, N.D4, N.D4, N.D4, N.D4, N.D4, N.R, N.R,
];

// Bass line follows chord roots (Dm - F - C - Dm pattern)
const bassPattern = [
    // Dm
    N.D2, N.R, N.D3, N.R, N.D2, N.R, N.D3, N.R,
    // F
    N.F2, N.R, N.F3, N.R, N.F2, N.R, N.F3, N.R,
    // C
    N.C3, N.R, N.G2, N.R, N.C3, N.R, N.G2, N.R,
    // Dm
    N.D2, N.R, N.A2, N.R, N.D2, N.R, N.A2, N.R,
];

function createOsc(type, freq, startTime, duration, gain, detune) {
    if (freq === 0) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    g.gain.setValueAtTime(gain, startTime);
    g.gain.setValueAtTime(gain * 0.7, startTime + duration * 0.75);
    g.gain.linearRampToValueAtTime(0, startTime + duration * 0.95);
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
    g.gain.setValueAtTime(0.18, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.12);
}

function createHiHat(startTime, accent) {
    const bufSize = audioCtx.sampleRate * 0.04;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain();
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 8000;
    g.gain.setValueAtTime(accent ? 0.07 : 0.035, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
    src.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    src.start(startTime);
    src.stop(startTime + 0.04);
}

let nextNoteTime = 0;
let melodyIndex = 0;
let bassIndex = 0;
let beatCount = 0;

function scheduleNotes() {
    if (!musicPlaying) return;
    const now = audioCtx.currentTime;

    while (nextNoteTime < now + 0.3) {
        const t = nextNoteTime;
        const dur = EIGHTH;

        // Melody (square wave, main voice)
        const melNote = melody[melodyIndex % melody.length];
        createOsc('square', melNote, t, dur * 0.85, 0.07, 0);
        createOsc('square', melNote, t, dur * 0.85, 0.03, 7);
        melodyIndex++;

        // Bass (triangle wave, pumping)
        const bassNote = bassPattern[bassIndex % bassPattern.length];
        createOsc('triangle', bassNote, t, dur * 0.7, 0.13, 0);
        bassIndex++;

        // Drums: kick on beats 1 and 3 (every 4 eighth notes)
        if (beatCount % 4 === 0) {
            createKick(t);
        }
        // Hi-hat on every eighth, accent off-beats
        createHiHat(t, beatCount % 2 === 1);

        beatCount++;
        nextNoteTime += dur;
    }
}

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(audioCtx.destination);
}

function startMusic() {
    if (musicPlaying) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    musicPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.05;
    melodyIndex = 0;
    bassIndex = 0;
    beatCount = 0;
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
