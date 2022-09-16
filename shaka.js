"use strict";

function loadShaka() {
    const videoScript = document.createElement("script");
    videoScript.src = "https://cdn.jsdelivr.net/npm/shaka-player@4.1.2/dist/shaka-player.compiled.debug.min.js";
    document.head.appendChild(videoScript);
    return new Promise((resolve, reject) => {
        videoScript.onload = () => {
            if (window.shaka) {
                // Install built-in polyfills to patch browser incompatibilities.
                window.shaka.polyfill.installAll();
                resolve();
            }
            // Check to see if the browser supports the basic APIs Shaka needs.
            if (!shaka.Player.isBrowserSupported()) {
                // This browser does not have the minimum set of APIs we need.
                alert('Browser not supported!');
                reject();
            }
        };
    })
}

const shakaConfig = {
    streaming: {
        alwaysStreamText: true
    }
}

async function shakaInitPlayer(manifestUri) {
    // Create a Player instance.
    video = document.querySelector('video');
    player = new shaka.Player(video);

    // Attach player to the window to make it easy to access in the JS console
    window.shaka = player;

    // Listen for error events.
    player.addEventListener('error', shakaOnErrorEvent);

    // Listen for timeupdates here to update UI time
    const durationEl = document.querySelector(".video-time--duration")
    const currentTimeEl = document.querySelector(".video-time--currentTime")

    video.addEventListener('timeupdate', (event) => {
        const currentTime = video.currentTime
        const duration = video.duration
        currentTimeEl.innerHTML = parseTime(currentTime)
        const remainingTime = duration - currentTime
        durationEl.innerHTML = parseTime(remainingTime)
    })

    // set config
    player.configure(shakaConfig);
    
    // Try to load a manifest.
    // This is an asynchronous process.
    try {
        await player.load(manifestUri);
        // This runs if the asynchronous load is successful.
        player.setVideoContainer(video);

        // pull text track
        getSubtitleTracks();

        // pull audio tracks
        getAudioTracks()

        // set progress bar duration
        
        setProgressBar();
    } catch (e) {
        alert(e);
    }
}

function getSubtitleTracks() {
    // get avaialable subtitle tracks from Shaka
    const textTracks = player.getTextTracks();

    // select default language
    const englishSubtitles = textTracks.find(el => el.language == "en");
    const { id } = englishSubtitles;

    // disable default UI subtitles
    player.setTextTrackVisibility(false);

    // set Shaka default textTrack
    if (englishSubtitles) {
        player.selectTextTrack(textTracks[id - 1]);     
    }

    // add subtitle options to UI
    const subtitlesWrapper = document.querySelector(".video-container__subtitle-tracks");
    textTracks.forEach(({language}) => {
        let item = document.createElement("div");
        item.className = "track-item";
        item.innerText = language;
        subtitlesWrapper.appendChild(item);
        item.addEventListener("click", ({ target }) => {
            player.selectTextLanguage(target.innerText);
        })
    });

    video.textTracks[0].addEventListener('cuechange', ({target: {activeCues} = {}}) => {
        if (activeCues) renderSubtitle(activeCues);
    })
}

async function getAudioTracks() {
    // get audio tracks from shaka
    const audioTracks = await player.getAudioLanguages();

    // select default
    const englishAudio = audioTracks.includes("en");

    // set Shaka default audioTrack
    if (englishAudio) {
        player.selectAudioLanguage("en")
    };
    // add audio options to UI
    const audioWrapper = document.querySelector(".video-container__audio-tracks")
    audioTracks.map(language => {
        let item = document.createElement("div");
        item.className = "audio-track";
        item.innerText = language;
        audioWrapper.appendChild(item);
        item.addEventListener("click", ({ target }) => {
            player.selectAudioLanguage(target.innerHTML)
        })

    })
}
function renderSubtitle(activeCues) {
    if (activeCues[0]?.text) {
        document.querySelector(".video-container__subtitles").innerText = activeCues[0].text;
    } else {
        document.querySelector(".video-container__subtitles").innerText = "";
    }
}

function setProgressBar() {
    const progress = document.getElementById("progress");
    progress.setAttribute("max", video.duration);
    
    video.addEventListener('timeupdate', () => {
        progress.value = video.currentTime;
    });

    progress.addEventListener('click', (e) => {
        const rect = progress.getBoundingClientRect();
        const pos = (e.pageX  - rect.left) / progress.offsetWidth;
        video.currentTime = pos * video.duration;
    });
}

function shakaOnErrorEvent(event) {
    // Extract the shaka.util.Error object from the event.
    alert(event.detail);
}