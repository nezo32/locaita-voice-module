import { EndBehaviorType, VoiceReceiver } from "@discordjs/voice";
import { Snowflake } from "discord.js";
import { opus } from "prism-media";

export interface UserRecording {
  username: string;
  userId: string;
  wavBuffer?: Buffer;
  lastUpdate: Date;
}

// Интерфейс для параметров создания WAV-заголовка
export interface WaveHeaderOptions {
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  bitDepth: number;
  data: Buffer;
}

export class UserRecorder {
  private receiver: VoiceReceiver;
  private userId: Snowflake;
  private callback: (buffer: Buffer) => void;
  private audioStream?: ReturnType<VoiceReceiver["subscribe"]>;
  private opusDecoder?: opus.Decoder;
  private chunks: Buffer[] = [];
  private timeout?: NodeJS.Timeout;

  constructor(receiver: VoiceReceiver, userId: Snowflake, callback: (buffer: Buffer) => void) {
    this.receiver = receiver;
    this.userId = userId;
    this.callback = callback;
  }

  public start() {
    this.audioStream = this.receiver.subscribe(this.userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 2000,
      },
    });

    this.opusDecoder = new opus.Decoder({
      rate: 48000,
      channels: 2,
      frameSize: 960,
    });

    this.audioStream.pipe(this.opusDecoder).on("data", (chunk: Buffer) => {
      this.chunks.push(chunk);
    });
  }

  public stop() {
    this.finalizeRecording();
  }

  private finalizeRecording() {
    if (!this.audioStream || this.chunks.length === 0) return;

    const pcmData = Buffer.concat(this.chunks);
    const wavHeader = this.createWaveHeader({
      audioFormat: 1, // PCM
      numChannels: 2,
      sampleRate: 48000,
      bitDepth: 16,
      data: pcmData,
    });
    const wavBuffer = Buffer.concat([wavHeader, pcmData]);

    this.callback(wavBuffer);
    this.destroy();
  }

  private createWaveHeader({ audioFormat, numChannels, sampleRate, bitDepth, data }: WaveHeaderOptions) {
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    const dataSize = data.length;

    const buffer = Buffer.alloc(44);
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4); // Размер файла
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // Длина fmt блока
    buffer.writeUInt16LE(audioFormat, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitDepth, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
  }

  public destroy() {
    this.audioStream?.destroy();
    this.opusDecoder?.destroy();
    this.chunks = [];
    if (this.timeout) clearTimeout(this.timeout);
  }
}
