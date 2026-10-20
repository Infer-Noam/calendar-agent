import { z } from "zod";
import { dateOnlyString } from "./dateOnlyString.validation.js";
import { dateTimeWithOffset } from "./dateTimeWithOffset.validation.js";

const TimedEventInput = z.object({
  summary: z.string().min(1),
  allDay: z.literal(false),
  start: dateTimeWithOffset,
  end: dateTimeWithOffset,
});

const AllDayEventInput = z.object({
  summary: z.string().min(1),
  allDay: z.literal(true),
  start: dateOnlyString,
  end: dateOnlyString,
});

export const ProposeCreateEventInputSchema = z.discriminatedUnion("allDay", [
  TimedEventInput,
  AllDayEventInput,
]);
