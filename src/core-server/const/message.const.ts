import { BotCommand } from "../enum/botCommand.enum.js";
import { EventProposalKind } from "@shared/calendar/enum/eventProposalKind.enum.js";

const CLOSE_TAB_SUFFIX = "You can close this tab and go back to Telegram.";

export const NOT_CONNECTED_MESSAGE = `Calendar not connected. Send /${BotCommand.Connect}.`;

export const ALREADY_CONNECTED_MESSAGE = `Calendar already connected. Send /${BotCommand.Status} to check anytime.`;

export const CALENDAR_EXPIRED_MESSAGE = `Your calendar connection expired. Send /${BotCommand.Connect} to reconnect.`;

export const DISCONNECTED_MESSAGE = "Calendar disconnected.";

export const DISCONNECT_NOT_CONNECTED_MESSAGE = `No calendar connection found. Send /${BotCommand.Connect} if you'd like to connect one.`;

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export const AI_UNAVAILABLE_MESSAGE = "I can't answer questions right now — this isn't something on your end. Please try again later.";

export const CONNECTION_CANCELLED_MESSAGE = `Calendar connection cancelled. Send /${BotCommand.Connect} if you change your mind.`;

export const CONNECTION_CANCELLED_PAGE = `Calendar connection cancelled. ${CLOSE_TAB_SUFFIX}`;

export const CONNECTED_PAGE = `Calendar connected. ${CLOSE_TAB_SUFFIX}`;

export const MISSING_CODE_OR_STATE_PAGE = "Missing code or state";

export const CONNECT_FAILED_MESSAGE = `Connecting your calendar failed. Send /${BotCommand.Connect} to try again.`;

export const CONNECT_FAILED_PAGE = `Something went wrong connecting your calendar. You can close this tab and try /${BotCommand.Connect} again in Telegram.`;

export const MCP_TOKEN_ISSUED_MESSAGE = "An external agent just connected using your Google account and received access to your calendar (read and propose only — it can never approve its own changes). If this wasn't you, let us know.";

export const MCP_IDENTITY_NOT_FOUND_PAGE = `That Google account hasn't connected a calendar yet. Ask that person to send /${BotCommand.Connect} in Telegram first, then try this link again.`;

export const MCP_CONNECT_FAILED_PAGE = "Something went wrong issuing an MCP token. Please try this link again.";

export const mcpTokenPage = (token: string): string =>
  `MCP access token (copy this into your agent's configuration — it will not be shown again):<pre>${token}</pre>${CLOSE_TAB_SUFFIX}`;

export const connectUrlMessage = (url: string): string => `Connect your Google Calendar:\n${url}`;

export const connectedEmailMessage = (email: string): string => `Calendar connected: ${email}`;

export const oauthConnectedMessage = (email: string): string =>
  `${connectedEmailMessage(email)}\nNot you? Send /${BotCommand.Disconnect} then /${BotCommand.Connect} again.`;

export const PROPOSAL_NOT_FOUND_MESSAGE = "I couldn't find that proposal — it may have expired.";

export const PROPOSAL_ALREADY_HANDLED_MESSAGE = "This proposal was already handled.";

export const PROPOSAL_REJECTED_MESSAGE = "Cancelled — no changes were made to your calendar.";

export const PROPOSAL_FAILED_MESSAGE = "Approved, but the change failed to go through. Nothing was changed on your calendar — please try asking again.";

export const dailyScanMessage = (scan: string): string => `Daily calendar check:\n\n${scan}`;

export const proposalApprovedMessage = (kind: EventProposalKind, summary: string): string => {
  if (kind === EventProposalKind.Edit) return `Updated "${summary}" on your calendar.`;
  if (kind === EventProposalKind.Delete) return `Deleted "${summary}" from your calendar.`;

  return `Added "${summary}" to your calendar.`;
};
