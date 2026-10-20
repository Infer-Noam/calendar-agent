import { scanTodayEvents } from "@shared/llm/service/dailyScan.service.js";
import type { CalendarEvent } from "@shared/calendar/calendar.type.js";
import type { EvalCase } from "../type/eval.type.js";
import { buildTestEvent } from "../util/buildTestEvent.util.js";

export const evalReasoningNoFalseConflict: EvalCase = async () => {
  const name = "reasoning: doesn't invent a conflict between clearly separated events";
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const laterStart = new Date(start.getTime() + 3 * 60 * 60_000);

  const events: CalendarEvent[] = [
    buildTestEvent({ id: "c", summary: "Morning review", start, end: new Date(start.getTime() + 30 * 60_000) }),
    buildTestEvent({
      id: "d",
      summary: "Afternoon planning",
      start: laterStart,
      end: new Date(laterStart.getTime() + 30 * 60_000),
    }),
  ];

  const scan = await scanTodayEvents(events);
  const claimsNoConflict =
    Boolean(scan) &&
    /\bno\b[^.]{0,20}(overlap|conflict|issue)|don'?t overlap|doesn'?t overlap|not overlap/i.test(scan!);
  const claimsRealConflict =
    Boolean(scan) && !claimsNoConflict && /overlap|conflict|double[- ]?book|back-to-back/i.test(scan!);

  return { name, passed: Boolean(scan) && !claimsRealConflict, detail: `scan result: ${scan ?? "(null)"}` };
};
