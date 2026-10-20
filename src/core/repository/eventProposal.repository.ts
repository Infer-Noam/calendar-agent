import { firestore } from "../firestore.js";
import { EVENT_PROPOSALS_COLLECTION } from "../calendar/calendar.const.js";
import { EventProposalStatus } from "../calendar/eventProposal.type.js";
import type { EventProposal } from "../calendar/eventProposal.type.js";

export const createProposal = async (
  telegramUserId: string,
  summary: string,
  allDay: boolean,
  start: string,
  end: string
): Promise<string> => {
  const docRef = firestore.collection(EVENT_PROPOSALS_COLLECTION).doc();

  const proposal: EventProposal = {
    id: docRef.id,
    telegramUserId,
    summary,
    allDay,
    start,
    end,
    status: EventProposalStatus.Pending,
    createdAt: Date.now(),
  };

  await docRef.set(proposal);

  return docRef.id;
};

export const getProposal = async (
  proposalId: string
): Promise<EventProposal | null> => {
  const doc = await firestore
    .collection(EVENT_PROPOSALS_COLLECTION)
    .doc(proposalId)
    .get();

  return doc.exists ? (doc.data() as EventProposal) : null;
};

const claimProposal = (
  proposalId: string,
  nextStatus: EventProposalStatus
): Promise<EventProposal | null> => {
  const docRef = firestore.collection(EVENT_PROPOSALS_COLLECTION).doc(proposalId);

  return firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);

    if (!doc.exists) return null;

    const proposal = doc.data() as EventProposal;

    if (proposal.status !== EventProposalStatus.Pending) return null;

    transaction.update(docRef, { status: nextStatus });
    
    return proposal;
  });
};

export const claimProposalForApproval = (
  proposalId: string
): Promise<EventProposal | null> =>
  claimProposal(proposalId, EventProposalStatus.Approved);

export const claimProposalForRejection = (
  proposalId: string
): Promise<EventProposal | null> =>
  claimProposal(proposalId, EventProposalStatus.Rejected);

export const markProposalFailed = async (proposalId: string): Promise<void> => {
  await firestore
    .collection(EVENT_PROPOSALS_COLLECTION)
    .doc(proposalId)
    .update({ status: EventProposalStatus.Failed });
};
