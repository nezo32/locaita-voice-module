import { configDotenv } from "dotenv";

configDotenv();

const config = {
  DEEPSEEK_KEY: process.env.DEEPSEEK_APIKEY || "",
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || "",
  DISCORD_KEY: process.env.DISCORD_APIKEY || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
};

if (!config.DEEPSEEK_KEY) {
  throw new Error("DEEPSEEK_APIKEY is not set in the environment variables.");
}

if (!config.DISCORD_CLIENT_ID) {
  throw new Error("DISCORD_CLIENT_ID is not set in the environment variables.");
}

if (!config.DISCORD_GUILD_ID) {
  throw new Error("DISCORD_GUILD_ID is not set in the environment variables.");
}

if (!config.DISCORD_KEY) {
  throw new Error("DISCORD_APIKEY is not set in the environment variables.");
}

if (!config.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set in the environment variables.");
}

if (!config.SUPABASE_KEY) {
  throw new Error("SUPABASE_KEY is not set in the environment variables.");
}

export default config;
