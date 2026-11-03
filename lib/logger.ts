import pino, { type DestinationStream } from "pino";
import { DEFAULT_LOG_LEVEL, LOG_LEVEL_ENV_NAME, LOG_REDACT_CENSOR, LOG_REDACT_KEYS } from "@/lib/constants";

type LogContext = Record<string, unknown>;

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
}

const REDACT_PATHS = LOG_REDACT_KEYS.flatMap((key) => [key, `*.${key}`]);

// Output keeps the shape the app always logged: { level, message, ...context, at }.
export function createLogger({ destination, level }: { destination: DestinationStream; level?: string }): Logger {
  const base = pino(
    {
      level: level ?? process.env[LOG_LEVEL_ENV_NAME] ?? DEFAULT_LOG_LEVEL,
      messageKey: "message",
      base: null,
      formatters: { level: (label) => ({ level: label }) },
      timestamp: () => `,"at":"${new Date().toISOString()}"`,
      redact: { paths: REDACT_PATHS, censor: LOG_REDACT_CENSOR },
    },
    destination,
  );
  return {
    debug: (message, context) => base.debug(context ?? {}, message),
    info: (message, context) => base.info(context ?? {}, message),
    warn: (message, context) => base.warn(context ?? {}, message),
    error: (message, context) => base.error(context ?? {}, message),
  };
}

export const logger = createLogger({ destination: pino.destination(1) });
