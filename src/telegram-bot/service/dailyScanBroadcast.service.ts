import type { Bot } from "grammy";
import { getAllConnectedTelegramUserIds } from "@core/repository/token.repository.js";
import { getCalendarAccessForUser } from "@core/calendar/access.service.js";
import { CalendarAccessStatus } from "@core/calendar/calendar.type.js";
import { getTodayEvents } from "@core/calendar/calendarEvents.service.js";
import { scanTodayEvents } from "@core/llm/service/dailyScan.service.js";
import { appendTurn } from "@core/repository/conversationHistory.repository.js";
import type { BotContext } from "../middleware/telegramIdentity/botContext.type.js";
import { dailyScanMessage } from "../const/message.const.js";
import { DAILY_SCAN_HISTORY_QUESTION } from "../const/dailyScan.const.js";

const scanOneUser = async (
  bot: Bot<BotContext>,
  telegramUserId: string
): Promise<boolean> => {
  const access = await getCalendarAccessForUser(telegramUserId);
  if (access.status !== CalendarAccessStatus.Connected) return false;

  const events = await getTodayEvents(access.calendar);
  const scan = await scanTodayEvents(events);
  
  if (!scan) return false;

  await bot.api.sendMessage(telegramUserId, dailyScanMessage(scan));

  await appendTurn(telegramUserId, {
    question: DAILY_SCAN_HISTORY_QUESTION,
    answer: scan,
    toolCalls: [],
  });

  return true;
};

export const runDailyScanForAllUsers = async (
  bot: Bot<BotContext>
): Promise<number> => {
  const telegramUserIds = await getAllConnectedTelegramUserIds();

  const results = await Promise.all(
    telegramUserIds.map((telegramUserId) =>
      scanOneUser(bot, telegramUserId).catch((err) => {
        console.error(`Daily scan failed for user ${telegramUserId}:`, err);
        return false;
      })
    )
  );

  return results.filter(Boolean).length;
};
