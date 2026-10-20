import type { ToolCallRecord } from "./conversationHistory.type.js";

export type CalendarAnswer = {
  answer: string;
  toolCalls: ToolCallRecord[];
};
