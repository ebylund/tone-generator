document.addEventListener('DOMContentLoaded', () => {
    // Audio Context
    let audioContext;
    let oscillator;
    let gainNode;

    // State
    let isPlaying = false;
    let currentFrequency = 440.0;
    let currentVolume = 0.5;
    let currentWaveform = 'sine';

    // DOM Elements
    const freqSlider = document.getElementById('freq-slider');
    const freqDisplay = document.getElementById('freq-display');
    const playStopBtn = document.getElementById('play-stop-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const waveformBtns = document.querySelectorAll('.waveform');

    function startAudio() {
        if (isPlaying) return;
        // Create and configure audio nodes
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();

        // Connect nodes: Oscillator -> Gain -> Destination (speakers)
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Set initial values
        oscillator.frequency.setValueAtTime(currentFrequency, audioContext.currentTime);
        oscillator.type = currentWaveform;
        gainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);

        oscillator.start();
        isPlaying = true;
        playStopBtn.textContent = 'Stop';
    }

    function stopAudio() {
        if (!isPlaying) return;
        oscillator.stop();
        audioContext.close();
        isPlaying = false;
        playStopBtn.textContent = 'Play';
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
        if (isPlaying) {
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

    waveformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            waveformBtns.forEach(b => b.classList.remove('active'));
            // Add active class to the clicked button
            btn.classList.add('active');

            currentWaveform = btn.dataset.wave;
            if (isPlaying) {
                oscillator.type = currentWaveform;
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
            oscillator.frequency.setValueAtTime(currentFrequency, audioContext.currentTime);
        }

        // Update display
        freqDisplay.textContent = `${currentFrequency.toFixed(2)} Hz`;

        // Update slider position to match frequency
        const logCurr = Math.log(currentFrequency);
        const sliderValue = (logCurr - logMin) / (logMax - logMin);
        freqSlider.value = sliderValue;
    }

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

            const newFreq = Math.exp(logMin + (logMax - logMin) * clampedValue);
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
