import { joinVoiceChannel } from "@discordjs/voice";
import { APIInteractionGuildMember, Guild, GuildMember } from "discord.js";
import { VoiceChannelRecorder } from "./channelRecorder";
import { createChat, getAiResponse, transcription } from "../../../ai";
import { PostgrestError } from "@supabase/supabase-js";
import logger from "../../../logger";

export const joinVoice = async (member: GuildMember | APIInteractionGuildMember, guild: Guild): Promise<void> => {
  if (!(member instanceof GuildMember)) {
    member = await guild.members.fetch(member.user.id);
  }
  if (!member.voice.channelId) {
    throw new Error(`Member ${member.user.username} is not in a voice channel!`);
  }

  const connection = joinVoiceChannel({
    guildId: guild.id,
    channelId: member.voice.channelId,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  const recorder = new VoiceChannelRecorder(guild, connection);

  const aiAsk = async () => {
    const recordings = Array.from(recorder.getRecordings());
    recorder.cleanRecordings();

    if (!recordings.length) return setTimeout(aiAsk, 2000);

    logger.info(`[DISCORD] Received recordings: ${recordings.length}`);

    const data = await Promise.all(
      recordings.map(async (item) => ({
        ...item,
        message: await transcription(item.wavBuffer!),
      }))
    );

    logger.info(`[DISCORD] Transcripted data: ${data.length}`);
    data.forEach((item) => {
      logger.info(`[DISCORD] username: ${item.username}, message: ${item.message}`);
    });

    const finalData = data.filter((item) => item.message);

    if (!finalData.length) return setTimeout(aiAsk, 2000);

    const chatId = member.voice.channelId!;
    const error = await createChat(chatId);
    if (error instanceof PostgrestError) {
      logger.error(`[DISCORD] Failed to create chat ${chatId}`, error.message);
    } else {
      const response = await getAiResponse(chatId, finalData as { message: string; username: string }[]);
      logger.info({ response }, `[DISCORD] Got AI resopnse`);
    }

    setTimeout(aiAsk, 2000);
  };

  setTimeout(aiAsk);
};
