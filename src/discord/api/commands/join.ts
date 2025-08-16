import { SlashCommandBuilder } from "discord.js";
import { Command } from "..";
import { joinVoice } from "../utils/joinVoice";

const command: Command = {
  data: new SlashCommandBuilder().setName("join").setDescription("Joins to requester voice channel").toJSON(),
  async execute(interaction): Promise<string> {
    if (!interaction.member) {
      return "invalid member";
    }
    const guild = interaction.inCachedGuild() ? await interaction.guild.fetch() : interaction.guild;
    if (!guild) {
      return "Invalid guild";
    }

    if (!guild.members.cache.get(interaction.user.id)?.voice.channelId) {
      return "You are not in a voice channel!";
    }

    await joinVoice(interaction.member, guild);
    return "Joining your voice channel!";
  },
};

export default command;
