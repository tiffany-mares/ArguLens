import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { AnalysisSchema } from "./analysisSchema.js";
import { SummarySchema } from "./summarySchema.js";

const ANALYSIS_FALLBACK = {
  logicScore: 50,
  persuasionScore: 50,
  fallacies: [],
  biasFlags: [],
  claims: [],
  links: []
};

const SUMMARY_FALLBACK = {
  winner: "tie",
  summaryBullets: ["Unable to generate summary"],
  bestPointsA: [],
  bestPointsB: [],
  improvementTipsA: [],
  improvementTipsB: [],
  commonFallacies: [],
  overallQualityScore: 50
};

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1"
});

const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20240620-v1:0";

export async function invokeBedrock(prompt) {
  try {
    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2048,
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const rawText = responseBody.content?.[0]?.text ?? "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[bedrock] No JSON found in response");
      return ANALYSIS_FALLBACK;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const result = AnalysisSchema.safeParse(parsed);

    if (!result.success) {
      console.error("[bedrock] Schema validation failed:", result.error.flatten());
      return ANALYSIS_FALLBACK;
    }

    return result.data;
  } catch (err) {
    console.error("[bedrock] Invocation error:", err.message);
    return ANALYSIS_FALLBACK;
  }
}

export async function invokeSummary(prompt) {
  try {
    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const rawText = responseBody.content?.[0]?.text ?? "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[bedrock] No JSON found in summary response");
      return SUMMARY_FALLBACK;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const result = SummarySchema.safeParse(parsed);

    if (!result.success) {
      console.error("[bedrock] Summary schema validation failed:", result.error.flatten());
      return SUMMARY_FALLBACK;
    }

    return result.data;
  } catch (err) {
    console.error("[bedrock] Summary invocation error:", err.message);
    return SUMMARY_FALLBACK;
  }
}
