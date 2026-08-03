// Music player - uses MP3 file directly
let audio = null;
let musicPlaying = false;

function initAudio() {
    if (audio) return;
    audio = new Audio('music.mp3');
    audio.loop = true;
    audio.volume = 0.5;
}

function startMusic() {
    if (musicPlaying) return;
    initAudio();
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

window.GameMusic = { startMusic, stopMusic, setMusicVolume, initAudio };
