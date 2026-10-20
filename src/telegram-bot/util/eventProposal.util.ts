import { EventProposalKind } from "@core/calendar/enum/eventProposalKind.enum.js";
import type { EventProposal } from "@core/calendar/type/eventProposal.type.js";
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

const formatDateRange = (allDay: boolean, start: string, end: string): string => {
  if (!allDay) return `${formatDateTime(start)} – ${formatDateTime(end)}`;

  const range = start === end ? formatDateOnly(start) : `${formatDateOnly(start)} – ${formatDateOnly(end)}`;
  return `All day, ${range}`;
};

export const formatProposalConfirmation = (proposal: EventProposal): string => {
  if (proposal.kind === EventProposalKind.Delete) {
    return `Delete "${proposal.summary}"?`;
  }

  const prefix = proposal.kind === EventProposalKind.Edit ? "Change event to" : "Schedule";
  const lines = [
    `${prefix} "${proposal.summary}"?`,
    formatDateRange(proposal.allDay, proposal.start, proposal.end),
  ];

  if (proposal.description) lines.push(`Notes: ${proposal.description}`);
  if (proposal.reminderMinutesBefore !== undefined)
    lines.push(`Reminder: ${proposal.reminderMinutesBefore} min before`);

  return lines.join("\n");
};
