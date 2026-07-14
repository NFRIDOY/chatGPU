"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!apiUrl) {
      setMessages(prev => [...prev, { role: "ai", content: "Error: API URL not configured" }]);
      return;
    }

    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    setLoading(true);

    try {
      const endpoint = `${apiUrl}/chat`;
      console.log("🔄 Sending request to:", endpoint);
      console.log("📦 Headers:", { "x-api-key": apiKey ? "***" : "none" });
      
      const res = await axios.post(
        endpoint,
        { prompt: prompt },
        {
          headers: {
            "Content-Type": "application/json",
            ...(apiKey && { "x-api-key": apiKey }),
          },
          timeout: 10000,
          withCredentials: true,
        }
      );

      console.log("✅ Response received:", res.status);
      setMessages(prev => [...prev, { role: "ai", content: res.data.reply || res.data.error }]);
    } catch (err: any) {
      console.error("❌ Full error object:", err);
      console.error("Error code:", err.code);
      console.error("Error config:", err.config?.url);
      console.error("Error status:", err.response?.status);
      console.error("Error response:", err.response?.data);
      
      let errorMsg = "Error: ";
      if (err.code === "ECONNABORTED") {
        errorMsg += "Request timeout - server not responding";
      } else if (err.code === "ENOTFOUND") {
        errorMsg += "Cannot reach server - check API URL";
      } else if (err.code === "ERR_NETWORK") {
        errorMsg += "Network error - check if server is running and CORS is enabled";
      } else if (err.response) {
        errorMsg += `HTTP ${err.response.status}: ${err.response.statusText}`;
      } else if (err.request) {
        errorMsg += "No response from server (Network Error) - CORS issue or server unreachable";
      } else {
        errorMsg += err.message || "Failed to fetch response";
      }
      
      setMessages(prev => [...prev, { role: "ai", content: errorMsg }]);
    } finally {
      setPrompt("");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">Chat with Gemma 4</h1>
      <div className="w-full max-w-lg border rounded p-4 h-96 overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.role === "user" ? "text-blue-600 font-semibold" : "text-gray-800"}`}>
            {m.role === "user" ? "You: " : "AI: "} {m.content}
          </div>
        ))}
        {loading && <div className="text-gray-500">AI is thinking...</div>}
      </div>
      <div className="flex w-full max-w-lg mt-4">
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          className="flex-1 border rounded-l px-3 py-2"
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
