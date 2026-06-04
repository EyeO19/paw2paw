import { z } from "zod";

export const claimThreadSchema = z.object({
  threadId: z.uuid("Invalid thread"),
});

export type ClaimThreadInput = z.infer<typeof claimThreadSchema>;
