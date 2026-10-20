import { parseLocalDate, formatDate } from "./dateTime.util.js";

export const toExclusiveEndDate = (inclusiveEnd: string): string => {
  const exclusiveEnd = parseLocalDate(inclusiveEnd);
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);

  return formatDate(exclusiveEnd);
};
