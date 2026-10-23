/**
 * Voice-to-Text Converter — Client-Side Application Logic
 * Integrates Web Audio API, real-time waveform visualization,
 * in-browser 16kHz PCM WAV encoding, SpeechSynthesis voice feedback,
 * and seamless asynchronous communication with the Python Flask backend.
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const recordBtn = document.getElementById('recordBtn');
  const micIcon = document.getElementById('micIcon');
  const stopIcon = document.getElementById('stopIcon');
  const spinnerIcon = document.getElementById('spinnerIcon');
  const micButtonWrapper = document.querySelector('.mic-button-wrapper');
  const micInstruction = document.getElementById('micInstruction');

  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const recordingTimer = document.getElementById('recordingTimer');

  const waveformCanvas = document.getElementById('waveformCanvas');
  const canvasCtx = waveformCanvas ? waveformCanvas.getContext('2d') : null;

  const transcriptionArea = document.getElementById('transcriptionArea');
  const emptyHint = document.getElementById('emptyHint');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');

  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const clearBtn = document.getElementById('clearBtn');

  const languageSelect = document.getElementById('languageSelect');
  const ttsToggle = document.getElementById('ttsToggle');

  const audioPlaybackContainer = document.getElementById('audioPlaybackContainer');
  const audioPreview = document.getElementById('audioPreview');

  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');
  const dismissErrorBtn = document.getElementById('dismissErrorBtn');
  const toastContainer = document.getElementById('toastContainer');

  // --- Application State ---
  let isRecording = false;
  let isProcessing = false;
  let audioStream = null;
  let audioContext = null;
  let audioInputSource = null;
  let audioProcessor = null;
  let analyserNode = null;
  let recordedAudioBuffers = [];
  let recordingStartTime = 0;
  let recordingTimerInterval = null;
  let animationFrameId = null;
  let lastRecordedBlobUrl = null;

  // --- Voice Feedback (Web Speech API) ---
  const TTS_STORAGE_KEY = 'vtt_speech_feedback_enabled';
  let ttsEnabled = localStorage.getItem(TTS_STORAGE_KEY) !== 'false';
  if (ttsToggle) {
    ttsToggle.checked = ttsEnabled;
    ttsToggle.addEventListener('change', () => {
      ttsEnabled = ttsToggle.checked;
      localStorage.setItem(TTS_STORAGE_KEY, ttsEnabled ? 'true' : 'false');
      if (ttsEnabled) {
        speakVoiceFeedback('Voice feedback enabled.');
        showToast('Voice feedback enabled', 'info');
      } else {
        showToast('Voice feedback disabled', 'info');
      }
    });
  }

  function speakVoiceFeedback(text) {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = languageSelect ? languageSelect.value : 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }

  // --- Status Management ---
  const STATUS_CONFIG = {
    ready: { label: 'Ready', className: 'status-ready' },
    requesting: { label: 'Requesting Microphone Access...', className: 'status-requesting' },
    recording: { label: 'Recording Voice...', className: 'status-recording' },
    processing: { label: 'Processing Audio...', className: 'status-processing' },
    success: { label: 'Transcription Success', className: 'status-success' },
    error: { label: 'Error', className: 'status-error' }
  };

  function updateStatus(stateKey, customLabel) {
    const config = STATUS_CONFIG[stateKey] || STATUS_CONFIG.ready;
    statusBadge.className = `status-badge ${config.className}`;
    statusText.textContent = customLabel || config.label;
  }

  // --- UI Toast Notifications ---
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2800);
  }

  // --- Error Display ---
  function showError(msg) {
    if (errorMessage && errorBanner) {
      errorMessage.textContent = msg;
      errorBanner.style.display = 'flex';
    }
    updateStatus('error', 'Error');
    showToast(msg, 'error');
  }

  function hideError() {
    if (errorBanner) {
      errorBanner.style.display = 'none';
    }
  }

  if (dismissErrorBtn) {
    dismissErrorBtn.addEventListener('click', hideError);
  }

  // --- Text Area & Counts ---
  function updateTextStats() {
    const text = transcriptionArea.value;
    const chars = text.length;
    const trimmed = text.trim();
    const words = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;

    charCount.textContent = `${chars} character${chars === 1 ? '' : 's'}`;
    wordCount.textContent = `${words} word${words === 1 ? '' : 's'}`;

    if (chars === 0) {
      emptyHint.style.opacity = '1';
      emptyHint.style.pointerEvents = 'none';
    } else {
      emptyHint.style.opacity = '0';
    }
  }

  transcriptionArea.addEventListener('input', updateTextStats);

  // --- Copy Text functionality ---
  async function copyTranscription() {
    const text = transcriptionArea.value;
    if (!text || text.trim().length === 0) {
      showToast('No transcribed text to copy yet.', 'info');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        transcriptionArea.select();
        document.execCommand('copy');
      }

      // Visual feedback
      copyBtnText.textContent = 'Copied!';
      copyBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
      copyBtn.style.color = '#a7f3d0';
      showToast('Text copied to clipboard!', 'success');

      setTimeout(() => {
        copyBtnText.textContent = 'Copy Text';
        copyBtn.style.borderColor = '';
        copyBtn.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Clipboard copy error:', err);
      showError('Failed to copy text to clipboard.');
    }
  }

  copyBtn.addEventListener('click', copyTranscription);

  // --- Clear Text functionality ---
  function clearTranscription() {
    if (transcriptionArea.value.length === 0) return;
    transcriptionArea.value = '';
    updateTextStats();
    showToast('Transcription cleared.', 'info');
  }

  clearBtn.addEventListener('click', clearTranscription);

  // --- Live Waveform Visualization ---
  function initWaveformCanvas() {
    if (!waveformCanvas || !canvasCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = waveformCanvas.getBoundingClientRect();
    waveformCanvas.width = rect.width * dpr;
    waveformCanvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr);
  }

  window.addEventListener('resize', initWaveformCanvas);
  setTimeout(initWaveformCanvas, 100);

  let idlePhase = 0;
  function drawWaveform() {
    if (!canvasCtx || !waveformCanvas) return;
    const width = waveformCanvas.getBoundingClientRect().width;
    const height = waveformCanvas.getBoundingClientRect().height;

    canvasCtx.clearRect(0, 0, width, height);

    if (isRecording && analyserNode) {
      // Live frequency data visualization
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      const barWidth = (width / (bufferLength * 0.65));
      let x = 0;

      for (let i = 0; i < bufferLength * 0.65; i++) {
        const barHeight = (dataArray[i] / 255) * (height * 0.85);

        // Dynamic neon gradient
        const gradient = canvasCtx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#f43f5e');
        gradient.addColorStop(0.5, '#8b5cf6');
        gradient.addColorStop(1, '#06b6d4');

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, height - barHeight, barWidth - 1.5, barHeight);

        x += barWidth;
      }
    } else {
      // Subtle ambient sine wave for idle state
      idlePhase += 0.04;
      canvasCtx.beginPath();
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgba(99, 102, 241, 0.35)';

      const midY = height / 2;
      for (let x = 0; x < width; x += 4) {
        const y = midY + Math.sin(x * 0.02 + idlePhase) * 6 * Math.sin(x / width * Math.PI);
        if (x === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
      }
      canvasCtx.stroke();
    }

    animationFrameId = requestAnimationFrame(drawWaveform);
  }

  drawWaveform();

  // --- In-Browser 16kHz PCM WAV Encoder ---
  /**
   * Encodes raw Float32 audio samples into standard 16-bit PCM WAV (RIFF/WAVEfmt).
   * Generates a 16000Hz mono audio file that Python SpeechRecognition / Google Speech API
   * natively recognizes without needing FFmpeg installed on the server!
   */
  function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);          // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true);           // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true);  // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true);           // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true);          // BitsPerSample (16 bits)

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Float32 to 16-bit signed PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function downsampleBuffer(buffer, inputSampleRate, targetSampleRate = 16000) {
    if (inputSampleRate === targetSampleRate) return buffer;
    if (inputSampleRate < targetSampleRate) return buffer;
    const sampleRateRatio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  function mergeBuffers(channelBuffers) {
    let totalLength = 0;
    for (let i = 0; i < channelBuffers.length; i++) {
      totalLength += channelBuffers[i].length;
    }
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < channelBuffers.length; i++) {
      result.set(channelBuffers[i], offset);
      offset += channelBuffers[i].length;
    }
    return result;
  }

  // --- Recording Start / Stop Controls ---
  async function startRecording() {
    if (isRecording || isProcessing) return;
    hideError();

    // Check browser audio support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('Your browser does not support microphone audio capture. Please use Chrome, Firefox, or Edge.');
      return;
    }

    updateStatus('requesting');
    micInstruction.textContent = 'Requesting Microphone Access...';

    try {
      // 1. Request microphone permission
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 2. Setup Web Audio API pipeline
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();

      audioInputSource = audioContext.createMediaStreamSource(audioStream);

      // Setup analyser for real-time visual waveform
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      audioInputSource.connect(analyserNode);

      // Setup processor node for capturing raw PCM samples
      const bufferSize = 4096;
      audioProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      recordedAudioBuffers = [];

      audioProcessor.onaudioprocess = function (e) {
        if (!isRecording) return;
        const channelData = e.inputBuffer.getChannelData(0);
        recordedAudioBuffers.push(new Float32Array(channelData));
      };

      audioInputSource.connect(audioProcessor);
      audioProcessor.connect(audioContext.destination);

      // 3. Update UI to recording state
      isRecording = true;
      micButtonWrapper.classList.add('recording');
      micIcon.style.display = 'none';
      stopIcon.style.display = 'block';
      spinnerIcon.style.display = 'none';
      recordBtn.setAttribute('aria-label', 'Stop recording voice');
      recordBtn.title = 'Click to stop recording voice';

      updateStatus('recording');
      micInstruction.textContent = 'Click to Stop Recording';

      // Start duration timer
      recordingStartTime = Date.now();
      recordingTimer.style.display = 'inline-block';
      recordingTimer.textContent = '00:00';
      clearInterval(recordingTimerInterval);
      recordingTimerInterval = setInterval(() => {
        const elapsedSecs = Math.floor((Date.now() - recordingStartTime) / 1000);
        const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
        const secs = String(elapsedSecs % 60).padStart(2, '0');
        recordingTimer.textContent = `${mins}:${secs}`;

        // Auto-stop after 60 seconds to protect network and memory
        if (elapsedSecs >= 60) {
          stopRecording();
          showToast('Maximum recording duration reached (60s). Processing speech...', 'info');
        }
      }, 1000);

      speakVoiceFeedback('Recording started.');
    } catch (err) {
      console.error('Microphone access failed:', err);
      cleanupAudioNodes();
      updateStatus('error');
      micInstruction.textContent = 'Click to Start Recording';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showError('Microphone permission was denied. Please allow microphone access in your browser site settings.');
        speakVoiceFeedback('Microphone permission denied.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        showError('No microphone detected on your device. Please connect a microphone.');
        speakVoiceFeedback('No microphone detected.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        showError('Microphone is currently in use by another application.');
      } else {
        showError(`Microphone error: ${err.message || err.name}`);
      }
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    clearInterval(recordingTimerInterval);
    recordingTimer.style.display = 'none';

    micButtonWrapper.classList.remove('recording');
    micIcon.style.display = 'none';
    stopIcon.style.display = 'none';
    spinnerIcon.style.display = 'block';
    recordBtn.setAttribute('aria-label', 'Processing audio...');
    recordBtn.disabled = true;

    updateStatus('processing');
    micInstruction.textContent = 'Processing Transcription...';

    // Disconnect and release audio stream tracks immediately
    const inputSampleRate = audioContext ? audioContext.sampleRate : 44100;
    const rawBuffers = recordedAudioBuffers.slice();
    cleanupAudioNodes();

    // Process recorded buffers into standard 16kHz mono WAV
    if (rawBuffers.length === 0) {
      showError('No audio captured. Please try speaking again.');
      resetMicButton();
      return;
    }

    const merged = mergeBuffers(rawBuffers);
    const downsampled = downsampleBuffer(merged, inputSampleRate, 16000);
    const wavBlob = encodeWAV(downsampled, 16000);

    // Attach preview for user convenience
    if (audioPlaybackContainer && audioPreview) {
      if (lastRecordedBlobUrl) URL.revokeObjectURL(lastRecordedBlobUrl);
      lastRecordedBlobUrl = URL.createObjectURL(wavBlob);
      audioPreview.src = lastRecordedBlobUrl;
      audioPlaybackContainer.style.display = 'flex';
    }

    // Send audio to Python backend
    sendAudioToBackend(wavBlob);
  }

  function cleanupAudioNodes() {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
    }
    if (audioProcessor) {
      audioProcessor.disconnect();
      audioProcessor = null;
    }
    if (audioInputSource) {
      audioInputSource.disconnect();
      audioInputSource = null;
    }
    if (analyserNode) {
      analyserNode.disconnect();
      analyserNode = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
  }

  function resetMicButton() {
    isProcessing = false;
    recordBtn.disabled = false;
    micIcon.style.display = 'block';
    stopIcon.style.display = 'none';
    spinnerIcon.style.display = 'none';
    recordBtn.setAttribute('aria-label', 'Start recording voice');
    recordBtn.title = 'Click to start recording voice';
    micInstruction.textContent = 'Click to Start Recording';
  }

  // --- Backend Communication (/transcribe) ---
  async function sendAudioToBackend(audioBlob) {
    isProcessing = true;
    const selectedLang = languageSelect ? languageSelect.value : 'en-US';

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('language', selectedLang);

    try {
      const response = await fetch('/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data && data.success) {
        // Success
        const convertedText = data.text || '';
        
        // Append or set text
        if (transcriptionArea.value.trim().length > 0) {
          transcriptionArea.value += '\n' + convertedText;
        } else {
          transcriptionArea.value = convertedText;
        }

        updateTextStats();
        updateStatus('success', 'Transcription Completed!');
        showToast('Speech transcribed successfully!', 'success');
        speakVoiceFeedback('Transcription completed.');

        setTimeout(() => {
          updateStatus('ready');
        }, 3000);
      } else {
        // Handled backend error
        const errText = (data && data.error) ? data.error : `Server returned error (${response.status})`;
        
        if (response.status === 422 || (data && data.code === 'UNINTELLIGIBLE')) {
          updateStatus('error', "Couldn't understand speech");
          showError("Sorry, couldn't understand any speech. Please speak clearly and try again.");
          speakVoiceFeedback("Sorry, couldn't understand.");
        } else {
          updateStatus('error');
          showError(errText);
          speakVoiceFeedback("Transcription error.");
        }
      }
    } catch (netErr) {
      console.error('Network request failed:', netErr);
      updateStatus('error', 'Connection Error');
      showError('Could not connect to the backend server. Make sure the Python Flask app is running.');
      speakVoiceFeedback('Connection error.');
    } finally {
      resetMicButton();
    }
  }

  // --- Main Button Click Handler ---
  recordBtn.addEventListener('click', () => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  // --- Initial Welcome Greeting ---
  updateTextStats();
  updateStatus('ready');

  // Welcome user once on first page interaction if TTS enabled
  let hasInteracted = false;
  document.addEventListener('click', () => {
    if (!hasInteracted) {
      hasInteracted = true;
      if (ttsEnabled) {
        speakVoiceFeedback('Hello, welcome to the voice-to-text converter.');
      }
    }
  }, { once: true });

})();
