import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { message, courseTitle } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { response: "Server configuration error: GEMINI_API_KEY is missing in .env.local." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert high school AI Tutor specializing in ${courseTitle || 'AP courses'}. 
Your goal is to help students understand AP-level concepts, practice questions, and exam strategies clearly and concisely. 
Keep answers clear, encouraging, structured, and easy to read.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const replyText = response.text || "I'm sorry, I couldn't process that question right now.";
    return NextResponse.json({ response: replyText });

  } catch (error: any) {
    console.error("AI Tutor Route Error:", error);
    return NextResponse.json(
      { response: `API Error: ${error.message || 'Failed to generate response.'}` },
      { status: 500 }
    );
  }
}