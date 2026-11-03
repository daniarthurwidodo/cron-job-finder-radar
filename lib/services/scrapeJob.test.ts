import assert from "node:assert/strict";
import { test } from "node:test";
import { createScrapeJob } from "@/lib/services/scrapeJob";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("start returns immediately, blocks a second run, and frees up when the run ends", async () => {
  const run = deferred();
  const calls: string[][] = [];
  const job = createScrapeJob((sourceCodes) => {
    calls.push(sourceCodes);
    return run.promise;
  });
  assert.equal(job.isRunning(), false);
  assert.equal(job.start(["a"]), true);
  assert.equal(job.isRunning(), true);
  assert.equal(job.start(["b"]), false);
  assert.deepEqual(calls, [["a"]]);
  run.resolve();
  await flush();
  assert.equal(job.isRunning(), false);
  assert.equal(job.start(["c"]), true);
});

test("a failing run is swallowed and still frees the job", async () => {
  const run = deferred();
  const job = createScrapeJob(() => run.promise);
  job.start(["a"]);
  run.reject(new Error("boom"));
  await flush();
  assert.equal(job.isRunning(), false);
});
