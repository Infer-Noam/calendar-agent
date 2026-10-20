import { z } from "zod";

export const ProposeDeleteEventInputSchema = z.object({
  eventId: z.string().min(1),
  summary: z.string().min(1),
});
