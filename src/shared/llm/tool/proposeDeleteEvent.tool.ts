import { createDeleteProposal } from "../../repository/eventProposal.repository.js";
import type { ToolDefinition } from "../type/tool.type.js";
import { ProposeDeleteEventInputSchema } from "../validation/proposeDeleteEvent.validation.js";

export const PROPOSE_DELETE_EVENT_TOOL: ToolDefinition = {
  schema: {
    name: "propose_delete_event",
    description:
      "Propose deleting an existing calendar event. This does not delete the event — it creates a pending proposal that the user must approve before anything is removed from their calendar. Requires the real eventId from a prior list_events call.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The real eventId of the event to delete, from a prior list_events call" },
        summary: { type: "string", description: "The event's current title, for the user's confirmation" },
      },
      required: ["eventId", "summary"],
    },
  },
  run: async ({ telegramUserId }, input) => {
    const parsed = ProposeDeleteEventInputSchema.safeParse(input);

    if (!parsed.success)
      return { content: `Error: invalid input for tool "propose_delete_event"` };

    const { eventId, summary } = parsed.data;

    const proposalId = await createDeleteProposal(telegramUserId, parsed.data);

    return {
      content: `Deletion proposed (pending user approval) for event ${eventId}: "${summary}".`,
      proposalId,
    };
  },
};
