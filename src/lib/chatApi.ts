// lib/chatApi.ts
export async function sendChatMessage(prompt: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  if (!apiUrl) {
    throw new Error("API URL not configured");
  }

  const res = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey && { "x-api-key": apiKey }),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}
