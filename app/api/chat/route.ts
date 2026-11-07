import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getBackendApiBaseUrl } from "@/lib/api/backend";
export const maxDuration = 120;
export async function POST(request: Request) {
  let input: { messages?: UIMessage[] };
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid chat request" }, { status: 400 });
  }
  if (
    !Array.isArray(input.messages) ||
    input.messages.length > 40 ||
    JSON.stringify(input.messages).length > 100000
  )
    return Response.json({ error: "Invalid chat history" }, { status: 400 });
  const messages = input.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: (m.parts ?? [])
        .filter((p) => p.type === "text")
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("\n"),
    }))
    .filter((m) => m.content.trim());
  if (!messages.length)
    return Response.json({ error: "A message is required" }, { status: 400 });
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: crypto.randomUUID() });
      writer.write({ type: "text-start", id: "answer" });
      try {
        const response = await fetch(
          `${getBackendApiBaseUrl()}/assistant/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ messages }),
            cache: "no-store",
          },
        );
        const data = await response.json();
        writer.write({
          type: "text-delta",
          id: "answer",
          delta: response.ok
            ? data.answer
            : data.error || "The assistant is temporarily unavailable.",
        });
      } catch {
        writer.write({
          type: "text-delta",
          id: "answer",
          delta: "The assistant is temporarily unavailable. Please try again.",
        });
      }
      writer.write({ type: "text-end", id: "answer" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
