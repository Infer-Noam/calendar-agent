import { z } from "zod";
import { dateOnlyString } from "./dateOnlyString.validation.js";
import { dateTimeWithOffset } from "./dateTimeWithOffset.validation.js";

export const buildEventTimeFieldsUnion = <T extends z.ZodRawShape>(extraShape: T) =>
  z.discriminatedUnion("allDay", [
    z.object({
      ...extraShape,
      summary: z.string().min(1),
      allDay: z.literal(false),
      start: dateTimeWithOffset,
      end: dateTimeWithOffset,
    }),
    z.object({
      ...extraShape,
      summary: z.string().min(1),
      allDay: z.literal(true),
      start: dateOnlyString,
      end: dateOnlyString,
    }),
  ]);
