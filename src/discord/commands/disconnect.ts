import { SlashCommandBuilder } from "discord.js";
import { Command } from "..";
import { getVoiceConnection } from "@discordjs/voice";

const command: Command = {
  data: new SlashCommandBuilder().setName("disconnect").setDescription("Disconnect from voice channel").toJSON(),
  async execute(interaction): Promise<string> {
    if (!interaction.member) {
      return "invalid member";
    }
    const guild = interaction.inCachedGuild() ? await interaction.guild.fetch() : interaction.guild;
    if (!guild) {
      return "Invalid guild";
    }

    const voiceConnection = getVoiceConnection(guild.id);
    if (!voiceConnection) {
      return "Not connected to any voice channel!";
    }
    const disconnected = voiceConnection.disconnect();
    if (!disconnected) {
      return "Failed to disconnect from voice channel!";
    }

    return "Disconnected from voice channel!";
  },
};

export default command;
