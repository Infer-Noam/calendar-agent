import { answerCalendarQuestion } from "@shared/llm/service/calendarAssistant.service.js";
import { getProposal } from "@shared/repository/eventProposal.repository.js";
import { EventProposalStatus } from "@shared/calendar/enum/eventProposalStatus.enum.js";
import { EventProposalKind } from "@shared/calendar/enum/eventProposalKind.enum.js";
import type { EvalCase } from "../type/eval.type.js";
import { deleteProposalIfAny } from "../util/deleteProposal.util.js";

export const evalProposalFieldsMatchRequest: EvalCase = async ({ telegramUserId, calendar }) => {
  const name = "action with approval: proposal fields match what was asked for";

  const result = await answerCalendarQuestion(
    telegramUserId,
    "Schedule a meeting called Eval Proposal Fields Test tomorrow from 4pm to 4:30pm.",
    calendar
  );

  const proposalId = result.toolCalls.find((call) => call.proposalId)?.proposalId;
  const proposal = proposalId ? await getProposal(proposalId) : null;

  const correct =
    proposal?.status === EventProposalStatus.Pending &&
    proposal.kind === EventProposalKind.Create &&
    proposal.summary.toLowerCase().includes("eval proposal fields test");

  await deleteProposalIfAny(result.toolCalls);

  return {
    name,
    passed: Boolean(correct),
    detail: proposal ? JSON.stringify(proposal) : "no proposal was created",
  };
};
