import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function generateGeminiText(prompt: string) {
  if (!env.GEMINI_API_KEY) {
    throw new HttpError(400, "Gemini API key is not configured");
  }

  const response = await fetch(
    `${env.GEMINI_API_BASE_URL}/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          topP: 0.9
        }
      })
    }
  );

  const payload = (await response.json().catch(() => ({}))) as GeminiResponse;

  if (!response.ok) {
    throw new HttpError(response.status, payload.error?.message ?? "Gemini API request failed");
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new HttpError(502, "Gemini returned an empty resume response");
  }

  return text;
}
