import {
  createEvent,
  updateEvent,
  deleteEvent,
} from "@shared/calendar/calendarEvents.service.js";
import type { GoogleCalendarClient } from "@shared/calendar/calendar.type.js";
import { CalendarAccessStatus } from "@shared/calendar/calendar.type.js";
import { EventProposalKind } from "@shared/calendar/enum/eventProposalKind.enum.js";
import type { EventProposal } from "@shared/calendar/type/eventProposal.type.js";
import { getCalendarAccessForUser } from "@shared/calendar/access.service.js";
import {
  getProposal,
  claimProposalForApproval,
  claimProposalForRejection,
  markProposalFailed,
} from "@shared/repository/eventProposal.repository.js";
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

const executeApprovedProposal = (
  calendar: GoogleCalendarClient,
  proposal: EventProposal
): Promise<unknown> => {
  switch (proposal.kind) {
    case EventProposalKind.Edit:
      return updateEvent(calendar, proposal.eventId, proposal);
    case EventProposalKind.Delete:
      return deleteEvent(calendar, proposal.eventId);
    case EventProposalKind.Create:
      return createEvent(calendar, proposal);
  }
};

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
    await executeApprovedProposal(access.calendar, proposal);
  } catch (err) {
    console.error(`Failed to execute approved proposal (${proposal.kind}):`, err);
    await markProposalFailed(parsed.proposalId);
    await ctx.editMessageText(PROPOSAL_FAILED_MESSAGE);

    return;
  }

  const confirmation = proposalApprovedMessage(proposal.kind, proposal.summary);

  await ctx.editMessageText(confirmation).catch(async (err) => {
    console.error(
      "Proposal executed, but failed to edit confirmation message:",
      err
    );
    await ctx
      .reply(confirmation)
      .catch((replyErr) =>
        console.error(
          "Also failed to send fallback confirmation reply:",
          replyErr
        )
      );
  });
};
