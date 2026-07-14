"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { io, Socket } from "socket.io-client";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string; duration?: number }[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [mounted, setMounted] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    // Strip trailing /api if present to get the base socket connection URL
    const socketUrl = apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;

    console.log("🔌 Initializing socket client to:", socketUrl);

    const socketInstance = io(socketUrl, {
      auth: {
        token: apiKey
      },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    socketInstance.on("connect", () => {
      console.log("✅ Socket.io connected successfully. ID:", socketInstance.id);
      setConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("❌ Socket.io disconnected. Reason:", reason);
      setConnected(false);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("❌ Socket.io connection error:", err.message);
      setConnected(false);
    });

    socketInstance.on("chat-start", () => {
      setLoading(true);
      // Append a fresh AI message with empty content
      setMessages(prev => [...prev, { role: "ai", content: "" }]);
    });

    socketInstance.on("chat-chunk", (data: { text: string }) => {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "ai") {
          return [
            ...next.slice(0, -1),
            { ...last, content: last.content + data.text }
          ];
        }
        return next;
      });
    });

    socketInstance.on("chat-end", (data: { duration: number; reply: string }) => {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "ai") {
          return [
            ...next.slice(0, -1),
            { ...last, content: data.reply, duration: data.duration }
          ];
        }
        return next;
      });
      setLoading(false);
    });

    socketInstance.on("chat-error", (data: { error: string }) => {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "ai" && !last.content) {
          return [
            ...next.slice(0, -1),
            { ...last, content: `Error: ${data.error}` }
          ];
        }
        return [...next, { role: "ai", content: `Error: ${data.error}` }];
      });
      setLoading(false);
    });

    socketRef.current = socketInstance;

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input after response or on mount
  useEffect(() => {
    if (mounted && !loading) {
      inputRef.current?.focus();
    }
  }, [loading, mounted]);

  useEffect(() => {
    setMounted(true);
    // Focus on initial load
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);


  const sendMessage = () => {
    if (!prompt.trim()) return;

    if (!socketRef.current || !socketRef.current.connected) {
      setMessages(prev => [
        ...prev,
        { role: "ai", content: "Error: Socket is disconnected. Attempting to reconnect..." }
      ]);
      socketRef.current?.connect();
      return;
    }

    const currentPrompt = prompt;

    // Map current messages history to standard Ollama format
    const history = messages.map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content
    }));

    setPrompt(""); // Clear input field immediately
    setMessages(prev => [...prev, { role: "user", content: currentPrompt }]);
    setLoading(true);

    console.log("📤 Sending prompt with history:", currentPrompt, history);
    socketRef.current.emit("chat-message", { prompt: currentPrompt, history });

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-linear-to-b from-zinc-950 via-zinc-900 to-black p-4 md:p-8 text-white">
      {/* Header Panel */}
      <div className="w-full max-w-4xl flex items-center justify-between bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl px-6 py-4 mb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <span className="font-extrabold text-indigo-400 text-lg">G</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Gemma 4 Chat
            </h1>
            <p className="text-xs text-zinc-500">Real-time local AI assistant</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800/50 rounded-full px-3 py-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${connected
              ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
              : "bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]"
              }`}
          />
          <span className="text-xs font-semibold text-zinc-300">
            {connected ? "Live Stream" : "Connecting"}
          </span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="w-full max-w-4xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-3xl shadow-2xl flex flex-col flex-1 overflow-hidden h-[70vh]">
        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-3">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-800 flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-zinc-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.92 1.78c-.082.095-.154.199-.211.309a12.09 12.09 0 0 0 1.958-.328c.495-.082.959-.23 1.39-.472a3.3 3.3 0 0 1 1.488-.355c.487 0 .954.118 1.378.347.407.22.843.348 1.29.345Z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-zinc-300">Start a new conversation</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Ask Gemma 4 anything. Responses will stream in real-time using Socket.io.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"
                  }`}
              >
                {/* Bubble Wrapper */}
                <div
                  className={`relative max-w-[85%] rounded-2xl px-5 py-3.5 shadow-md ${m.role === "user"
                    ? "bg-indigo-600/90 text-white rounded-tr-none"
                    : "bg-zinc-800/80 border border-zinc-800/60 text-zinc-100 rounded-tl-none"
                    }`}
                >
                  <div className="prose prose-sm max-w-none text-zinc-100 leading-relaxed font-sans">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ ...props }) => (
                          <div className="overflow-x-auto my-3">
                            <table className="w-full border border-zinc-800 border-collapse rounded-lg" {...props} />
                          </div>
                        ),
                        th: ({ ...props }) => (
                          <th className="border border-zinc-800 px-4 py-2 text-left font-bold bg-zinc-800/80 text-white" {...props} />
                        ),
                        td: ({ ...props }) => (
                          <td className="border border-zinc-800 px-4 py-2 bg-zinc-900/30" {...props} />
                        ),
                        tr: ({ ...props }) => (
                          <tr className="border-b border-zinc-800 hover:bg-zinc-800/20" {...props} />
                        ),
                        code: ({ ...props }) => (
                          <code className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-indigo-300 font-mono text-sm" {...props} />
                        ),
                        pre: ({ ...props }) => (
                          <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto my-4 font-mono text-sm" {...props} />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  {m.role === "ai" && typeof m.duration === "number" && m.duration > 0 && (
                    <div className="mt-2 text-right">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                        generated in {m.duration.toFixed(2)}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Local thinking state inside chat stream */}
          {loading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <div className="flex flex-col items-start">
              <div className="bg-zinc-800/80 border border-zinc-800/60 rounded-2xl rounded-tl-none px-5 py-3.5 shadow-md flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Control Box */}
        <div className="border-t border-zinc-800/60 bg-zinc-900/80 p-4 md:p-6 flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            disabled={loading}
            className="flex-1 bg-zinc-950 border border-zinc-800/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 outline-none transition disabled:opacity-50"
            placeholder={loading ? "AI is responding..." : "Type a message..."}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !prompt.trim() || !connected}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold px-6 py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-6">
        Connected via Socket.io Handshake Space
      </p>
    </div>
  );
}
