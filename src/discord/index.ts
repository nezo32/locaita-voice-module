import { Client, Events, GatewayIntentBits, REST } from "discord.js";
import config from "../config";
import { setupApplicationCommands } from "./api";
import { onVoiceStateChange } from "./api/events/voiceChange";

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

  console.log("Client is ready!");
} catch (e) {
  console.error(e);
}
