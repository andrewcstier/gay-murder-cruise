// Upbeat chiptune "Drunken Sailor" in major key at 140 BPM
// Public domain sea shanty with a gay disco spin

let audioCtx = null;
let musicPlaying = false;
let masterGain = null;
let schedulerTimer = null;

const BPM = 140;
const BEAT = 60 / BPM;
const SIXTEENTH = BEAT / 4;

// Notes as frequencies (major key, transposed up for brightness)
const NOTE = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
    A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
    F5: 698.46, G5: 783.99, A5: 880.00,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
    A3: 220.00, B3: 246.94,
};

// "Drunken Sailor" melody transposed to C major, upbeat
const melody = [
    // "What shall we do with the drunken sailor" (first phrase)
    { note: NOTE.E4, dur: 1 }, { note: NOTE.E4, dur: 1 },
    { note: NOTE.E4, dur: 1 }, { note: NOTE.E4, dur: 1 },
    { note: NOTE.E4, dur: 1 }, { note: NOTE.E4, dur: 0.5 }, { note: NOTE.F4, dur: 0.5 },
    { note: NOTE.G4, dur: 1 }, { note: NOTE.G4, dur: 1 },
    // repeat with variation
    { note: NOTE.G4, dur: 1 }, { note: NOTE.G4, dur: 1 },
    { note: NOTE.G4, dur: 1 }, { note: NOTE.G4, dur: 0.5 }, { note: NOTE.A4, dur: 0.5 },
    { note: NOTE.B4, dur: 1 }, { note: NOTE.B4, dur: 1 },
    // "Early in the morning"
    { note: NOTE.A4, dur: 1 }, { note: NOTE.G4, dur: 1 },
    { note: NOTE.A4, dur: 1 }, { note: NOTE.B4, dur: 0.5 }, { note: NOTE.A4, dur: 0.5 },
    { note: NOTE.G4, dur: 1 }, { note: NOTE.E4, dur: 1 },
    { note: NOTE.E4, dur: 1 }, { note: NOTE.D4, dur: 1 },
    // "Hooray and up she rises" (chorus - higher energy)
    { note: NOTE.C5, dur: 1 }, { note: NOTE.C5, dur: 1 },
    { note: NOTE.B4, dur: 1 }, { note: NOTE.A4, dur: 1 },
    { note: NOTE.G4, dur: 1 }, { note: NOTE.A4, dur: 0.5 }, { note: NOTE.B4, dur: 0.5 },
    { note: NOTE.C5, dur: 2 },
    // second "hooray"
    { note: NOTE.C5, dur: 1 }, { note: NOTE.C5, dur: 1 },
    { note: NOTE.B4, dur: 1 }, { note: NOTE.A4, dur: 1 },
    { note: NOTE.G4, dur: 1 }, { note: NOTE.E4, dur: 1 },
    { note: NOTE.D4, dur: 1 }, { note: NOTE.C4, dur: 1 },
];

// Disco bass line (four on the floor with octave jumps)
const bassLine = [
    { note: NOTE.C3, dur: 0.5 }, { note: NOTE.C3, dur: 0.5 },
    { note: NOTE.C3, dur: 0.5 }, { note: NOTE.G3, dur: 0.5 },
    { note: NOTE.A3, dur: 0.5 }, { note: NOTE.A3, dur: 0.5 },
    { note: NOTE.A3, dur: 0.5 }, { note: NOTE.E3, dur: 0.5 },
    { note: NOTE.F3, dur: 0.5 }, { note: NOTE.F3, dur: 0.5 },
    { note: NOTE.G3, dur: 0.5 }, { note: NOTE.G3, dur: 0.5 },
    { note: NOTE.C3, dur: 0.5 }, { note: NOTE.C3, dur: 0.5 },
    { note: NOTE.G3, dur: 0.5 }, { note: NOTE.G3, dur: 0.5 },
];

// Arpeggio pattern for sparkle
const arpeggio = [
    { note: NOTE.C5, dur: 0.25 }, { note: NOTE.E5, dur: 0.25 },
    { note: NOTE.G5, dur: 0.25 }, { note: NOTE.E5, dur: 0.25 },
    { note: NOTE.C5, dur: 0.25 }, { note: NOTE.G4, dur: 0.25 },
    { note: NOTE.E4, dur: 0.25 }, { note: NOTE.G4, dur: 0.25 },
    { note: NOTE.A4, dur: 0.25 }, { note: NOTE.C5, dur: 0.25 },
    { note: NOTE.E5, dur: 0.25 }, { note: NOTE.C5, dur: 0.25 },
    { note: NOTE.A4, dur: 0.25 }, { note: NOTE.E4, dur: 0.25 },
    { note: NOTE.A4, dur: 0.25 }, { note: NOTE.C5, dur: 0.25 },
];

