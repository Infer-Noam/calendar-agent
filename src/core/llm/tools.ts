import { LIST_EVENTS_TOOL } from "./tool/listEvents.tool.js";
import type { ToolDefinition } from "./type/tool.type.js";

export const TOOLS: Record<string, ToolDefinition> = {
  [LIST_EVENTS_TOOL.schema.name]: LIST_EVENTS_TOOL,
};
