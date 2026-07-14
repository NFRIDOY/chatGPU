"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string; duration?: number }[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const endpoint = `${apiUrl}/api/chat`;
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
          timeout: 60 * 5 * 1000,
          withCredentials: true,
        }
      );

      console.log("✅ Response received:", res.status);
      console.log("📄 Response data:", res);
      setMessages(prev => [...prev, { role: "ai", content: res.data.reply || res.data.error, duration: res.data.duration }]);
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
      {/* <div className="w-full rounded p-4 h-[80vh] overflow-y-auto bg-black text-white flex flex-col"> */}
      <div className="w-full rounded-4xl p-4 h-[80vh] overflow-y-auto bg-black text-white flex flex-col  ">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 ${m.role === "user" ? "text-white font-semibold bg-blue-950 rounded-2xl p-2 ml-auto" : "text-amber-300"
              }`}
          >
            <span className="text-amber-600 italic rounded-2xl">
              {m.role === "user" ? "" : "AI "}
            </span>
            {/* {m.role === "user" ? "You: " : "AI: "} */}
            {/* <div className="prose prose-sm max-w-none prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-gray-300 prose-thead:bg-gray-100 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-tbody:divide-y prose-tbody:divide-gray-300 prose-tr:border-b prose-tr:border-gray-300 prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div> */}
            <div className={`prose prose-sm max-w-5xl text-white leading-loose ${m.role === "ai" ? "max-w-2 py-3 px-6 rounded-2xl" : ""}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <table className="w-full border border-gray-300 border-collapse" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold bg-gray-500" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border border-gray-300 px-3 py-2" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="border border-gray-300" {...props} />
                  ),
                }}
              >
                {m.content}
              </ReactMarkdown>
              {
                m.role === "ai" && <span className="text-gray-400 text-sm"> {m?.duration}s</span>
              }
            </div>

          </div>
        ))}
        {loading && <div className="text-white">AI is thinking...</div>}
        <div ref={bottomRef} />
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
    </div >

  );
}
