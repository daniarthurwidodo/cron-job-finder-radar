import assert from "node:assert/strict";
import { test } from "node:test";
import { isInterviewSlotAllowed } from "@/lib/interview/interviewHours";

// Offsets +07:00 so each case reads as Jakarta wall-clock time. 2026-11-02 is a Monday.
const at = (dateTime: string): Date => new Date(`${dateTime}+07:00`);

test("Saturday is allowed all day, including midnight and the workday", () => {
  assert.equal(isInterviewSlotAllowed(at("2026-11-07T00:00:00")), true);
  assert.equal(isInterviewSlotAllowed(at("2026-11-07T12:00:00")), true);
  assert.equal(isInterviewSlotAllowed(at("2026-11-07T23:59:59")), true);
});

test("Sunday is never allowed", () => {
  assert.equal(isInterviewSlotAllowed(at("2026-11-08T00:00:00")), false);
  assert.equal(isInterviewSlotAllowed(at("2026-11-08T20:00:00")), false);
  assert.equal(isInterviewSlotAllowed(at("2026-11-08T23:59:59")), false);
});

test("weekdays are blocked from 10:00 up to, but not including, 18:00", () => {
  assert.equal(isInterviewSlotAllowed(at("2026-11-02T09:59:59")), true);
  assert.equal(isInterviewSlotAllowed(at("2026-11-02T10:00:00")), false);
  assert.equal(isInterviewSlotAllowed(at("2026-11-02T17:59:59")), false);
  assert.equal(isInterviewSlotAllowed(at("2026-11-02T18:00:00")), true);
});

test("weekday early morning and late night are allowed", () => {
  assert.equal(isInterviewSlotAllowed(at("2026-11-04T00:00:00")), true);
  assert.equal(isInterviewSlotAllowed(at("2026-11-06T23:30:00")), true);
});

test("the day is decided in Jakarta time, not UTC", () => {
  // Sat 2026-11-07 20:00 UTC is Sunday 03:00 in Jakarta.
  assert.equal(isInterviewSlotAllowed(new Date("2026-11-07T20:00:00Z")), false);
  // Sun 2026-11-08 20:00 UTC is Monday 03:00 in Jakarta.
  assert.equal(isInterviewSlotAllowed(new Date("2026-11-08T20:00:00Z")), true);
});

test("rejects an invalid date", () => {
  assert.throws(() => isInterviewSlotAllowed(new Date("not a date")));
});
