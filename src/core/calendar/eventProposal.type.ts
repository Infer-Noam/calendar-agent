export enum EventProposalStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Failed = "failed",
}

export type EventProposal = {
  id: string;
  telegramUserId: string;
  summary: string;
  allDay: boolean;
  start: string;
  end: string;
  status: EventProposalStatus;
  createdAt: number;
};
