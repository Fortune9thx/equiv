import { z } from "zod";
import { MAX_OUTCOMES, MIN_OUTCOMES, MAX_SEED_SOURCES, MAX_PARENT_CLAIMS, MAX_TAGS } from "./contracts";

const urlSchema = z.string().url("Enter a full URL, including https://");
const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid 0x-prefixed 20-byte address");

export const createClaimSchema = z.object({
  question: z
    .string()
    .min(12, "Ask a real question — at least 12 characters.")
    .max(600, "Keep the question under 600 characters; put detail in the criteria."),
  criteria: z
    .string()
    .min(20, "Binding criteria need real specificity — at least 20 characters.")
    .max(4000, "Criteria must stay under 4000 characters."),
  outcomes: z
    .array(z.string().min(1, "Outcome can't be empty.").max(80))
    .min(MIN_OUTCOMES, `At least ${MIN_OUTCOMES} outcomes are required.`)
    .max(MAX_OUTCOMES, `At most ${MAX_OUTCOMES} outcomes are allowed.`)
    .refine((arr) => new Set(arr.map((o) => o.trim())).size === arr.length, {
      message: "Outcomes must be unique.",
    })
    .refine((arr) => !arr.some((o) => o.trim().toUpperCase() === "INCONCLUSIVE"), {
      message: "'INCONCLUSIVE' is reserved and can't be a declared outcome.",
    }),
  seedSources: z
    .array(urlSchema)
    .min(1, "At least one seed source is required.")
    .max(MAX_SEED_SOURCES, `At most ${MAX_SEED_SOURCES} seed sources are allowed.`),
  parentClaims: z.array(addressSchema).max(MAX_PARENT_CLAIMS, `At most ${MAX_PARENT_CLAIMS} parent claims.`),
  tags: z.array(z.string().min(1).max(24)).max(MAX_TAGS, `At most ${MAX_TAGS} tags.`),
  endTime: z
    .date()
    .refine((d) => d.getTime() > Date.now() + 60_000, "End time must be at least a minute out."),
  stakeGen: z
    .string()
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid GEN amount."),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
