import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { GoogleCalendarClient } from "../../calendar/calendar.type.js";

export type ToolContext = {
  calendar: GoogleCalendarClient;
  telegramUserId: string;
};

export type ToolRunResult = {
  content: string;
  proposalId?: string;
};

export type ToolRunOutcome = ToolRunResult & { toolUseId: string; toolName: string };

export type ToolDefinition = {
  schema: Tool;
  run: (context: ToolContext, input: unknown) => Promise<ToolRunResult>;
};
