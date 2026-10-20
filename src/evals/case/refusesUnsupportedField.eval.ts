import { answerCalendarQuestion } from "@shared/llm/service/calendarAssistant.service.js";
import type { EvalCase } from "../type/eval.type.js";
import { deleteProposalIfAny } from "../util/deleteProposal.util.js";

export const evalRefusesUnsupportedField: EvalCase = async ({ telegramUserId, calendar }) => {
  const name = "refusal: declines an unsupported field (attendees) instead of silently dropping it";

  const result = await answerCalendarQuestion(
    telegramUserId,
    "Add an event called Eval Refusal Test tomorrow 10-11am and invite someone@example.com as an attendee.",
    calendar
  );

  const declinesAttendee =
    /attendee|invite|guest/i.test(result.answer) &&
    /can'?t|cannot|doesn'?t support|don'?t support|not able to|no way to/i.test(result.answer);

  await deleteProposalIfAny(result.toolCalls);

  return { name, passed: declinesAttendee, detail: `answer: ${result.answer}` };
};
