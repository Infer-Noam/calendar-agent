import { z } from "zod";
import { dateOnlyString } from "./dateOnlyString.validation.js";

export const ListEventsInputSchema = z.object({
  start: dateOnlyString,
  end: dateOnlyString,
});
