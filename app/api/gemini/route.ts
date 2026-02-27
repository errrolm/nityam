import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { policyText, mode, refineMode } = await req.json();

    if (!policyText || policyText.length < 20) {
      return NextResponse.json(
        { error: "Invalid policy text" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    let prompt = "";

    if (mode === "citizen") {
      prompt = `
You are a policy simplification engine. Extract structured data from the provided policy text and return ONLY valid JSON matching this exact schema.
IMPORTANT: Extract ALL relevant steps for the instructions array. Do not return just one item.

{
  "summary": "Plain English executive summary.",
  "instructions": ["Simplified, plain-language chronological checklist for a citizen/end-user."],
  "complexity_score": Integer (1-10),
  "risk_level": "Low" | "Medium" | "High"
}

Policy Text:
${policyText}
`;
    } else {
      prompt = `
You are a policy analysis engine. Extract structured data from the provided policy text and return ONLY valid JSON matching this exact schema.
IMPORTANT: For arrays like 'workflow', 'slas', 'decision_points', and 'risks', you MUST extract and include ALL relevant items found in the entire text. Do not output just a single item. Provide the complete chronological workflow.

{
  "summary": "Executive summary of the policy.",
  "workflow": [
    {
      "step": "Actionable instruction.",
      "clause": "The clause number/reference (e.g., 'Clause 4.2').",
      "clause_text": "The exact verbatim sentence from the source text that justifies this step."
    }
  ],
  "slas": [
    {
      "timeframe": "The extracted deadline (e.g., '3 Days', 'Within 48 hours').",
      "action": "The action required within this timeframe."
    }
  ],
  "decision_points": ["List of ALL conditional if/then logic steps."],
  "checklist": ["ALL required actions"],
  "documents_required": ["ALL required documents"],
  "escalation_conditions": ["ALL conditions requiring escalation"],
  "risks": ["ALL potential failure points."],
  "ambiguities": [
    {
      "term": "The vague word/phrase.",
      "issue": "Why it is ambiguous."
    }
  ],
  "compliance_gaps": ["List of missing standard requirements."],
  "metrics": {
    "estimated_processing_time": "String",
    "manpower_level": "Low" | "Medium" | "High",
    "department_load": "Low" | "Medium" | "High",
    "risk_exposure_percent": Integer
  },
  "complexity_score": Integer (1-10),
  "risk_level": "Low" | "Medium" | "High"
}

Policy Text:
${policyText}
`;
    }

    if (refineMode) {
      prompt += `\nRefinement instruction: ${refineMode}.\nImprove structure and clarity.\n`;
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();

    if (!text) {
      return NextResponse.json(
        { error: "Empty AI response" },
        { status: 500 }
      );
    }

    const parsedData = JSON.parse(text);

    return NextResponse.json({ data: parsedData });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "AI error" },
      { status: 500 }
    );
  }
}