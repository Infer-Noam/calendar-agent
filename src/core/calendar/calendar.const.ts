const GOOGLE_API_AUTH_BASE = "https://www.googleapis.com/auth";

export const CALENDAR_SCOPES = [
  `${GOOGLE_API_AUTH_BASE}/calendar.readonly`,
  `${GOOGLE_API_AUTH_BASE}/calendar.events`,
  `${GOOGLE_API_AUTH_BASE}/userinfo.email`,
];

export const CALENDAR_TOKENS_COLLECTION = "calendarTokens";
export const CALENDAR_USERS_COLLECTION = "calendarUsers";
