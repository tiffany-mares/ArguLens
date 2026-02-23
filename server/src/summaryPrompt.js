export function buildSummaryPrompt({ motion, messages }) {
  const transcript = messages
    .map((m) => `[Speaker ${m.speakerRole}]: ${m.text}`)
    .join("\n");

  return `You are an expert debate judge. A debate has just ended. Analyze the full transcript and produce a final summary.

DEBATE MOTION: "${motion}"

FULL TRANSCRIPT (${messages.length} messages):
${transcript}

Return ONLY valid JSON with these exact keys:

{
  "winner": "<A | B | tie>",
  "summaryBullets": ["<3-5 bullet point summary of the debate>"],
  "bestPointsA": ["<top 2-3 strongest arguments from Speaker A>"],
  "bestPointsB": ["<top 2-3 strongest arguments from Speaker B>"],
  "improvementTipsA": ["<2-3 specific tips for Speaker A to improve>"],
  "improvementTipsB": ["<2-3 specific tips for Speaker B to improve>"],
  "commonFallacies": ["<list of the most common fallacies used across both speakers>"],
  "overallQualityScore": <integer 0-100 rating the overall debate quality>
}

JUDGING CRITERIA:
- Winner: The speaker who made stronger, better-evidenced, more logically coherent arguments overall. Choose "tie" only if truly equal.
- Best points: The most compelling, well-reasoned arguments each speaker made.
- Improvement tips: Actionable, specific feedback — not generic advice.
- Common fallacies: Only list fallacies that actually appeared in the debate.
- Overall quality: Consider depth of reasoning, evidence usage, responsiveness, and civility.

RULES:
- Return ONLY the JSON object. No markdown, no explanation, no wrapping.
- All string arrays must contain at least 1 item.
- overallQualityScore must be an integer between 0 and 100.`;
}
