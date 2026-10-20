import type { ProposalAction } from "../enum/proposalAction.enum.js";

export type ProposalCallbackData = {
  action: ProposalAction;
  proposalId: string;
};
