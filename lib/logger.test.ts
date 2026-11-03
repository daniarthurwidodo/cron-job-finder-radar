import assert from "node:assert/strict";
import { test } from "node:test";
import { createLogger } from "@/lib/logger";

function capture(level?: string) {
  const lines: string[] = [];
  const logger = createLogger({ destination: { write: (line: string) => void lines.push(line) }, level });
  const parsed = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { logger, parsed };
}

test("keeps the { level, message, ...context, at } shape", () => {
  const { logger, parsed } = capture();
  logger.info("scrape finished", { sourceCode: "seek_nz", inserted: 3 });
  const [entry] = parsed();
  assert.equal(entry.level, "info");
  assert.equal(entry.message, "scrape finished");
  assert.equal(entry.sourceCode, "seek_nz");
  assert.equal(entry.inserted, 3);
  assert.ok(!Number.isNaN(Date.parse(String(entry.at))));
});

test("redacts credentials at the top level and one level down", () => {
  const { logger, parsed } = capture();
  logger.error("login failed", { password: "hunter2", user: { email: "a@b.test", name: "kept" }, token: "abc" });
  const [entry] = parsed();
  assert.equal(entry.password, "[redacted]");
  assert.equal(entry.token, "[redacted]");
  assert.deepEqual(entry.user, { email: "[redacted]", name: "kept" });
  assert.ok(!JSON.stringify(entry).includes("hunter2"));
});

test("respects the level: debug is dropped at info, warn is kept", () => {
  const { logger, parsed } = capture("info");
  logger.debug("noise");
  logger.warn("careful");
  assert.deepEqual(parsed().map((entry) => entry.message), ["careful"]);
});

test("logs a message with no context", () => {
  const { logger, parsed } = capture();
  logger.info("hello");
  assert.equal(parsed()[0].message, "hello");
});
