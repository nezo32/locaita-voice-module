import { Client, handle_file } from "@gradio/client";
import config from "./config";
import logger from "./logger";

logger.info(`[TTS] Connecting to TTS server...`);
const app = await Client.connect(config.TEXT_TO_SPEECH_URL);

logger.info(`[TTS] Customize TTS model...`);
await app.predict("/set_custom_model", {
    custom_ckpt_path: "hf://hotstone228/F5-TTS-Russian/model_last.safetensors",
    custom_vocab_path: "hf://hotstone228/F5-TTS-Russian/vocab.txt",
    custom_model_cfg: `{ "dim": 1024, "depth": 22, "heads": 16, "ff_mult": 2, "text_dim": 512, "text_mask_padding": False, "conv_layers": 4, "pe_attn_head": 1 }`,
})

logger.info(`[TTS] Switching TTS model...`)
await app.predict("/switch_tts_model", {
    new_choice: "Custom"
})

export const textToSpeech = async (text: string): Promise<{ data: [{ path: string }] }> => (await app.predict("/basic_tts", {
    ref_audio_input: handle_file('https://github.com/yaph/tts-samples/raw/refs/heads/main/mp3/Russian/ru-RU-DmitryNeural.mp3'),
    ref_text_input: "Солнце медленно садилось, окрашивая небо в золотые оттенки...",
    gen_text_input: text,
    remove_silence: false,
    randomize_seed: true,
    seed_input: 0,
    cross_fade_duration_slider: 0.15,
    nfe_slider: 32,
    speed_slider: 1,
})) as unknown as { data: [{ path: string }] }
