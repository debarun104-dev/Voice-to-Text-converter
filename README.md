# 💫 Hi 👋, I'm Debarun Mukherjee
**A passionate learner: UG|SXUK 2030|BTECH CSE AI/ML|FIRST YEAR|INDIA**

Email Me 👉 ✉️ **debarun104@gmail.com** For contact. 😊😊

---

# 🎙️ Voice-to-Text Converter — Full-Stack Web Application

A full-stack, real-time voice-to-text converter web application powered by **Python Flask**, **SpeechRecognition**, **Web Audio API**, and **HTML5/Vanilla CSS/JavaScript**. 

Speak directly into your device's microphone through a sleek, modern, dark-themed user interface, watch live animated audio waveform frequencies, and receive instant transcribed text that you can edit, format, and copy with a single click.

---

## 🌟 Key Features

- 🎤 **Interactive Browser Microphone**: Records directly from the visitor's microphone using modern `navigator.mediaDevices.getUserMedia` and Web Audio API — no server-side microphone required!
- 🌊 **Live Animated Waveform**: Real-time frequency visualizer rendered on an HTML5 Canvas using Web Audio `AnalyserNode`.
- ⚙️ **In-Browser 16kHz PCM WAV Encoding**: Encodes pure 16-bit 16000Hz mono WAV audio directly in JavaScript, matching Google's speech recognition engine with zero latency and eliminating the need for server-side FFmpeg installation!
- 📝 **Live Editable Transcription Area**: Instantly view transcribed speech, edit or append text manually, with real-time character and word count tracking.
- 📋 **One-Click Clipboard Copy**: Built-in clipboard copying with visual confirmation tooltip and toast feedback.
- 🗣️ **Browser Voice Feedback**: Optional spoken audio cues ("Recording started", "Transcription completed", "Sorry, couldn't understand") using the browser's native `speechSynthesis` API with an on/off toggle.
- 🌍 **Multi-Language Support**: Choose from English (US, UK, India), Hindi, Spanish, French, German, and Japanese.
- 🔒 **Privacy First & Secure**: Uploaded audio is processed in memory/temporary files and immediately deleted after transcription. No audio is logged or stored.
- 📱 **Fully Responsive**: Optimized for desktop, tablet, and mobile browsers.
- 💾 **Original Code Preserved**: The original Python desktop script is preserved byte-for-byte in [`jarvis.py`](jarvis.py) and [`backend/original_voice_to_text.py`](backend/original_voice_to_text.py).

---

## 🏗️ Architecture & Data Flow

```
+-------------------------------------------------------------------------+
|                              VISITOR'S BROWSER                          |
|                                                                         |
|  [Microphone]                                                           |
|       │                                                                 |
|       ▼                                                                 |
|  getUserMedia() ──► Web Audio API AnalyserNode ──► Live Waveform Canvas |
|       │                                                                 |
|       ▼                                                                 |
|  16kHz PCM Float32 Buffer ──► encodeWAV() (16-bit Mono RIFF WAV)        |
|                                     │                                   |
+-------------------------------------┼-----------------------------------+
                                      │ HTTP POST /transcribe (multipart)
                                      ▼
+-------------------------------------------------------------------------+
|                            PYTHON FLASK BACKEND                         |
|                                                                         |
|  Flask Endpoint (/transcribe)                                           |
|       │                                                                 |
|       ▼                                                                 |
|  Validate & Save Temp WAV ──► sr.AudioFile() ──► sr.Recognizer()        |
|                                                       │                 |
|                                                       ▼                 |
|                                      recognize_google(audio_data)       |
|                                                       │                 |
|                                                       ▼                 |
|  Auto-Delete Temp File ◄── Return JSON: { "success": true, "text": ... }|
+-------------------------------------------------------------------------+
```

---

## 📁 Project Structure

```
Voice-to-Text-converter/
├── backend/
│   ├── app.py                     # Flask REST API & static file server
│   ├── original_voice_to_text.py  # Exact preservation of original script
│   └── requirements.txt           # Python backend dependencies
├── frontend/
│   ├── index.html                 # Modern web interface layout
│   ├── style.css                  # Dark-mode styling, glowing mic, responsive
│   └── script.js                  # In-browser WAV encoder & Web Audio API
├── jarvis.py                      # Original desktop script (preserved)
├── Procfile                       # Production command for Render / Heroku
├── render.yaml                    # One-click Render Blueprint configuration
├── requirements.txt               # Root dependencies for deployment detection
└── README.md                      # Documentation & deployment guide
```

---

## 🚀 Quickstart: Running Locally

