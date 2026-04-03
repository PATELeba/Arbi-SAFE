import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type Recommendation = {
  title: string;
  detail: string;
  urgency: "low" | "medium" | "high";
  action: string;
};

type AnalysisResponse = {
  summary: string;
  healthScore: number;
  warnings: string[];
  opportunities: string[];
  recommendations: Recommendation[];
  nextStep: string;
};

type AnalyzeRequest = {
  wallet?: string;
  goal?: string;
  riskLevel?: string;
  extraContext?: string;
};

function fallbackAnalysis(payload: AnalyzeRequest): AnalysisResponse {
  const walletLabel = payload.wallet?.trim() || "this wallet";
  const goalLabel = payload.goal?.trim() || "reduce wallet risk";
  const riskLevel = payload.riskLevel?.trim() || "balanced";

  return {
    summary: `${walletLabel} looks like a wallet that would benefit from a simpler and safer Arbitrum strategy. Since the user goal is "${goalLabel}", the first move should be reducing unnecessary complexity before chasing more yield.`,
    healthScore: 71,
    warnings: [
      "Portfolio concentration may be too high for a safer setup.",
      "Idle stablecoins can miss low-risk opportunities if left unmanaged.",
      `The selected risk preference is ${riskLevel}, so actions should stay easy to understand and reversible.`,
    ],
    opportunities: [
      "Rebalance part of the wallet into a cleaner ETH and stablecoin mix.",
      "Use a low-risk parking strategy for idle USDC instead of leaving it untouched.",
      "Prepare transaction simulation before any move to reduce user error.",
    ],
    recommendations: [
      {
        title: "Trim concentration risk",
        detail:
          "If one token dominates the wallet, reduce that exposure gradually instead of making one large trade.",
        urgency: "high",
        action: "Simulate swapping 10% to 20% of the largest risky asset into ETH or USDC.",
      },
      {
        title: "Put idle capital to work carefully",
        detail:
          "Move only a small portion of stablecoins into safer yield options so the wallet stays flexible.",
        urgency: "medium",
        action: "Preview a low-risk yield route for a capped USDC amount.",
      },
      {
        title: "Keep the user in control",
        detail:
          "Every suggestion should show plain-English risk notes and require confirmation before execution.",
        urgency: "low",
        action: "Generate a one-click simulation card instead of auto-executing.",
      },
    ],
    nextStep:
      "Use this report in your demo, then add real onchain balance fetching and swap simulation as the next upgrade.",
  };
}

function sanitizeJsonBlock(content: string) {
  return content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AnalyzeRequest;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing OPENROUTER_API_KEY in .env.local. Add it and restart the app.",
      },
      { status: 500 },
    );
  }

  const wallet = payload.wallet?.trim() || "demo-wallet";
  const goal = payload.goal?.trim() || "Reduce wallet risk";
  const riskLevel = payload.riskLevel?.trim() || "balanced";
  const extraContext =
    payload.extraContext?.trim() || "No extra context provided.";

  const systemPrompt = `You are ArbiShield, an AI wallet safety assistant for Arbitrum users. Return strict JSON with keys: summary, healthScore, warnings, opportunities, recommendations, nextStep. recommendations must be an array of 3 objects with keys: title, detail, urgency, action. urgency must be low, medium, or high. Keep the tone practical, beginner-friendly, and safety-first. Do not mention that data may be incomplete. Infer plausible wallet guidance from the user's goal and risk profile for a demo MVP. healthScore must be an integer from 0 to 100.`;

  const userPrompt = `Wallet: ${wallet}
Goal: ${goal}
Risk preference: ${riskLevel}
Extra context: ${extraContext}

Create a concise Arbitrum wallet health report with actionable guidance that feels useful in a hackathon demo.`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://arbishield.local",
        "X-Title": "ArbiShield MVP",
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: {
          type: "json_object",
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(fallbackAnalysis(payload));
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(fallbackAnalysis(payload));
    }

    const parsed = JSON.parse(sanitizeJsonBlock(content)) as AnalysisResponse;

    return NextResponse.json({
      ...parsed,
      healthScore: Math.max(0, Math.min(100, Math.round(parsed.healthScore))),
    });
  } catch {
    return NextResponse.json(fallbackAnalysis(payload));
  }
}
