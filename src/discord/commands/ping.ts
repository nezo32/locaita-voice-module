import { SlashCommandBuilder } from "discord.js";
import { Command } from "..";

const command: Command = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Pings the Loca Discord").toJSON(),
  async execute(interaction): Promise<string> {
    if (!interaction.member) {
      return "invalid member";
    }
    const guild = interaction.inCachedGuild() ? await interaction.guild.fetch() : interaction.guild;
    if (!guild) {
      return "Invalid guild";
    }

    return "pong!";
  },
};

export default command;
