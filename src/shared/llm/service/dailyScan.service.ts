import { anthropic } from "../anthropic.client.js";
import {
  MODEL,
  MAX_RESPONSE_TOKENS,
} from "../const/calendarAssistant.const.js";
import { buildDailyScanPrompt } from "../prompt/dailyScan.prompt.js";
import { formatEventForPrompt } from "../util/calendarEventPrompt.util.js";
import { formatDateTime } from "../../util/dateTime.util.js";
import { MessageRole } from "../enum/messageRole.enum.js";
import type { CalendarEvent } from "../../calendar/calendar.type.js";

export const scanTodayEvents = async (
  events: CalendarEvent[]
): Promise<string | null> => {
  if (!Boolean(events.length)) return null;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_RESPONSE_TOKENS,
    system: buildDailyScanPrompt(formatDateTime(new Date())),
    messages: [
      {
        role: MessageRole.User,
        content: events.map(formatEventForPrompt).join("\n"),
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  
  return textBlock?.text ?? null;
};
