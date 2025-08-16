# Quick-start guide

## Install/Update CUDA & Drivers

#### [Download CUDA here](https://developer.nvidia.com/cuda-downloads)

#### [Download/Update Drivers here](https://www.nvidia.com/en-us/drivers/)

## Start Whisper.cpp (speech-to-text)

```bash
# Navigate to whisper.cpp directory
cd whisper.cpp

# Run binaries build
make

# Install speech-to-text models

bash models/download-ggml-model.sh large-v3-turbo # or any other whisper variant

# Run the whisper.cpp server (ex. ./start.sh [model] [language])
./start.sh
```

## Start LLM

#### [Download ollama](https://ollama.com/download)

#### Pull your desired model

```bash
ollama pull gemma3:4b # or any other ollama model
```

#### Start ollama server

```bash
ollama serve
```

## Start (text-to-speech)

#### Install F5-TTS

```bash
pip install f5-tts
```

#### Start F5-TTS Gradio App

```bash
f5-tts_infer-gradio
```

## Start the voice module server

#### Install dependencies

```bash
pnpm dev
```

#### Configure [.env](./.env) or create .env.local

```
DISCORD_APIKEY="paste-yours"
DISCORD_CLIENT_ID="paste-yours"
DISCORD_GUILD_ID="paste-yours"
TELEGRAM_KEY="paste-yours"
SUPABASE_URL="paste-yours"
SUPABASE_KEY="paste-yours"
```

#### Build server

```bash
pnpm build
```

#### Run the application

Discord bot

```bash
pnpm start:discord
```

Telegram bot

```bash
pnpm start:telegram
```
