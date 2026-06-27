import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      // Fallback
      return NextResponse.json({
        title: "Improve marketing performance by 20% in Q3 via targeted ad campaigns"
      });
    }

    const prompt = `You are an expert engineering manager.
Take the following vague goal title and rewrite it to be a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound).
Keep it under a single concise sentence. Don't add extra context, just give the new title.

Vague Title: "${title}"

Return ONLY a JSON object exactly matching this structure:
{
  "title": "New SMART Title"
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON from AI");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("AI Make SMART error:", error);
    // If we hit a rate limit (429) or other error, provide a dummy fallback
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({
        title: "Improve marketing performance by 20% in Q3 via targeted ad campaigns"
      });
    }
    // General fallback so the UI doesn't crash on demo
    return NextResponse.json({
      title: "Successfully complete the defined objective with measurable impact by end of quarter."
    });
  }
}
