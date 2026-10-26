import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { comment } = await req.json();

    if (!comment || comment.trim() === '') {
      return NextResponse.json({ safe: false, reason: "Comment cannot be empty." });
    }

    const lowerComment = comment.toLowerCase();

    const teacherPatterns = [
      /\b(hate|dislike|sucks?|terrible|awful|worst)\b.*\b(mr|mrs|ms|dr|prof|professor|teacher)\b/i,
      /\b(mr|mrs|ms|dr|prof|professor|teacher)\b.*\b(hate|dislike|sucks?|terrible|awful|worst)\b/i,
      /\b(i hate|i dislike)\b.*\b[a-z]+/i // Catch "I hate [Name]"
    ];

    for (const pattern of teacherPatterns) {
      if (pattern.test(lowerComment)) {
        return NextResponse.json({ 
          safe: false, 
          reason: "Reviews cannot target individual teachers or staff members." 
        });
      }
    }

    // AI MODERATION by gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ safe: true });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an AI content moderator for a high school academic platform.
Evaluate the following student review.

REJECT IMMEDIATELY ("safe": false):
- Any profanity, cursing, or vulgar language.
- Any negative statements or attacks targeting teachers or staff members.
- Any personal insults, slurs, or harassment.

ALLOW ("safe": true):
- General comments about course difficulty, workload, homework, test hardness, or subject material.

Review: "${comment}"`
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safe: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["safe"]
        }
      }
    });

    const text = response.text?.trim() || '{"safe": false, "reason": "No response from AI moderator."}';
    const result = JSON.parse(text);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Moderation API Error:", error);
    return NextResponse.json({ safe: true });
  }
}