import { BotCommand } from "../enum/botCommand.enum.js";

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

export const connectUrlMessage = (url: string): string => `Connect your Google Calendar:\n${url}`;

export const connectedEmailMessage = (email: string): string => `Calendar connected: ${email}`;

export const oauthConnectedMessage = (email: string): string =>
  `${connectedEmailMessage(email)}\nNot you? Send /${BotCommand.Disconnect} then /${BotCommand.Connect} again.`;

export const PROPOSAL_NOT_FOUND_MESSAGE = "I couldn't find that proposal — it may have expired.";

export const PROPOSAL_ALREADY_HANDLED_MESSAGE = "This proposal was already handled.";

export const PROPOSAL_REJECTED_MESSAGE = "Cancelled — nothing was added to your calendar.";

export const PROPOSAL_FAILED_MESSAGE = "Approved, but creating the event failed. Nothing was added to your calendar — please try asking again.";

export const proposalApprovedMessage = (summary: string): string =>
  `Added "${summary}" to your calendar.`;
