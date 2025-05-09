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
  logger.debug({ chat_id }, "Начата обработка сообщения...");
  getAiResponseOnContext(chat_id).then(async (response) => {
    logger.debug({ chat_id, response }, "Ответ получет");
    await bot.sendMessage(chat_id, response);
  });
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

  logger.info({ user, chat_id, text }, "Получено сообщение");

  if (!cache.has(chat_id)) {
    logger.info({ chat_id }, "Создание чата...");
    const chat = await createChat(chat_id);
    if (chat instanceof Error) {
      logger.error({ chat_id, error: chat }, "Ошибка создания чата");
      return;
    }
    logger.info({ chat_id }, "Чат создан");

    const delay = 2 * SECOND; //message.chat.type == "private" ? 2 * SECOND : 4 * SECOND;
    cache.set(chat_id, throttle(delay, eventListener));
    logger.info({ chat_id }, "Чат записан в кеш");
  }

  const messageError = await insertMessage({ chat_id, username, message: text });
  if (messageError) {
    logger.error({ text, user, chat_id, error: messageError }, "Ошибка записи соощения");
  }

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
    logger.warn({ chat_id }, "Не найден кеш для чата");
    return;
  }
  handler({ chat_id });
});

logger.info("Ожидание сообщений...");
