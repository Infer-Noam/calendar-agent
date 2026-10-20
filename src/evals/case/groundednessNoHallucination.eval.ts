import { listEvents } from "@shared/calendar/calendarEvents.service.js";
import { answerCalendarQuestion } from "@shared/llm/service/calendarAssistant.service.js";
import { startOfToday } from "@shared/util/dateTime.util.js";
import type { EvalCase } from "../type/eval.type.js";

export const evalGroundednessNoHallucination: EvalCase = async ({ telegramUserId, calendar }) => {
  const name = "groundedness: doesn't invent an event for a confirmed-empty date";
  const timeMin = startOfToday(700);
  const timeMax = startOfToday(701);
  const realEvents = await listEvents(calendar, timeMin, timeMax);

  if (realEvents.length > 0) {
    return {
      name,
      passed: false,
      detail: "chosen far-future date unexpectedly already has real events — pick a different offset",
    };
  }

  const dateStr = timeMin.toISOString().slice(0, 10);
  const result = await answerCalendarQuestion(
    telegramUserId,
    `Do I have anything on my calendar on ${dateStr}?`,
    calendar
  );

  const soundsEmpty = /\b(no|nothing|don'?t (have|see)|empty|free|clear)\b/i.test(result.answer);

  return { name, passed: soundsEmpty, detail: `answer: ${result.answer}` };
};
