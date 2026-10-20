import { createProposal } from "../../repository/eventProposal.repository.js";
import type { ToolDefinition } from "../type/tool.type.js";
import { ProposeCreateEventInputSchema } from "../validation/proposeCreateEvent.validation.js";

export const PROPOSE_CREATE_EVENT_TOOL: ToolDefinition = {
  schema: {
    name: "propose_create_event",
    description:
      "Propose creating a new calendar event. This does not create the event — it creates a pending proposal that the user must approve before anything is added to their calendar. Use this when the user asks to schedule, book, or add something.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Short title for the event" },
        allDay: {
          type: "boolean",
          description: "true for an all-day event, false for an event at a specific time",
        },
        start: {
          type: "string",
          description:
            "If allDay is false: start date and time, ISO 8601 with UTC offset, e.g. 2026-10-21T15:00:00+03:00. If allDay is true: inclusive start date, e.g. 2026-10-21",
        },
        end: {
          type: "string",
          description:
            "If allDay is false: end date and time, ISO 8601 with UTC offset, e.g. 2026-10-21T15:30:00+03:00. If allDay is true: inclusive end date, e.g. 2026-10-21",
        },
      },
      required: ["summary", "allDay", "start", "end"],
    },
  },
  run: async ({ telegramUserId }, input) => {
    const parsed = ProposeCreateEventInputSchema.safeParse(input);

    if (!parsed.success)
      return { content: `Error: invalid input for tool "propose_create_event"` };

    const { summary, allDay, start, end } = parsed.data;

    const proposalId = await createProposal(telegramUserId, parsed.data);

    return {
      content: `Proposal created (pending user approval): "${summary}"${allDay ? " (all day)" : ""} from ${start} to ${end}.`,
      proposalId,
    };
  },
};
