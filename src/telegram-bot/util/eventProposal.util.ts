import type { EventProposal } from "@core/calendar/eventProposal.type.js";
import { parseLocalDate, APP_TIMEZONE } from "@core/util/dateTime.util.js";

const formatDateTime = (isoString: string): string =>
  new Date(isoString).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });

const formatDateOnly = (dateString: string): string =>
  parseLocalDate(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });

export const formatProposalConfirmation = (proposal: EventProposal): string => {
  if (proposal.allDay) {
    const range =
      proposal.start === proposal.end
        ? formatDateOnly(proposal.start)
        : `${formatDateOnly(proposal.start)} – ${formatDateOnly(proposal.end)}`;

    return `Schedule "${proposal.summary}"?\nAll day, ${range}`;
  }

  return `Schedule "${proposal.summary}"?\n${formatDateTime(proposal.start)} – ${formatDateTime(proposal.end)}`;
};