### 1. Prerequisites
- Python 3.8 or higher installed on your computer.
- A modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).
- An active internet connection (Google Speech Recognition API requires internet access).

### 2. Clone Repository
```bash
git clone https://github.com/debarun104-dev/Voice-to-Text-converter.git
cd Voice-to-Text-converter
```

### 3. Install Python Dependencies
```bash
python -m pip install -r backend/requirements.txt
```

### 4. Run the Web Application
```bash
python backend/app.py
```

### 5. Open in Your Browser
Open your browser and navigate to:
```
http://localhost:5000
```
- Click the large glowing **Microphone button**.
- Allow microphone permission when prompted by your browser.
- Speak clearly, then click the **Stop button** to transcribe!

---

## 🌐 Free Public Deployment (Step-by-Step on Render)

You can host this application online for free with automatic HTTPS (required for browser microphone permissions) using **Render**:

### Step 1: Push Code to GitHub
Ensure all your files are committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "Add full-stack voice to text web application"
git push origin main
```

### Step 2: Sign Up on Render
1. Go to [render.com](https://render.com) and sign in with your GitHub account.

### Step 3: Create a New Web Service
1. In the Render Dashboard, click **New +** → **Web Service**.
2. Select your repository: `debarun104-dev/Voice-to-Text-converter`.
3. Configure the service settings:
   - **Name**: `voice-to-text-converter` (or any name you like)
   - **Language / Runtime**: `Python 3`
   - **Region**: Choose the region closest to you (e.g., Singapore, Frankfurt, Oregon, Ohio)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (uses repo root)
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT`
   - **Instance Type**: `Free`
4. Click **Deploy Web Service**.

### Step 4: Test Your Public HTTPS Website
- Render will build your application and generate a public HTTPS URL (e.g. `https://voice-to-text-converter.onrender.com`).
- Open the URL on your computer or mobile phone.
- Because Render provides HTTPS, your browser will securely grant microphone permissions and record voice directly!

---

## ⚡ Free Public Deployment on Vercel

You can also deploy this application on **Vercel** with full Python Serverless support:

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Add Vercel deployment support"
git push origin main
```

### Step 2: Import Project on Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and log in with your GitHub account.
2. Under **Import Git Repository**, find `Voice-to-Text-converter` and click **Import**.
3. In the project configuration:
   - **Framework Preset**: Leave as `Other` (Vercel automatically detects `vercel.json`).
   - **Root Directory**: `./` (leave default).
4. Click **Deploy**.

Vercel will automatically build the static frontend via global Edge CDN and deploy the Python backend as a serverless function via `api/index.py` at your custom `https://*.vercel.app` domain!


---

## 🔒 Security & Privacy

- **No Audio Logging**: Audio recordings are processed in temporary files and securely deleted immediately in a `finally` block.
- **Upload Size Limit**: Audio uploads are capped at 15 MB to prevent payload abuse.
- **HTTPS Enforced**: Browser audio recording APIs (`getUserMedia`) strictly require HTTPS in production.

---

## 🌐 Socials:
[![LinkedIn](https://img.shields.io/badge/LinkedIn-%230077B5.svg?logo=linkedin&logoColor=white)](https://linkedin.com/in/debarun) [![email](https://img.shields.io/badge/Email-D14836?logo=gmail&logoColor=white)](mailto:debarun104@gmail.com) 

<div align="center">
  <img src="https://profile-readme-generator.com/assets/snake.svg" alt="Snake animation" />
</div>

# 💻 Tech Stack:
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

# 📊 GitHub Stats:
![](https://github-readme-stats.shion.dev/api?username=debarun104-dev&theme=dark&hide_border=false&include_all_commits=true&count_private=false)<br/>
![](https://streak-stats.demolab.com/?user=debarun104-dev&theme=dark&hide_border=false)<br/>
![](https://github-readme-stats.shion.dev/api/top-langs/?username=debarun104-dev&theme=dark&hide_border=false&include_all_commits=true&count_private=false&layout=compact)

## 🏆 GitHub Trophies
![](https://github-profile-trophy.vercel.app/?username=debarun104-dev&theme=radical&no-frame=false&no-bg=true&margin-w=4)

### 🔝 Top Contributed Repo
![](https://github-contributor-stats.vercel.app/api?username=debarun104-dev&limit=5&theme=dark&combine_all_yearly_contributions=true)

---
[![](https://komarev.com/ghpvc/?username=debarun104-dev&icon=0&color=0)](https://visitcount.itsvg.in)

<!-- Proudly created with GPRM ( https://gprm.itsvg.in ) -->
