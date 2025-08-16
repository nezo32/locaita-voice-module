import { REST, Routes } from "discord.js";
import config from "../../config";
import { commands } from ".";
import logger from "../../logger";

const rest = new REST().setToken(config.DISCORD_KEY);
try {
  logger.info(`[DISCORD-DEPLOY] Started refreshing ${commands.length} application (/) commands.`);

  const data = await rest.put(Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, "1039149911817596988"), {
    body: commands.map((command) => command.data),
  });

  logger.info(`[DISCORD-DEPLOY]Successfully reloaded ${(data as unknown[]).length} application (/) commands.`);
} catch (error) {
  logger.error({ error }, `[DISCORD-DEPLOY] Error occured`);
}
