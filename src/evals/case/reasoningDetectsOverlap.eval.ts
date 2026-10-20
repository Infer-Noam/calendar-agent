import { scanTodayEvents } from "@shared/llm/service/dailyScan.service.js";
import type { CalendarEvent } from "@shared/calendar/calendar.type.js";
import type { EvalCase } from "../type/eval.type.js";
import { buildTestEvent } from "../util/buildTestEvent.util.js";

export const evalReasoningDetectsOverlap: EvalCase = async () => {
  const name = "reasoning: detects a real overlap between two known events";
  const start = new Date();
  start.setHours(14, 0, 0, 0);
  const overlapStart = new Date(start.getTime() + 30 * 60_000);

  const events: CalendarEvent[] = [
    buildTestEvent({ id: "a", summary: "Team sync", start, end: new Date(start.getTime() + 60 * 60_000) }),
    buildTestEvent({
      id: "b",
      summary: "1:1 with Dana",
      start: overlapStart,
      end: new Date(overlapStart.getTime() + 60 * 60_000),
    }),
  ];

  const scan = await scanTodayEvents(events);
  const mentionsBoth = Boolean(scan) && /team sync/i.test(scan!) && /dana/i.test(scan!);
  const claimsNoConflict =
    Boolean(scan) && /\bno\b[^.]{0,20}(overlap|conflict)|don'?t overlap|doesn'?t overlap|not overlap/i.test(scan!);
  const flagsConflict = Boolean(scan) && !claimsNoConflict && /overlap|conflict|double[- ]?book/i.test(scan!);

  return { name, passed: mentionsBoth && flagsConflict, detail: `scan result: ${scan ?? "(null)"}` };
};
