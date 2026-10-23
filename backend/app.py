"""
Voice-to-Text Converter — Flask Backend
Wraps SpeechRecognition in a clean REST API for browser-recorded audio.
Preserves original SpeechRecognition logic without requiring a server microphone.
"""

import os
import io
import wave
import logging
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import speech_recognition as sr

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("voice-to-text")

# Determine base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

# Initialize Flask application
app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    static_url_path=""
)

# Enable CORS for cross-origin frontend requests
CORS(app, resources={r"/*": {"origins": "*"}})

# Security and payload restrictions: 15 MB max audio upload size
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024

# Initialize SpeechRecognizer instance (reuses same core recognizer as jarvis.py)
recognizer = sr.Recognizer()
# Dynamic energy threshold configuration for audio files
recognizer.dynamic_energy_threshold = True


@app.route("/")
def serve_index():
    """Serves the frontend single-page application."""
    if os.path.exists(os.path.join(FRONTEND_DIR, "index.html")):
        return send_from_directory(FRONTEND_DIR, "index.html")
    return jsonify({
        "status": "online",
        "service": "Voice-to-Text Converter API",
        "endpoints": {
            "health": "/api/health",
            "transcribe": "/transcribe [POST]"
        }
    }), 200


@app.route("/<path:path>")
def serve_static_assets(path):
    """Serves static assets (css, js, images) from frontend directory."""
    if os.path.exists(os.path.join(FRONTEND_DIR, path)):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint for container and deployment liveness probes."""
    return jsonify({
        "status": "healthy",
        "service": "Voice-to-Text Converter",
        "recognizer_ready": True
    }), 200


def is_valid_wav(file_path):
    """Verify if a file is a valid readable RIFF/WAV file."""
    try:
        with wave.open(file_path, "rb") as wf:
            channels = wf.getnchannels()
            sample_rate = wf.getframerate()
            frames = wf.getnframes()
            logger.info(f"Valid WAV file: {channels} channel(s), {sample_rate}Hz, {frames} frames")
            return True
    except Exception as e:
        logger.warning(f"File is not a valid standard WAV: {e}")
        return False


def convert_to_wav(input_path, output_path):
    """
    Attempts conversion using pydub if audio is in another format (WebM/OGG).
    Returns True if converted, False otherwise.
    """
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(input_path)
        # Convert to 16kHz mono 16-bit PCM WAV (optimal for Google Speech API)
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        audio.export(output_path, format="wav")
        logger.info(f"Successfully converted audio to 16kHz WAV via pydub")
        return True
    except Exception as e:
        logger.warning(f"Audio conversion via pydub failed: {e}")
        return False


@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    """
    Transcribes audio uploaded from browser microphone.
    Accepts multipart/form-data with 'audio' or 'file' field.
    """
    # 1. Check if audio file was uploaded
    audio_file = None
    if "audio" in request.files:
        audio_file = request.files["audio"]
    elif "file" in request.files:
        audio_file = request.files["file"]
    
    if not audio_file or audio_file.filename == "":
        logger.warning("Transcription request rejected: No audio file provided")
        return jsonify({
            "success": False,
            "error": "No audio file received in the request. Please provide an audio recording.",
            "code": "MISSING_AUDIO"
        }), 400

    # Optional language selection (defaults to en-US)
    language = request.form.get("language", "en-US").strip()
    if not language:
        language = "en-US"

    temp_input_path = None
    temp_wav_path = None

    try:
        # Determine file extension/suffix
        filename = audio_file.filename.lower()
        suffix = ".wav"
        if filename.endswith(".webm"):
            suffix = ".webm"
        elif filename.endswith(".ogg"):
            suffix = ".ogg"
        elif filename.endswith(".mp3"):
            suffix = ".mp3"

        # Save uploaded audio stream to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
            audio_file.save(tmp_in.name)
            temp_input_path = tmp_in.name

        # Validate non-empty file
        file_size = os.path.getsize(temp_input_path)
        if file_size == 0:
            return jsonify({
                "success": False,
                "error": "The received audio recording is empty (0 bytes). Please try speaking again.",
                "code": "EMPTY_RECORDING"
            }), 400

        logger.info(f"Received audio recording ({file_size} bytes, format: {suffix})")

        # Determine if file is already valid WAV or needs conversion
        wav_ready_path = None
        if suffix == ".wav" and is_valid_wav(temp_input_path):
            wav_ready_path = temp_input_path
        else:
            # Try to convert to WAV
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_wav:
                temp_wav_path = tmp_wav.name
            
            converted = convert_to_wav(temp_input_path, temp_wav_path)
            if converted and is_valid_wav(temp_wav_path):
                wav_ready_path = temp_wav_path
            elif suffix == ".wav":
                # Let SpeechRecognition try reading it as fallback
                wav_ready_path = temp_input_path
            else:
                return jsonify({
                    "success": False,
                    "error": "The audio format was not recognized as PCM WAV, and conversion tools (FFmpeg) are not installed on the server. The website browser recorder automatically encodes directly to WAV — please ensure browser WAV recording is enabled.",
                    "code": "UNSUPPORTED_FORMAT"
                }), 415

        # Process audio using SpeechRecognition AudioFile
        with sr.AudioFile(wav_ready_path) as source:
            # Adjust for ambient noise slightly, then record the full audio segment
            recognizer.adjust_for_ambient_noise(source, duration=0.2)
            audio_data = recognizer.record(source)

        logger.info(f"Running Google Speech Recognition (language: {language})...")
        transcription = recognizer.recognize_google(audio_data, language=language)
        logger.info(f"Transcription result: '{transcription}'")

        return jsonify({
            "success": True,
            "text": transcription,
            "language": language,
            "message": "Transcription successful"
        }), 200

    except sr.UnknownValueError:
        logger.info("SpeechRecognition could not understand audio (sr.UnknownValueError)")
        return jsonify({
            "success": False,
            "error": "Sorry, couldn't understand any speech in the recording. Please speak clearly and try again.",
            "code": "UNINTELLIGIBLE"
        }), 422

    except sr.RequestError as e:
        logger.error(f"Google Speech Recognition service error: {e}")
        return jsonify({
            "success": False,
            "error": f"Speech recognition service is currently unavailable or unreachable: {str(e)}. Please check your internet connection.",
            "code": "SERVICE_UNAVAILABLE"
        }), 503

    except Exception as e:
        logger.exception("Unexpected error during audio transcription")
        return jsonify({
            "success": False,
            "error": f"An unexpected error occurred while processing the audio: {str(e)}",
            "code": "SERVER_ERROR"
        }), 500

    finally:
        # Secure cleanup: delete temporary audio files to protect user privacy
        for path in (temp_input_path, temp_wav_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as cleanup_err:
                    logger.warning(f"Could not delete temporary audio file {path}: {cleanup_err}")


@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        "success": False,
        "error": "Audio file size exceeds the 15 MB limit. Please record a shorter audio clip.",
        "code": "PAYLOAD_TOO_LARGE"
    }), 413


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("true", "1")
    logger.info(f"Starting Voice-to-Text server on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
