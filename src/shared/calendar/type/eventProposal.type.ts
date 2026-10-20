import type { EventProposalStatus } from "../enum/eventProposalStatus.enum.js";
import type { EventProposalKind } from "../enum/eventProposalKind.enum.js";

type EventProposalBase = {
  id: string;
  telegramUserId: string;
  status: EventProposalStatus;
  createdAt: number;
};

export type EventTimeFields = {
  summary: string;
  allDay: boolean;
  start: string;
  end: string;
  description?: string;
  reminderMinutesBefore?: number;
};

export type EditEventFields = EventTimeFields & { eventId: string };

export type DeleteEventFields = { eventId: string; summary: string };

export type NewEventProposal =
  | (EventTimeFields & { kind: EventProposalKind.Create })
  | (EditEventFields & { kind: EventProposalKind.Edit })
  | (DeleteEventFields & { kind: EventProposalKind.Delete });

export type EventProposal = EventProposalBase & NewEventProposal;
