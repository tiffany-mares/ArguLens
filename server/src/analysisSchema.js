import { z } from "zod";

export const AnalysisSchema = z.object({
  logicScore: z.number().int().min(0).max(100),
  persuasionScore: z.number().int().min(0).max(100),
  fallacies: z.array(z.object({
    type: z.string(),
    severity: z.enum(["low","medium","high"]),
    explanation: z.string(),
    quote: z.string().optional(),
    suggestion: z.string().optional()
  })),
  biasFlags: z.array(z.object({
    type: z.string(),
    severity: z.enum(["low","medium","high"]),
    explanation: z.string(),
    quote: z.string().optional(),
    neutralRewrite: z.string().optional()
  })),
  claims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    stance: z.enum(["pro","con","neutral"]),
    evidenceSnippets: z.array(z.string()).default([])
  })),
  links: z.array(z.object({
    sourceClaimId: z.string(),
    targetClaimId: z.string(),
    relation: z.enum(["supports","attacks","rebuts"])
  }))
});
