import { listEvents } from "@shared/calendar/calendarEvents.service.js";
import { answerCalendarQuestion } from "@shared/llm/service/calendarAssistant.service.js";
import { startOfToday } from "@shared/util/dateTime.util.js";
import type { EvalCase } from "../type/eval.type.js";

export const evalGroundednessMatchesSource: EvalCase = async ({ telegramUserId, calendar }) => {
  const name = "groundedness: answer matches real events in an explicit date range";
  const timeMin = startOfToday();
  const timeMax = startOfToday(3);
  const realEvents = await listEvents(calendar, timeMin, timeMax);

  if (realEvents.length === 0) {
    return {
      name,
      passed: true,
      detail: "no real events in range right now — nothing to check against, treated as a pass",
    };
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const inclusiveEnd = new Date(timeMax.getTime() - 1);

  const result = await answerCalendarQuestion(
    telegramUserId,
    `What's on my calendar from ${toDateStr(timeMin)} to ${toDateStr(inclusiveEnd)} inclusive? List every event title.`,
    calendar
  );

  const missing = realEvents.filter((event) => !result.answer.includes(event.summary));

  return {
    name,
    passed: missing.length === 0,
    detail: missing.length
      ? `answer is missing real events: ${missing.map((e) => e.summary).join(", ")}\nfull answer: ${result.answer}`
      : "",
  };
};
