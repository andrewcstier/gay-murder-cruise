// "What Shall We Do with the Drunken Sailor" - public domain sea shanty
// Faithful melody in D dorian at 140 BPM, chiptune arrangement

let audioCtx = null;
let musicPlaying = false;
let masterGain = null;
let schedulerTimer = null;

const BPM = 140;
const BEAT = 60 / BPM;

// Note frequencies
const N = {
    R: 0,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
    A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33,
    D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, C3: 130.81, D3: 146.83,
};

// Drunken Sailor melody - D dorian
// The verse melody: each phrase starts on D, leaps up to F, descends
// "What shall we do with the drunken sailor" x3 then "Early in the morning"
// Chorus: "Way hey and up she rises" x3 then "Early in the morning"
//
// Standard transcription in 2/4, eighth notes:
// Verse phrase: D4 D4 D4 D4 | D4 E4 F4 F4 | F4 F4 E4 E4 | D4 D4 D4 D4
// (repeated x3)
// "Early in the morning": A4 G4 F4 E4 | D4 D4 D4 R
//
// Chorus phrase: D4 F4 A4 A4 | A4 G4 F4 G4 | A4 A4 G4 F4 | E4 E4 D4 D4
// (repeated x3)
// "Early in the morning": A4 G4 F4 E4 | D4 D4 D4 R

const melody = [
    // Verse line 1: "What shall we do with the drunken sailor"
    N.D4, N.D4, N.D4, N.D4,  N.D4, N.E4, N.F4, N.F4,
    N.F4, N.F4, N.E4, N.E4,  N.D4, N.D4, N.D4, N.D4,
    // Verse line 2
    N.D4, N.D4, N.D4, N.D4,  N.D4, N.E4, N.F4, N.F4,
    N.F4, N.F4, N.E4, N.E4,  N.D4, N.D4, N.D4, N.D4,
    // Verse line 3
    N.D4, N.D4, N.D4, N.D4,  N.D4, N.E4, N.F4, N.F4,
    N.F4, N.F4, N.E4, N.E4,  N.D4, N.D4, N.D4, N.D4,
    // "Early in the morning"
    N.A4, N.A4, N.G4, N.F4,  N.E4, N.E4, N.D4, N.D4,
    N.D4, N.D4, N.D4, N.D4,  N.D4, N.R, N.R, N.R,

    // Chorus line 1: "Way hey and up she rises"
    N.D4, N.F4, N.A4, N.A4,  N.A4, N.G4, N.F4, N.G4,
    N.A4, N.A4, N.G4, N.F4,  N.E4, N.E4, N.D4, N.D4,
    // Chorus line 2
    N.D4, N.F4, N.A4, N.A4,  N.A4, N.G4, N.F4, N.G4,
    N.A4, N.A4, N.G4, N.F4,  N.E4, N.E4, N.D4, N.D4,
    // Chorus line 3
    N.D4, N.F4, N.A4, N.A4,  N.A4, N.G4, N.F4, N.G4,
    N.A4, N.A4, N.G4, N.F4,  N.E4, N.E4, N.D4, N.D4,
    // "Early in the morning"
    N.A4, N.A4, N.G4, N.F4,  N.E4, N.E4, N.D4, N.D4,
    N.D4, N.D4, N.D4, N.D4,  N.D4, N.R, N.R, N.R,
];

// Bass follows Dm - Dm - Dm - (Dm-C) | Dm - F - C - Dm pattern
const bassVerse = [
    N.D2, N.R, N.D3, N.R,  N.D2, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.D2, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.D2, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.D2, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.D2, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.D2, N.R, N.D3, N.R,
    N.A2, N.R, N.A2, N.R,  N.C3, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.D2, N.R, N.R, N.R,
];

const bassChorus = [
    N.D2, N.R, N.D3, N.R,  N.F2, N.R, N.F2, N.R,
    N.C3, N.R, N.C3, N.R,  N.D2, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.F2, N.R, N.F2, N.R,
    N.C3, N.R, N.C3, N.R,  N.D2, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.F2, N.R, N.F2, N.R,
    N.C3, N.R, N.C3, N.R,  N.D2, N.R, N.D3, N.R,
    N.A2, N.R, N.A2, N.R,  N.C3, N.R, N.D3, N.R,
    N.D2, N.R, N.D3, N.R,  N.D2, N.R, N.R, N.R,
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
let noteIndex = 0;
let beatCount = 0;

function scheduleNotes() {
    if (!musicPlaying) return;
    const now = audioCtx.currentTime;
    const eighthDur = BEAT / 2;

    while (nextNoteTime < now + 0.3) {
        const t = nextNoteTime;

        // Melody
        const melNote = melody[noteIndex % melody.length];
        createOsc('square', melNote, t, eighthDur * 0.8, 0.07, 0);
        if (melNote > 0) createOsc('square', melNote, t, eighthDur * 0.8, 0.025, 7);

        // Bass
        const bassNote = bass[noteIndex % bass.length];
        createOsc('triangle', bassNote, t, eighthDur * 0.65, 0.14, 0);

        // Kick on beats (every 4 eighth notes = every half note in 2/4)
        if (beatCount % 4 === 0) createKick(t);

        // Hi-hat on every eighth, accent off-beats
        createHiHat(t, beatCount % 2 === 1);

        // Snare-ish hit on beat 2 (every 4 eighths, offset by 2)
        if (beatCount % 4 === 2) {
            const snBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.06, audioCtx.sampleRate);
            const snD = snBuf.getChannelData(0);
            for (let i = 0; i < snD.length; i++) snD[i] = Math.random() * 2 - 1;
            const snSrc = audioCtx.createBufferSource();
            snSrc.buffer = snBuf;
            const snG = audioCtx.createGain();
            const snF = audioCtx.createBiquadFilter();
            snF.type = 'bandpass';
            snF.frequency.value = 3000;
            snG.gain.setValueAtTime(0.08, t);
            snG.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            snSrc.connect(snF);
            snF.connect(snG);
            snG.connect(masterGain);
            snSrc.start(t);
            snSrc.stop(t + 0.06);
        }

        noteIndex++;
        beatCount++;
        nextNoteTime += eighthDur;
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
    noteIndex = 0;
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
