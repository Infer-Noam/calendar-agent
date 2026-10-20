import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import { getProposal } from "@shared/repository/eventProposal.repository.js";
import type { BotContext } from "../middleware/telegramIdentity/botContext.type.js";
import { ProposalAction } from "../enum/proposalAction.enum.js";
import { buildProposalCallbackData } from "../util/proposalCallback.util.js";
import { formatProposalConfirmation } from "../util/eventProposal.util.js";

export const sendProposalApprovalPrompt = async (
  bot: Bot<BotContext>,
  proposalId: string
): Promise<void> => {
  const proposal = await getProposal(proposalId);

  if (!proposal) return;

  const keyboard = new InlineKeyboard()
    .text("Approve", buildProposalCallbackData(ProposalAction.Approve, proposalId))
    .text("Reject", buildProposalCallbackData(ProposalAction.Reject, proposalId));

  await bot.api.sendMessage(proposal.telegramUserId, formatProposalConfirmation(proposal), {
    reply_markup: keyboard,
  });
};