function createSquareOsc(freq, startTime, duration, gain, detune) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.detune.value = detune || 0;
    g.gain.setValueAtTime(gain, startTime);
    g.gain.setValueAtTime(gain, startTime + duration * 0.8);
    g.gain.linearRampToValueAtTime(0, startTime + duration * 0.95);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function createTriangleOsc(freq, startTime, duration, gain) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, startTime);
    g.gain.setValueAtTime(gain * 0.8, startTime + duration * 0.7);
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function createNoiseHit(startTime, duration, gain) {
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const g = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    noise.start(startTime);
    noise.stop(startTime + duration);
}

function schedulePattern(pattern, startTime, createFn, gain, loop) {
    let t = startTime;
    const notes = loop ? [...pattern, ...pattern, ...pattern, ...pattern] : pattern;
    for (const step of notes) {
        const dur = step.dur * BEAT;
        createFn(step.note, t, dur * 0.9, gain);
        t += dur;
    }
    return t - startTime;
}

let nextBarTime = 0;
let barIndex = 0;

function scheduleBar() {
    if (!musicPlaying) return;

    const now = audioCtx.currentTime;
    while (nextBarTime < now + 0.5) {
        const barStart = nextBarTime;

        // Melody (square wave, slight detune for thickness)
        let melodyTime = barStart;
        const melodyStart = (barIndex * 8) % melody.length;
        for (let i = 0; i < 8; i++) {
            const idx = (melodyStart + i) % melody.length;
            const step = melody[idx];
            const dur = step.dur * BEAT;
            createSquareOsc(step.note, melodyTime, dur * 0.85, 0.08, 5);
            createSquareOsc(step.note * 1.002, melodyTime, dur * 0.85, 0.05, -5);
            melodyTime += dur;
        }

        // Bass (triangle wave - punchy)
        let bassTime = barStart;
        const bassStart = (barIndex * 4) % bassLine.length;
        for (let i = 0; i < 4; i++) {
            const idx = (bassStart + i) % bassLine.length;
            const step = bassLine[idx];
            const dur = step.dur * BEAT;
            createTriangleOsc(step.note, bassTime, dur * 0.7, 0.12);
            bassTime += dur;
        }

        // Arpeggio (quieter square, every other bar)
        if (barIndex % 2 === 0) {
            let arpTime = barStart;
            const arpStart = (barIndex * 8) % arpeggio.length;
            for (let i = 0; i < 8; i++) {
                const idx = (arpStart + i) % arpeggio.length;
                const step = arpeggio[idx];
                const dur = step.dur * BEAT;
                createSquareOsc(step.note, arpTime, dur * 0.5, 0.03);
                arpTime += dur;
            }
        }

        // Hi-hat (disco pattern: every eighth note with accents on off-beats)
        for (let i = 0; i < 8; i++) {
            const accent = i % 2 === 1 ? 0.06 : 0.03;
            createNoiseHit(barStart + i * BEAT * 0.5, 0.05, accent);
        }

        // Kick on beats 1 and 3 (four on the floor)
        for (let i = 0; i < 4; i++) {
            const kickTime = barStart + i * BEAT;
            const kickOsc = audioCtx.createOscillator();
            const kickGain = audioCtx.createGain();
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(150, kickTime);
            kickOsc.frequency.exponentialRampToValueAtTime(40, kickTime + 0.1);
            kickGain.gain.setValueAtTime(0.15, kickTime);
            kickGain.gain.exponentialRampToValueAtTime(0.001, kickTime + 0.15);
            kickOsc.connect(kickGain);
            kickGain.connect(masterGain);
            kickOsc.start(kickTime);
            kickOsc.stop(kickTime + 0.15);
        }

        nextBarTime += BEAT * 4;
        barIndex++;
    }
}

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(audioCtx.destination);
}

function startMusic() {
    if (musicPlaying) return;
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    musicPlaying = true;
    nextBarTime = audioCtx.currentTime + 0.1;
    barIndex = 0;
    schedulerTimer = setInterval(scheduleBar, 100);
    scheduleBar();
}

function stopMusic() {
    musicPlaying = false;
    if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
    }
}

function setMusicVolume(vol) {
    if (masterGain) {
        masterGain.gain.value = vol;
    }
}

window.GameMusic = { startMusic, stopMusic, setMusicVolume, initAudio };
