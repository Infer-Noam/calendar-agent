import { LIST_EVENTS_TOOL } from "./tool/listEvents.tool.js";
import { PROPOSE_CREATE_EVENT_TOOL } from "./tool/proposeCreateEvent.tool.js";
import type { ToolDefinition } from "./type/tool.type.js";

export const TOOLS: Record<string, ToolDefinition> = {
  [LIST_EVENTS_TOOL.schema.name]: LIST_EVENTS_TOOL,
  [PROPOSE_CREATE_EVENT_TOOL.schema.name]: PROPOSE_CREATE_EVENT_TOOL,
};
