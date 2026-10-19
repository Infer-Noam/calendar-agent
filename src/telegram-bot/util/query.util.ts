import type { Request } from "express";

export const getQueryParam = (query: Request["query"], key: string): string | undefined =>
  typeof query[key] === "string" ? query[key] : undefined;
