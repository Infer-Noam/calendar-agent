import { createEditProposal } from "../../repository/eventProposal.repository.js";
import type { ToolDefinition } from "../type/tool.type.js";
import { ProposeEditEventInputSchema } from "../validation/proposeEditEvent.validation.js";

export const PROPOSE_EDIT_EVENT_TOOL: ToolDefinition = {
  schema: {
    name: "propose_edit_event",
    description:
      "Propose changing an existing calendar event (title, time, or all-day status). This does not change the event — it creates a pending proposal that the user must approve before anything changes on their calendar. Requires the real eventId from a prior list_events call. Pass the full new values, not just the changed field.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The real eventId of the event to change, from a prior list_events call" },
        summary: { type: "string", description: "New title for the event" },
        allDay: {
          type: "boolean",
          description: "true for an all-day event, false for an event at a specific time",
        },
        start: {
          type: "string",
          description:
            "If allDay is false: new start date and time, ISO 8601 with UTC offset, e.g. 2026-10-21T15:00:00+03:00. If allDay is true: inclusive start date, e.g. 2026-10-21",
        },
        end: {
          type: "string",
          description:
            "If allDay is false: new end date and time, ISO 8601 with UTC offset, e.g. 2026-10-21T15:30:00+03:00. If allDay is true: inclusive end date, e.g. 2026-10-21",
        },
      },
      required: ["eventId", "summary", "allDay", "start", "end"],
    },
  },
  run: async ({ telegramUserId }, input) => {
    const parsed = ProposeEditEventInputSchema.safeParse(input);

    if (!parsed.success)
      return { content: `Error: invalid input for tool "propose_edit_event"` };

    const { eventId, summary, allDay, start, end } = parsed.data;

    const proposalId = await createEditProposal(telegramUserId, parsed.data);

    return {
      content: `Edit proposed (pending user approval) for event ${eventId}: "${summary}"${allDay ? " (all day)" : ""} from ${start} to ${end}.`,
      proposalId,
    };
  },
};
