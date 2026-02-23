import { z } from "zod";

export const SummarySchema = z.object({
  winner: z.enum(["A", "B", "tie"]),
  summaryBullets: z.array(z.string()),
  bestPointsA: z.array(z.string()),
  bestPointsB: z.array(z.string()),
  improvementTipsA: z.array(z.string()),
  improvementTipsB: z.array(z.string()),
  commonFallacies: z.array(z.string()),
  overallQualityScore: z.number().int().min(0).max(100)
});
