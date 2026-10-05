document.addEventListener('DOMContentLoaded', () => {
    // Audio Context
    let audioContext;
    let oscillators = [];
    let gainNode;

    // State
    let isPlaying = false;
    let isNoisePlaying = false;
    let brownNoiseNode;
    let currentFrequency = 440.0;
    let currentVolume = 0.5;
    let currentWaveform = 'sine';
    let currentMode = 'logarithmic';

    // DOM Elements
    const freqSlider = document.getElementById('freq-slider');
    const freqDisplay = document.getElementById('freq-display');
    const playStopBtn = document.getElementById('play-stop-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const waveformBtns = document.querySelectorAll('.waveform');
    const noiseToggle = document.getElementById('noise-toggle');
    const modeBtns = document.querySelectorAll('.mode-btn');

    function getAudioContext() {
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
            gainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        }
    }

    function startAudio() {
        if (isPlaying) return;
        getAudioContext();

        // Clean up any existing oscillators before starting new ones
        oscillators.forEach(osc => osc.stop());
        oscillators = [];

        if (currentMode === 'binaural') {
            const binauralBeat = 5; // The difference in Hz for the beat

            const oscLeft = audioContext.createOscillator();
            const pannerLeft = audioContext.createStereoPanner();
            pannerLeft.pan.value = -1; // Pan hard left
            oscLeft.frequency.setValueAtTime(currentFrequency - binauralBeat, audioContext.currentTime);
            oscLeft.type = currentWaveform;
            oscLeft.connect(pannerLeft).connect(gainNode);
            oscLeft.start();
            oscillators.push(oscLeft);

            const oscRight = audioContext.createOscillator();
            const pannerRight = audioContext.createStereoPanner();
            pannerRight.pan.value = 1; // Pan hard right
            oscRight.frequency.setValueAtTime(currentFrequency + binauralBeat, audioContext.currentTime);
            oscRight.type = currentWaveform;
            oscRight.connect(pannerRight).connect(gainNode);
            oscRight.start();
            oscillators.push(oscRight);

        } else {
            const osc = audioContext.createOscillator();
            osc.connect(gainNode);
            osc.frequency.setValueAtTime(currentFrequency, audioContext.currentTime);
            osc.type = currentWaveform;
            osc.start();
            oscillators.push(osc);
        }
        isPlaying = true;
        playStopBtn.textContent = 'Stop';
    }

    function stopAudio() {
        if (!isPlaying) return;
        oscillators.forEach(osc => osc.stop());
        oscillators = [];
        isPlaying = false;
        playStopBtn.textContent = 'Play';
        checkAndCloseAudioContext();
    }

    function checkAndCloseAudioContext() {
        if (!isPlaying && !isNoisePlaying && audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }
    }

    // Event Listeners
    playStopBtn.addEventListener('click', () => {
        if (isPlaying) {
            stopAudio();
        } else {
            startAudio();
        }
    });

    function updateVolume(newVolume) {
        currentVolume = Math.max(0, Math.min(1, newVolume));
        volumeSlider.value = currentVolume;
        // Update gainNode if it exists
        if (gainNode) {
            gainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        }
    }

    volumeSlider.addEventListener('mousedown', (e) => {
        const rect = volumeSlider.getBoundingClientRect();
        const thumbPosition = rect.left + volumeSlider.value * rect.width;
        const clickOffset = e.clientX - thumbPosition;

        const thumbWidth = 20; // As defined in CSS
        if (Math.abs(clickOffset) > thumbWidth / 2) {
            return;
        }

        const onMouseMove = (moveEvent) => {
            const newX = moveEvent.clientX - clickOffset;
            const sliderValue = (newX - rect.left) / rect.width;
            updateVolume(sliderValue);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    noiseToggle.addEventListener('change', async () => {
        if (noiseToggle.checked) {
            if (isNoisePlaying) return;
            getAudioContext();
            try {
                await audioContext.audioWorklet.addModule('brown-noise-processor.js');
                brownNoiseNode = new AudioWorkletNode(audioContext, 'brown-noise-processor');
                brownNoiseNode.connect(gainNode);
                isNoisePlaying = true;
            } catch (e) {
                console.error('Error loading audio worklet.', e);
            }
        } else {
            if (!isNoisePlaying) return;
            brownNoiseNode.disconnect();
            brownNoiseNode = null;
            isNoisePlaying = false;
            checkAndCloseAudioContext();
        }
    });

    waveformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            waveformBtns.forEach(b => b.classList.remove('active'));
            // Add active class to the clicked button
            btn.classList.add('active');

            currentWaveform = btn.dataset.wave;
            if (isPlaying) {
                oscillators.forEach(osc => osc.type = currentWaveform);
            }
        });
    });

    // Slider interaction logic
    const minFreq = 20;
    const maxFreq = 20000;
    const logMin = Math.log(minFreq);
    const logMax = Math.log(maxFreq);

    function updateFrequency(newFreq) {
        currentFrequency = newFreq;

        // Update audio if playing
        if (isPlaying) {
            if (currentMode === 'binaural') {
                const binauralBeat = 5;
                oscillators[0]?.frequency.setValueAtTime(currentFrequency - binauralBeat, audioContext.currentTime);
                oscillators[1]?.frequency.setValueAtTime(currentFrequency + binauralBeat, audioContext.currentTime);
            } else {
                oscillators[0]?.frequency.setValueAtTime(currentFrequency, audioContext.currentTime);
            }
        }

        // Update display
        freqDisplay.textContent = `${currentFrequency.toFixed(2)} Hz`;

        // Update slider position to match frequency
        const logCurr = Math.log(currentFrequency);
        const sliderValue = (logCurr - logMin) / (logMax - logMin);
        freqSlider.value = sliderValue;
    }

    // --- Musical Scale Definition ---
    const musicalFrequencies = [
        // C4 to B4
        261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88, 
        // C5 to B5
        523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, 880.00, 932.33, 987.77,
        // C6 to B6
        1046.50, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760.00, 1864.66, 1975.53
    ];

    // --- Mode Switching Logic ---
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            // If audio is playing, restart it to apply the new mode
            if (isPlaying) {
                startAudio();
            }
            updateFrequency(440.0);
        });
    });

    freqSlider.addEventListener('mousedown', (e) => {
        const rect = freqSlider.getBoundingClientRect();
        const thumbPosition = rect.left + freqSlider.value * rect.width;
        const clickOffset = e.clientX - thumbPosition;

        // Only start dragging if the click is on the thumb itself.
        // We'll give it a small tolerance.
        const thumbWidth = 36; // As defined in CSS
        if (Math.abs(clickOffset) > thumbWidth / 2) {
            return;
        }

        const onMouseMove = (moveEvent) => {
            const newX = moveEvent.clientX - clickOffset;
            const sliderValue = (newX - rect.left) / rect.width;
            const clampedValue = Math.max(0, Math.min(1, sliderValue));
            let newFreq;

            switch (currentMode) {
                case 'logarithmic':
                    newFreq = Math.exp(logMin + (logMax - logMin) * clampedValue);
                    break;
                case 'musical': {
                    const index = Math.round(clampedValue * (musicalFrequencies.length - 1));
                    newFreq = musicalFrequencies[index];
                    break;
                }
                case 'binaural':
                    // Use logarithmic scale for the base frequency
                    newFreq = Math.exp(logMin + (logMax - logMin) * clampedValue);
                    break;
                default:
                    newFreq = 440.0;
            }
            updateFrequency(newFreq);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Initialize frequency
    updateFrequency(440.0);
});
