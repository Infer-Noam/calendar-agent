import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { GoogleCalendarClient } from "../../calendar/calendar.type.js";

export type ToolDefinition = {
  schema: Tool;
  run: (calendar: GoogleCalendarClient, input: unknown) => Promise<string>;
};
