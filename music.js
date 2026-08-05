// Music player - supports multiple tracks
let audio = null;
let musicPlaying = false;
let currentTrack = 'music.mp3';

const TRACKS = {
    hallway: 'music.mp3',
    charselect: 'music-charselect.mp3',
    panic: 'music-panic.mp3'
};

function initAudio(track) {
    const src = track || currentTrack;
    if (audio && audio.src.endsWith(src)) return;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.5;
    currentTrack = src;
}

function startMusic(track) {
    const src = track ? TRACKS[track] || track : currentTrack;
    if (musicPlaying && audio && audio.src.endsWith(src)) return;
    if (musicPlaying) stopMusic();
    initAudio(src);
    audio.play().catch(() => {});
    musicPlaying = true;
}

function stopMusic() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    musicPlaying = false;
}

function setMusicVolume(vol) {
    if (audio) audio.volume = vol;
}

function playWhoosh() {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, actx.currentTime + 0.8);
    osc.frequency.exponentialRampToValueAtTime(2000, actx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, actx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 2.0);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 2.0);
}

window.GameMusic = { startMusic, stopMusic, setMusicVolume, initAudio, playWhoosh, TRACKS };
