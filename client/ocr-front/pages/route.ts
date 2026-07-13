import Groq from "groq-sdk";
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

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "missing_groq_api_key" }, { status: 500 });
    }

    const systemInstruction = `You are a personal finance assistant inside a receipt-tracking app.
You answer questions about the user's spending using ONLY the data provided below — never invent numbers.
Currency is ${currency ?? "PHP"}. When citing amounts, use that currency's symbol.
Be concise (2-4 sentences unless a breakdown is asked for). Use the precomputed totals for week/month/year
questions rather than recalculating from the raw receipt list. If the data doesn't cover what's asked,
say so plainly instead of guessing.

DATA:
${JSON.stringify(context)}`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const messages: Parameters<typeof groq.chat.completions.create>[0]["messages"] = [
      { role: "system", content: systemInstruction },
      ...((history ?? []) as ChatTurn[]).map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.2,
      max_completion_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content ?? "I couldn't come up with an answer for that.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Groq chat failed:", err);
    return NextResponse.json(
      { error: "chat_failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
