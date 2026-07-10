import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const { message, history, context, currency } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "missing_message" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "missing_gemini_api_key" }, { status: 500 });
    }

    const systemInstruction = `You are a personal finance assistant inside a receipt-tracking app.
You answer questions about the user's spending using ONLY the data provided below — never invent numbers.
Currency is ${currency ?? "PHP"}. When citing amounts, use that currency's symbol.
Be concise (2-4 sentences unless a breakdown is asked for). Use the precomputed totals for week/month/year
questions rather than recalculating from the raw receipt list. If the data doesn't cover what's asked,
say so plainly instead of guessing.

DATA:
${JSON.stringify(context)}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const chat = model.startChat({
      history: ((history ?? []) as ChatTurn[]).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: 0.2 },
    });

    const result = await chat.sendMessage(systemInstruction + "\n\nUser question: " + message);
    return NextResponse.json({ reply: result.response.text() });
  } catch (err) {
    console.error("Gemini chat failed:", err);
    return NextResponse.json({ error: "chat_failed", details: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}