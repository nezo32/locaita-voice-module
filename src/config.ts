import { configDotenv } from "dotenv";

configDotenv({ path: ".env" });
configDotenv({
  path: ".env.local",
  override: true,
});

const config = {
  LOG_LEVEL: process.env.LOG_LEVEL as "fatal" | "error" | "warn" | "info" | "debug" | "trace" | undefined,
  SERVER_MODE: (process.env.SERVER_MODE || "all") as "telegram" | "discord" | "all",

  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || "",
  DISCORD_KEY: process.env.DISCORD_APIKEY || "",

  TELEGRAM_KEY: process.env.TELEGRAM_KEY || "",

  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",

  LLM_URL: process.env.LLM_URL || "",
  LLM_MODEL: process.env.LLM_MODEL || "gemma3:4b",
  SPEECH_TO_TEXT_URL: process.env.STT_URL || "",
  TEXT_TO_SPEECH_URL: process.env.TTS_URL || "",
};

if (!config.LLM_URL) {
  throw new Error("LLM_URL is not set in the environment variables.");
}

if (config.SERVER_MODE === "all" || config.SERVER_MODE === "discord") {
  if (!config.DISCORD_CLIENT_ID) {
    throw new Error("DISCORD_CLIENT_ID is not set in the environment variables.");
  }

  if (!config.DISCORD_GUILD_ID) {
    throw new Error("DISCORD_GUILD_ID is not set in the environment variables.");
  }

  if (!config.DISCORD_KEY) {
    throw new Error("DISCORD_APIKEY is not set in the environment variables.");
  }

  if (!config.SPEECH_TO_TEXT_URL) {
    throw new Error("SPEECH_TO_TEXT_URL is not set in the environment variables.");
  }

  if (!config.TEXT_TO_SPEECH_URL) {
    throw new Error("TEXT_TO_SPEECH_URL is not set in the environment variables.");
  }
}

if (config.SERVER_MODE === "all" || config.SERVER_MODE === "telegram") {
  if (!config.TELEGRAM_KEY) {
    throw new Error("TELEGRAM_KEY is not set in the environment variables.");
  }
}

if (!config.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set in the environment variables.");
}

if (!config.SUPABASE_KEY) {
  throw new Error("SUPABASE_KEY is not set in the environment variables.");
}

export default config;
