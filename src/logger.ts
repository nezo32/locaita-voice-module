import pino from "pino";
import config from "./config";
import pretty from "pino-pretty";

const stream = pretty({ colorize: true });

export default pino(
  {
    level: config.LOG_LEVEL,
  },
  stream
);
