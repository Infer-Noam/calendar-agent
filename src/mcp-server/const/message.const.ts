const CLOSE_TAB_SUFFIX = "You can close this tab and go back to Telegram.";

export const MCP_CONNECTION_CANCELLED_PAGE = `Connection cancelled. ${CLOSE_TAB_SUFFIX}`;

export const MCP_MISSING_CODE_PAGE = "Missing code";

export const MCP_IDENTITY_NOT_FOUND_PAGE = `That Google account hasn't connected a calendar yet. Ask that person to send /connect in Telegram first, then try this link again.`;

export const MCP_CONNECT_FAILED_PAGE = "Something went wrong issuing an MCP token. Please try this link again.";

export const mcpTokenPage = (token: string): string =>
  `MCP access token (copy this into your agent's configuration — it will not be shown again):<pre>${token}</pre>${CLOSE_TAB_SUFFIX}`;
