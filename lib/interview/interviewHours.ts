import { JAKARTA_UTC_OFFSET_HOURS, MS_PER_HOUR, WEEKDAYS, WORKDAY_END_HOUR, WORKDAY_START_HOUR } from "@/lib/constants";

// Saturday: any time. Sunday: never. Other days: any time except the workday (start inclusive, end exclusive), Jakarta time.
export function isInterviewSlotAllowed(slot: Date): boolean {
  if (Number.isNaN(slot.getTime())) throw new Error("slot must be a valid date");
  const jakarta = new Date(slot.getTime() + JAKARTA_UTC_OFFSET_HOURS * MS_PER_HOUR);
  const weekday = jakarta.getUTCDay();
  if (weekday === WEEKDAYS.SUNDAY) return false;
  if (weekday === WEEKDAYS.SATURDAY) return true;
  const hour = jakarta.getUTCHours();
  return hour < WORKDAY_START_HOUR || hour >= WORKDAY_END_HOUR;
}
