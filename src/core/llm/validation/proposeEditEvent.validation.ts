import { z } from "zod";
import { buildEventTimeFieldsUnion } from "./eventTimeFields.validation.js";

export const ProposeEditEventInputSchema = buildEventTimeFieldsUnion({
  eventId: z.string().min(1),
});
