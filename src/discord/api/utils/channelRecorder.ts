import { VoiceConnection, VoiceConnectionStatus, VoiceReceiver } from "@discordjs/voice";
import { Collection, Guild, GuildMember, Snowflake } from "discord.js";
import { UserRecorder, UserRecording } from "./userRecorder";

export class VoiceChannelRecorder {
  private connection: VoiceConnection;
  private guild: Guild;
  private receiver: VoiceReceiver;
  private recorders: Map<Snowflake, UserRecorder> = new Map();
  private recordings: UserRecording[] = [];
  private guildMembers: Collection<Snowflake, GuildMember>;

  constructor(guild: Guild, connection: VoiceConnection) {
    this.connection = connection;
    this.receiver = connection.receiver;
    this.guild = guild;
    this.guildMembers = guild.members.cache;

    this.setupListeners();
  }

  private setupListeners() {
    // Обработка текущих участников канала
    this.updateRecorders();

    // Обработка новых подключений
    this.connection.on("stateChange", async (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Ready) {
        this.updateRecorders();
      }
    });

    // Отслеживание активности речи
    this.receiver.speaking.on("start", (userId) => {
      this.handleUserActivity(userId, true);
    });

    this.receiver.speaking.on("end", (userId) => {
      this.handleUserActivity(userId, false);
    });
  }

  private async updateRecorders() {
    const members = await this.getChannelMembers();

    members.forEach((member) => {
      if (!this.recorders.has(member.id)) {
        this.recorders.set(
          member.id,
          new UserRecorder(this.receiver, member.id, (buffer) => this.handleRecordingComplete(member.id, buffer))
        );
      }
    });
  }

  private async getChannelMembers(): Promise<GuildMember[]> {
    const voiceStates = this.guild.voiceStates.cache;
    return voiceStates
      .filter((state) => state.channelId === this.connection.joinConfig.channelId)
      .map((state) => state.member!);
  }

  private handleUserActivity(userId: Snowflake, speaking: boolean) {
    const recorder = this.recorders.get(userId);
    if (!recorder) return;

    if (speaking) {
      recorder.start();
    } else {
      recorder.stop();
    }
  }

  private handleRecordingComplete(userId: Snowflake, buffer: Buffer) {
    const member = this.guildMembers.get(userId);
    if (!member) return;

    this.recordings.push({
      username: member.displayName,
      userId: userId,
      wavBuffer: buffer,
      lastUpdate: new Date(),
    });
  }

  public getRecordings(): UserRecording[] {
    return this.recordings.filter((r) => r.wavBuffer);
  }

  public cleanRecordings(): void {
    this.recordings = [];
  }

  public cleanup() {
    this.recorders.forEach((recorder) => recorder.destroy());
    this.recorders.clear();
  }
}
