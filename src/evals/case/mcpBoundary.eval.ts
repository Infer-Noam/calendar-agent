import { TOOLS } from "@shared/llm/tools.js";
import { getProposal } from "@shared/repository/eventProposal.repository.js";
import { EventProposalStatus } from "@shared/calendar/enum/eventProposalStatus.enum.js";
import { startOfToday, getLocalUtcOffset } from "@shared/util/dateTime.util.js";
import type { EvalCase } from "../type/eval.type.js";
import { deleteProposal } from "../util/deleteProposal.util.js";

export const evalMcpBoundary: EvalCase = async ({ telegramUserId, calendar }) => {
  const name = "MCP boundary: propose_* only ever creates a pending row, and no tool can approve it";

  const tomorrow = startOfToday(1);
  const offset = getLocalUtcOffset();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

  const result = await TOOLS["propose_create_event"]!.run(
    { calendar, telegramUserId },
    {
      summary: "Eval MCP Boundary Test",
      allDay: false,
      start: `${dateStr}T09:00:00${offset}`,
      end: `${dateStr}T09:15:00${offset}`,
    }
  );

  const proposal = result.proposalId ? await getProposal(result.proposalId) : null;
  const neverExecuted = proposal?.status === EventProposalStatus.Pending;

  const toolNames = Object.keys(TOOLS);
  const noApproveTool = !toolNames.some((toolName) => /approve|execute|confirm/i.test(toolName));

  await deleteProposal(result.proposalId);

  return {
    name,
    passed: Boolean(result.proposalId) && neverExecuted && noApproveTool,
    detail: `proposal status: ${proposal?.status}, exposed tools: ${toolNames.join(", ")}`,
  };
};
