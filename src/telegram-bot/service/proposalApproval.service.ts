import { createEvent } from "@core/calendar/calendarEvents.service.js";
import { CalendarAccessStatus } from "@core/calendar/calendar.type.js";
import { getCalendarAccessForUser } from "@core/calendar/access.service.js";
import {
  getProposal,
  claimProposalForApproval,
  claimProposalForRejection,
  markProposalFailed,
} from "@core/repository/eventProposal.repository.js";
import type { BotContext } from "../middleware/telegramIdentity/botContext.type.js";
import { ProposalAction } from "../enum/proposalAction.enum.js";
import { parseProposalCallbackData } from "../util/proposalCallback.util.js";
import {
  PROPOSAL_NOT_FOUND_MESSAGE,
  PROPOSAL_ALREADY_HANDLED_MESSAGE,
  PROPOSAL_REJECTED_MESSAGE,
  PROPOSAL_FAILED_MESSAGE,
  proposalApprovedMessage,
} from "../const/message.const.js";

export const handleProposalApproval = async (
  ctx: BotContext
): Promise<void> => {
  await ctx.answerCallbackQuery();

  const parsed = parseProposalCallbackData(ctx.callbackQuery?.data ?? "");
  if (!parsed) return;

  const existing = await getProposal(parsed.proposalId);

  if (!existing) {
    await ctx.editMessageText(PROPOSAL_NOT_FOUND_MESSAGE);
    return;
  }

  if (existing.telegramUserId !== ctx.telegramUserId) return;

  if (parsed.action === ProposalAction.Reject) {
    const proposal = await claimProposalForRejection(parsed.proposalId);
    await ctx.editMessageText(
      proposal ? PROPOSAL_REJECTED_MESSAGE : PROPOSAL_ALREADY_HANDLED_MESSAGE
    );

    return;
  }

  const proposal = await claimProposalForApproval(parsed.proposalId);

  if (!proposal) {
    await ctx.editMessageText(PROPOSAL_ALREADY_HANDLED_MESSAGE);
    return;
  }

  const access = await getCalendarAccessForUser(proposal.telegramUserId);

  if (access.status !== CalendarAccessStatus.Connected) {
    await markProposalFailed(parsed.proposalId);
    await ctx.editMessageText(PROPOSAL_FAILED_MESSAGE);

    return;
  }

  try {
    await createEvent(
      access.calendar,
      proposal.summary,
      proposal.allDay,
      proposal.start,
      proposal.end
    );
  } catch (err) {
    console.error("Failed to create approved event:", err);
    await markProposalFailed(parsed.proposalId);
    await ctx.editMessageText(PROPOSAL_FAILED_MESSAGE);

    return;
  }

  await ctx
    .editMessageText(proposalApprovedMessage(proposal.summary))
    .catch(async (err) => {
      console.error(
        "Event created, but failed to edit confirmation message:",
        err
      );
      await ctx
        .reply(proposalApprovedMessage(proposal.summary))
        .catch((replyErr) =>
          console.error(
            "Also failed to send fallback confirmation reply:",
            replyErr
          )
        );
    });
};
