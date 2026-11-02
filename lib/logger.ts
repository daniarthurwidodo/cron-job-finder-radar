type LogLevel = "info" | "error";
type LogContext = Record<string, unknown>;

function writeLog({ level, message, context }: { level: LogLevel; message: string; context?: LogContext }): void {
  const line = JSON.stringify({ level, message, ...context, at: new Date().toISOString() });
  const stream = level === "error" ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export const logger = {
  info: (message: string, context?: LogContext) => writeLog({ level: "info", message, context }),
  error: (message: string, context?: LogContext) => writeLog({ level: "error", message, context }),
};
