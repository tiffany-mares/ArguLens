export function buildAnalysisPrompt({ motion, speakerRole, messageText, recentMessages }) {
  const contextBlock = recentMessages.length > 0
    ? recentMessages.map((m) => `[Speaker ${m.speakerRole}]: ${m.text}`).join("\n")
    : "(no prior messages)";

  return `You are an expert debate judge and argument analyst.

DEBATE MOTION: "${motion}"

RECENT CONTEXT (last ${recentMessages.length} messages):
${contextBlock}

NEW MESSAGE from Speaker ${speakerRole}:
"${messageText}"

Analyze this message and return ONLY valid JSON with these exact keys:

{
  "logicScore": <integer 0-100>,
  "persuasionScore": <integer 0-100>,
  "fallacies": [
    {
      "type": "<fallacy name, e.g. Strawman, Ad Hominem, False Dilemma, Slippery Slope>",
      "severity": "<low | medium | high>",
      "explanation": "<1-2 sentence explanation>",
      "quote": "<the part of the message containing the fallacy>",
      "suggestion": "<1 sentence rewrite avoiding the fallacy>"
    }
  ],
  "biasFlags": [
    {
      "type": "<bias type, e.g. Stereotyping, Loaded Language, Absolutist Language, Framing Bias>",
      "severity": "<low | medium | high>",
      "explanation": "<1-2 sentence explanation>",
      "quote": "<the biased snippet>",
      "neutralRewrite": "<neutral alternative>"
    }
  ],
  "claims": [
    {
      "id": "<short unique id, e.g. c1, c2>",
      "text": "<the extracted claim>",
      "stance": "<pro | con | neutral>",
      "evidenceSnippets": ["<direct quotes from the message that support this claim, if any>"]
    }
  ],
  "links": [
    {
      "sourceClaimId": "<id of a claim in this message>",
      "targetClaimId": "<id of a claim from context, if applicable>",
      "relation": "<supports | attacks | rebuts>"
    }
  ]
}

SCORING RUBRIC:
- logicScore: Clarity of claim (specific vs vague), presence of reasoning (because/therefore), evidence usage (facts/examples vs none), relevance to the motion, coherence (no contradictions).
- persuasionScore: Confidence and clarity, emotional appeal without manipulation, structure (claim → reason → evidence), responsiveness to opponent's points.

RULES:
- Return ONLY the JSON object. No markdown, no explanation, no wrapping.
- Scores must be integers between 0 and 100.
- If no fallacies are found, return "fallacies": [].
- If no bias is found, return "biasFlags": [].
- If no cross-message links exist, return "links": [].
- Extract at least one claim from the message if possible.
- For each claim, include evidenceSnippets: direct quotes from the message that serve as evidence. If the claim has no supporting evidence in the message, return an empty array.
- Evaluate the message in the context of the debate motion and recent messages.`;
}
