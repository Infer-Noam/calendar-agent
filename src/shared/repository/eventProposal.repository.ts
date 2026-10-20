import { firestore } from "../firestore.js";
import { EVENT_PROPOSALS_COLLECTION } from "../calendar/calendar.const.js";
import { EventProposalStatus } from "../calendar/enum/eventProposalStatus.enum.js";
import { EventProposalKind } from "../calendar/enum/eventProposalKind.enum.js";
import type {
  EventProposal,
  EventTimeFields,
  EditEventFields,
  DeleteEventFields,
  NewEventProposal,
} from "../calendar/type/eventProposal.type.js";

const saveNewProposal = async (
  telegramUserId: string,
  data: NewEventProposal
): Promise<string> => {
  const docRef = firestore.collection(EVENT_PROPOSALS_COLLECTION).doc();

  const proposal: EventProposal = {
    ...data,
    id: docRef.id,
    telegramUserId,
    status: EventProposalStatus.Pending,
    createdAt: Date.now(),
  };

  await docRef.set(proposal);

  return docRef.id;
};

export const createProposal = (
  telegramUserId: string,
  data: EventTimeFields
): Promise<string> =>
  saveNewProposal(telegramUserId, { ...data, kind: EventProposalKind.Create });

export const createEditProposal = (
  telegramUserId: string,
  data: EditEventFields
): Promise<string> =>
  saveNewProposal(telegramUserId, { ...data, kind: EventProposalKind.Edit });

export const createDeleteProposal = (
  telegramUserId: string,
  data: DeleteEventFields
): Promise<string> =>
  saveNewProposal(telegramUserId, { ...data, kind: EventProposalKind.Delete });

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
