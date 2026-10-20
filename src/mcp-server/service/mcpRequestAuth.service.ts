import { getTelegramUserIdForMcpToken } from "@shared/repository/mcpToken.repository.js";
import { getCalendarAccessForUser } from "@shared/calendar/access.service.js";
import { CalendarAccessStatus } from "@shared/calendar/calendar.type.js";
import type { ToolContext } from "@shared/llm/type/tool.type.js";
import { BEARER_PREFIX } from "../const/mcpServer.const.js";

export const resolveToolContext = async (
  authHeader: string | undefined
): Promise<ToolContext | undefined> => {
  if (!authHeader?.startsWith(BEARER_PREFIX)) return undefined;

  const token = authHeader.slice(BEARER_PREFIX.length);
  const telegramUserId = await getTelegramUserIdForMcpToken(token);

  if (!telegramUserId) return undefined;

  const access = await getCalendarAccessForUser(telegramUserId);

  if (access.status !== CalendarAccessStatus.Connected) return undefined;

  return { calendar: access.calendar, telegramUserId };
};
