import OpenAI from "openai";
import config from "./config";
import fs from "fs";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./types/database.types";
import logger from "./logger";
import { randomUUID } from "crypto";

logger.info("[LLM] Reading prompt and initializing connect to API/DB...");

const supabase = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_KEY);

const prompt = fs.readFileSync("prompt.txt", "utf-8");

export const transcription = async (audio: Buffer): Promise<string | undefined> => {
  const uuid = randomUUID();
  const path = `recordings/${uuid}.wav`;
  if (!fs.existsSync("recordings")) {
    fs.mkdirSync("recordings");
  }
  try {
    fs.writeFileSync(path, audio);
    const formData = new FormData();
    formData.append("file", `../${path}`);
    formData.append("temperature", "0.0");
    formData.append("temperature_inc", "0.2");
    formData.append("response_format", "json");
    const response = await axios.post<string, { data: { text: string } }>(config.SPEECH_TO_TEXT_URL, formData);
    return response.data.text;
  } catch (error) {
    logger.error({ error }, `[STT] Error occured while creating transcription`);
  } finally {
    if (fs.existsSync(path)) {
      fs.unlink(path, (error) => {
        if (error) {
          logger.error({ error }, `[STT] Failed to clearup temp audio file: ${uuid}.wav`);
          return;
        }
      });
    }
  }
};

export const createChat = async (id: string) => {
  const { data } = await supabase.from("chat").select("*").eq("id", id);
  if (data && data.length) return data;
  const { data: newChat, error } = await supabase
    .from("chat")
    .insert({
      id,
    })
    .select("*");
  if (error) return error;
  return newChat;
};

export const insertMessage = async ({
  username,
  message,
  chat_id,
}: {
  username: string;
  message: string;
  chat_id: string;
}) => {
  return (await supabase.from("context").insert({ ai: false, username, chat_id, text: message })).error;
};

export const getAiResponse = async (
  chat_id: string,
  input: { username: string; message: string }[]
): Promise<string | undefined> => {
  if (!input.length) return;

  const { data } = await supabase
    .from("context")
    .select("*")
    .eq("chat_id", chat_id)
    .order("created_at", { ascending: false })
    .limit(50);
  const context = data || ([] as { ai: boolean; text: string; username: string }[]);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: prompt },
    ...context.map<OpenAI.Chat.Completions.ChatCompletionMessageParam>((item) => ({
      role: item.ai ? "assistant" : "user",
      content: item.text,
      name: item.username,
    })),
    ...input.map((item) => ({ role: "user" as const, content: `/nothink\n\n${item.message}`, name: item.username })),
  ];

  const response = await axios.post<{
    message: {
      content: string;
    };
    total_duration: number;
  }>(config.LLM_URL, {
    model: config.LLM_MODEL,
    stream: false,
    temperature: 0.7,
    top_p: 0.8,
    top_k: 20,
    messages,
  });
  const answer = response.data.message.content;

  logger.info(`[LLM] Request processing duration: ${Math.ceil(response.data.total_duration / 1_000_000)}ms`);

  const { error: userError } = await supabase
    .from("context")
    .insert(input.map((item) => ({ ai: false, text: item.message, username: item.username, chat_id })));

  if (userError) {
    logger.error("[LLM] Error inserting user message:", userError);
  }

  const { error: aiError } = await supabase.from("context").insert({
    ai: true,
    text: answer,
    username: "Нира",
    chat_id,
  });
  if (aiError) {
    logger.error("[LLM] Error inserting AI message:", aiError);
  }

  return answer;
};

export const getAiResponseOnContext = async (chat_id: string) => {
  const { data } = await supabase
    .from("context")
    .select("*")
    .eq("chat_id", chat_id)
    .order("created_at", { ascending: true })
    .limit(200);
  const context = data || [];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: prompt },
    ...context.map<OpenAI.Chat.Completions.ChatCompletionMessageParam>((item) => ({
      role: item.ai ? "assistant" : "user",
      content: item.ai ? item.text : `${item.username}: ${item.text}`,
      name: item.username,
    })),
  ];

  const response = await axios.post<{
    message: {
      content: string;
    };
    total_duration: number;
  }>(config.LLM_URL, {
    model: config.LLM_MODEL,
    stream: false,
    messages,
  });
  const answer = response.data.message.content;

  const { error: aiError } = await supabase.from("context").insert({
    ai: true,
    text: answer,
    username: "Нира",
    chat_id: chat_id,
  });
  if (aiError) {
    logger.error({ error: aiError, chat_id }, "[LLM] Error inserting AI response to context");
  }

  return answer;
};
