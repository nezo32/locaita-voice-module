import { joinVoiceChannel } from "@discordjs/voice";
import { APIInteractionGuildMember, Guild, GuildMember } from "discord.js";
import { VoiceChannelRecorder } from "./channelRecorder";
import { getAiResponse, transcription } from "../../ai";

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

    console.log(`Received recordings: ${recordings.length}`);

    const data = await Promise.all(
      recordings.map(async (item) => ({
        ...item,
        message: await transcription(item.wavBuffer!),
      }))
    );

    console.log(`Transcripted data: ${data.length}`);
    data.forEach((item) => {
      console.log(`username: ${item.username}, message: ${item.message}`);
    });

    const finalData = data.filter((item) => {
      const text = item.message.toLowerCase();
      return !(
        text.includes("продолжение следует") ||
        text.includes("редактор субтитров") ||
        text.includes("dimatorzok") ||
        text.includes("субтитры создавал")
      );
    });

    if (!finalData.length) return setTimeout(aiAsk, 2000);

    const response = await getAiResponse(finalData);
    console.log(`Got AI resopnse`);
    console.log(response);

    setTimeout(aiAsk, 2000);
  };

  setTimeout(aiAsk);
};
