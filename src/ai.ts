import OpenAI from "openai";
import config from "./config";
import fs from "fs";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./types/database.types";
import logger from "./logger";

logger.info("Чтение промта и подключение к API/DB...");

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: config.DEEPSEEK_KEY,
});

const supabase = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_KEY);

const prompt = fs.readFileSync("prompt.txt", "utf-8");

export const transcription = async (audio: Buffer): Promise<string> => {
  const start = performance.now();
  const response = await axios.post("http://localhost:5000", audio);
  console.log(`Transcription took ${performance.now() - start}ms`);
  return response.data;
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
    .limit(1000);
  const context = data || [];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: prompt },
    ...context.map<OpenAI.Chat.Completions.ChatCompletionMessageParam>((item) => ({
      role: item.ai ? "assistant" : "user",
      content: item.text,
      name: item.username,
    })),
    ...input.map((item) => ({ role: "user" as const, content: item.message, name: item.username })),
  ];

  const answer =
    (
      await deepseek.chat.completions.create({
        messages,
        model: "deepseek-chat",
        n: 1,
      })
    ).choices[0].message.content || "";

  const { error: userError } = await supabase
    .from("context")
    .insert(input.map((item) => ({ ai: false, text: item.message, username: item.username, chat_id })));

  if (userError) {
    console.error("Error inserting user message:", userError);
  }

  const { error: aiError } = await supabase.from("context").insert({
    ai: true,
    text: answer,
    username: "Нира",
    chat_id,
  });
  if (aiError) {
    console.error("Error inserting AI message:", aiError);
  }

  return answer;
};

export const getAiResponseOnContext = async (chat_id: string) => {
  const { data } = await supabase
    .from("context")
    .select("*")
    .eq("chat_id", chat_id)
    .order("created_at", { ascending: true })
    .limit(1000);
  const context = data || [];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: prompt },
    ...context.map<OpenAI.Chat.Completions.ChatCompletionMessageParam>((item) => ({
      role: item.ai ? "assistant" : "user",
      content: item.ai ? item.text : `${item.username}: ${item.text}`,
      name: item.username,
    })),
  ];

  const answer =
    (
      await deepseek.chat.completions.create({
        messages,
        model: "deepseek-chat",
        n: 1,
      })
    ).choices[0].message.content || "";

  const { error: aiError } = await supabase.from("context").insert({
    ai: true,
    text: answer,
    username: "Нира",
    chat_id: chat_id,
  });
  if (aiError) {
    console.error("Error inserting AI message:", aiError);
    logger.error({ error: aiError, chat_id }, "Ошибка записи ответа от ИИ");
  }

  return answer;
};
