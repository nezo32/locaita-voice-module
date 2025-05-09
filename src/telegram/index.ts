import TelegramBot from "node-telegram-bot-api";
import config from "../config";
import NodeCache from "node-cache";
import { createChat, getAiResponseOnContext, insertMessage } from "../ai";
import { DAY, SECOND } from "../constants/time";
import EventEmitter from "node:events";
import { throttle } from "throttle-debounce";
import { NYRA_NAME_FORMS } from "../constants/name";
import logger from "../logger";

const TELEGRAM_MESSAGE_SYMBOL = Symbol();

const bot = new TelegramBot(config.TELEGRAM_KEY, { polling: true });
const cache = new NodeCache({ stdTTL: DAY / 1000 });
const emitter = new EventEmitter<{
  [TELEGRAM_MESSAGE_SYMBOL]: { chat_id: string }[];
}>();

type MessageEventListener = (
  ...args: {
    chat_id: string;
  }[]
) => void;

const eventListener: MessageEventListener = async ({ chat_id }) => {
  logger.debug({ chat_id }, "Message processing...");
  getAiResponseOnContext(chat_id).then(async (response) => {
    logger.debug({ chat_id, response }, "Successfully received response");
    await bot.sendMessage(chat_id, response);
  });
};

const saveMessage = async ({
  chat_id,
  text,
  username,
  user,
}: {
  chat_id: string;
  text: string;
  username: string;
  user: string;
}) => {
  const messageError = await insertMessage({ chat_id, username, message: text });
  if (messageError) {
    logger.error({ user, chat_id, error: messageError }, "Message writing error");
  }
};

bot.on("message", async (message) => {
  logger.debug(message);

  const chat_id = message.chat.id.toString();
  const text = message.text?.trim();
  const first_name =
    message.from?.first_name || message.chat.first_name || message.from?.username || message.chat.username || "";
  const username = (first_name + " " + (message.from?.last_name || "")).trim();
  const user = message.from?.username || username;

  if (!username || !text) return;

  logger.info({ user, chat_id }, "Message received");

  if (!cache.has(chat_id)) {
    logger.info({ chat_id }, "Creating chat...");
    const chat = await createChat(chat_id);
    if (chat instanceof Error) {
      logger.error({ chat_id, error: chat }, "Chat creation error");
      return;
    }
    logger.info({ chat_id }, "Chat created");

    const delay = 2 * SECOND; //message.chat.type == "private" ? 2 * SECOND : 4 * SECOND;
    cache.set(chat_id, throttle(delay, eventListener));
    logger.info({ chat_id }, "Chat writed in cache");
  }

  saveMessage({ chat_id, text, username, user });

  if (message.chat.type == "group" || message.chat.type == "supergroup") {
    if (
      NYRA_NAME_FORMS.every((name) => !text.toLowerCase().includes(name)) &&
      message.reply_to_message?.from?.first_name !== "Nyra"
    )
      return;
    emitter.emit(TELEGRAM_MESSAGE_SYMBOL, { chat_id });
    return;
  }

  if (message.chat.type == "private") {
    emitter.emit(TELEGRAM_MESSAGE_SYMBOL, { chat_id });
  }
});

emitter.on(TELEGRAM_MESSAGE_SYMBOL, ({ chat_id }) => {
  const handler = cache.get<throttle<MessageEventListener>>(chat_id);
  if (!handler) {
    logger.warn({ chat_id }, "Chat cache not found");
    return;
  }
  handler({ chat_id });
});

logger.info("Waiting for messages...");

process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received.");
  await bot.stopPolling();
  await bot.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT signal received.");
  await bot.stopPolling();
  await bot.close();
  process.exit(0);
});
