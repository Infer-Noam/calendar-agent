import { z } from "zod";

export const dateTimeWithOffset = z.iso.datetime({ offset: true });
