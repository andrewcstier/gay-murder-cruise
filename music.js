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

window.GameMusic = { startMusic, stopMusic, setMusicVolume, initAudio, TRACKS };
