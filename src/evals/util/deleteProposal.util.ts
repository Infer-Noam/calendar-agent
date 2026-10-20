import { firestore } from "@shared/firestore.js";
import { EVENT_PROPOSALS_COLLECTION } from "@shared/calendar/calendar.const.js";

export const deleteProposal = async (proposalId: string | undefined): Promise<void> => {
  if (proposalId) await firestore.collection(EVENT_PROPOSALS_COLLECTION).doc(proposalId).delete();
};

export const deleteProposalIfAny = async (toolCalls: { proposalId?: string }[]): Promise<void> => {
  await deleteProposal(toolCalls.find((call) => call.proposalId)?.proposalId);
};
