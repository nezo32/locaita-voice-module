import { Client, Events, GatewayIntentBits, REST } from "discord.js";
import config from "../config";
import { setupApplicationCommands } from "./api";
import { onVoiceStateChange } from "./api/events/voiceChange";
import logger from "../logger";
import { textToSpeech } from "../tts";

const result = await textToSpeech("Че такое залупа? ТЫ ахуел?");
console.log(result);

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildMessages,
  ],
});

const onReadyPromise = new Promise((resolve, reject) => {
  client.on(Events.ClientReady, resolve);
  client.on(Events.Error, reject);
});

try {
  await client.login(config.DISCORD_KEY);
  await onReadyPromise;

  setupApplicationCommands(client);
  onVoiceStateChange(client);

  logger.info("[DISCORD] Client is ready!");
} catch (error) {
  logger.error({ error }, `[DISCORD] Error occured`);
}
