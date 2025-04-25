import { REST, Routes } from "discord.js";
import config from "../config";
import { commands } from ".";

const rest = new REST().setToken(config.DISCORD_KEY);
try {
  console.log(`Started refreshing ${commands.length} application (/) commands.`);

  const data = await rest.put(Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, "1039149911817596988"), {
    body: commands.map((command) => command.data),
  });

  console.log(`Successfully reloaded ${(data as unknown[]).length} application (/) commands.`);
} catch (error) {
  console.error(error);
}
