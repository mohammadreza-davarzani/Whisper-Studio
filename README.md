# Whisper Studio

<p align="center">
  
<img width="120" height="120" alt="Whisper Studio" src="https://github.com/user-attachments/assets/8c76ac8a-29a2-4781-9932-76286cfa4894" />

</p>

<h1 align="center">Whisper Studio</h1>

<p align="center">
  <strong>Whisper Studio is an independent desktop interface for OpenAI Whisper.</strong><br/>
	<span>complete with apps for macOS, Windows, Linux</span>
</p>

<img width="3840" height="2280" alt="image 36" src="/screenshots/first.png" />

<img width="3840" height="2275" alt="Screenshot 2026-06-29 191632" src="https://github.com/user-attachments/assets/8ad99bec-276e-4781-b948-d95cb9682a29" />

<img width="3840" height="2280" alt="image 38" src="https://github.com/user-attachments/assets/0f9000bf-19b5-4d27-b1fe-e90e1b5bdb70" />

A cross-platform desktop application for AI-powered audio and video transcription using [OpenAI Whisper](https://github.com/openai/whisper). Built with Electron, React, TypeScript, and Vite.

Whisper Studio runs entirely on your machine — no cloud services, no data leaves your device. Transcribe audio or video files, edit the resulting transcript, and export to SRT, VTT, TXT, TSV, or JSON.

## Features

- Transcribe audio and video files locally using OpenAI Whisper
- GPU (CUDA) and CPU compute modes
- Real-time transcription progress and live log output
- Interactive transcript editor with search and replace
- Export to SRT, VTT, TXT, TSV, and JSON
- Model manager — download and delete Whisper models in-app
- Prerequisite checker for Python, FFmpeg, CUDA, and pip packages
- Dark / light theme

## Stack

- Electron for cross-platform desktop runtime
- React and Vite for the renderer workbench
- shadcn/ui and Tailwind CSS for the renderer design system
- TypeScript project references for main, preload, renderer, and shared code
- Electron Builder for macOS, Windows, and Linux packaging
- ESLint and Prettier for contributor-friendly consistency

## Getting Started

```bash
npm install
npm run dev
```

## Release Targets

Electron Builder is configured for:

- macOS: `dmg`, `zip`
- Windows: `nsis`, `portable`
- Linux: `AppImage`, `deb`

Code signing, notarization, update feeds, and platform-specific icons should be added before publishing production releases.

Tagged releases that match `v*` run `.github/workflows/release.yml` and upload platform artifacts from macOS, Windows, and Linux runners.
