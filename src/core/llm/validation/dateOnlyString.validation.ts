import { z } from "zod";
import { DATE_ONLY_REGEX } from "../const/regex.const.js";

export const dateOnlyString = z.string().regex(DATE_ONLY_REGEX);
