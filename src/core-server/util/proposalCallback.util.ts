import { ProposalAction } from "../enum/proposalAction.enum.js";
import { PROPOSAL_CALLBACK_SEPARATOR } from "../const/general.const.js";
import type { ProposalCallbackData } from "../type/proposalCallback.type.js";

export const buildProposalCallbackData = (
  action: ProposalAction,
  proposalId: string
): string => `${action}${PROPOSAL_CALLBACK_SEPARATOR}${proposalId}`;

export const parseProposalCallbackData = (
  data: string
): ProposalCallbackData | undefined => {
  const [action, proposalId] = data.split(PROPOSAL_CALLBACK_SEPARATOR);
  if (action !== ProposalAction.Approve && action !== ProposalAction.Reject)
    return undefined;
  if (!proposalId) return undefined;

  return { action, proposalId };
};
