// src/components/ChatWidget.tsx
//
// Floating health-assistant chatbot, shown on every page via __root.tsx.
// Reads prediction context from ChatContext (see ChatContext.tsx) so it
// can be context-aware on the Results page and general-purpose elsewhere
// — all from a single global instance (no duplicate buttons).
//
// Features:
//  - Pulsing notification badge ("Ask AI") until first opened
//  - Animated typing dots while waiting for a reply
//  - Message timestamps
//  - Clear chat button
//  - Automatically switches context per page (see ChatContext.tsx)

import { useState, useRef, useEffect } from "react";
import { useChatContext } from "@/components/ChatContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SEEN_KEY = "medipredict_chat_badge_seen";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

const WELCOME_MESSAGE =
    "Hi, I'm your MediPredict health assistant. Ask me about your results, symptoms, or general health questions.";

const WELCOME_MESSAGE_WITH_CONTEXT =
    "Hi! I can see your latest assessment results. Ask me anything about your predicted conditions, risk score, or estimated costs — or any general health question.";

function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget() {
    const { context } = useChatContext();

    const [isOpen, setIsOpen] = useState(false);
    const [hasSeenBadge, setHasSeenBadge] = useState(true); // default true until checked, avoids flash
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: WELCOME_MESSAGE, timestamp: Date.now() },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Check localStorage once on mount for whether the badge was dismissed before
    useEffect(() => {
        setHasSeenBadge(localStorage.getItem(SEEN_KEY) === "true");
    }, []);

    // Reset welcome message wording when context appears/disappears,
    // but only if the conversation hasn't started yet (still just the welcome msg)
    useEffect(() => {
        setMessages((prev) => {
            if (prev.length !== 1) return prev; // user already chatting, don't reset
            return [
                {
                    role: "assistant",
                    content: context ? WELCOME_MESSAGE_WITH_CONTEXT : WELCOME_MESSAGE,
                    timestamp: Date.now(),
                },
            ];
        });
    }, [context]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isOpen, isLoading]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    function openChat() {
        setIsOpen(true);
        if (!hasSeenBadge) {
            setHasSeenBadge(true);
            localStorage.setItem(SEEN_KEY, "true");
        }
    }

    function clearChat() {
        setMessages([
            {
                role: "assistant",
                content: context ? WELCOME_MESSAGE_WITH_CONTEXT : WELCOME_MESSAGE,
                timestamp: Date.now(),
            },
        ]);
    }

    async function sendMessage() {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMsg: Message = { role: "user", content: trimmed, timestamp: Date.now() };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: trimmed,
                    history: newHistory
                        .slice(0, -1)
                        .slice(-10)
                        .map((m) => ({ role: m.role, content: m.content })),
                    context: context || null,
                }),
            });

            if (!res.ok) throw new Error("Chat request failed");
            const data = await res.json();

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.reply, timestamp: Date.now() },
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "Sorry, I couldn't reach the assistant right now. Make sure the API server is running.",
                    timestamp: Date.now(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    const showBadge = !isOpen && !hasSeenBadge;

    return (
        <>
            <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00D4FF;
          display: inline-block;
          animation: typingBounce 1.2s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }

        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-msg { animation: chatFadeIn 0.2s ease-out; }

        @keyframes badgePulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.55); }
          70% { box-shadow: 0 0 0 8px rgba(255, 71, 87, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
        }
        .notif-badge { animation: badgePulse 2s infinite; }

        @keyframes bubbleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .notif-bubble { animation: bubbleFloat 2.4s ease-in-out infinite; }
      `}</style>

            {/* Floating toggle button + badge */}
            <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
                {showBadge && (
                    <div
                        className="notif-bubble"
                        onClick={openChat}
                        style={{
                            position: "absolute",
                            bottom: 66,
                            right: 0,
                            background: "#0A1628",
                            border: "1px solid rgba(0, 212, 255, 0.3)",
                            color: "#fff",
                            fontSize: 12.5,
                            fontWeight: 500,
                            padding: "8px 13px",
                            borderRadius: 10,
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                        }}
                    >
                        👋 Ask AI for help
                        <div
                            style={{
                                position: "absolute",
                                bottom: -5,
                                right: 18,
                                width: 10,
                                height: 10,
                                background: "#0A1628",
                                borderRight: "1px solid rgba(0, 212, 255, 0.3)",
                                borderBottom: "1px solid rgba(0, 212, 255, 0.3)",
                                transform: "rotate(45deg)",
                            }}
                        />
                    </div>
                )}

                <button
                    onClick={() => (isOpen ? setIsOpen(false) : openChat())}
                    aria-label={isOpen ? "Close chat" : "Open health assistant chat"}
                    style={{
                        position: "relative",
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "#00D4FF",
                        color: "#0A1628",
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0, 212, 255, 0.4)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "transform 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                    {isOpen ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                    )}

                    {showBadge && (
                        <span
                            className="notif-badge"
                            style={{
                                position: "absolute",
                                top: -3,
                                right: -3,
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background: "#FF4757",
                                border: "2px solid #0A1628",
                            }}
                        />
                    )}
                </button>
            </div>

            {/* Chat panel */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 92,
                        right: 24,
                        width: 360,
                        maxWidth: "calc(100vw - 32px)",
                        height: 480,
                        maxHeight: "calc(100vh - 140px)",
                        background: "#0A1628",
                        border: "1px solid rgba(0, 212, 255, 0.25)",
                        borderRadius: 16,
                        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        zIndex: 1000,
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "rgba(0, 212, 255, 0.06)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: "#00D4FF",
                                    boxShadow: "0 0 8px #00D4FF",
                                }}
                            />
                            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
                                Health Assistant
                            </span>
                            {context && (
                                <span
                                    style={{
                                        fontSize: 9.5,
                                        color: "#00D4FF",
                                        border: "1px solid rgba(0, 212, 255, 0.3)",
                                        borderRadius: 999,
                                        padding: "1.5px 7px",
                                        fontWeight: 600,
                                        letterSpacing: 0.2,
                                    }}
                                >
                                    Using your results
                                </span>
                            )}
                        </div>

                        <button
                            onClick={clearChat}
                            title="Clear chat"
                            aria-label="Clear chat"
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#8A93A6",
                                cursor: "pointer",
                                fontSize: 11.5,
                                fontWeight: 500,
                                padding: "4px 8px",
                                borderRadius: 6,
                                transition: "color 0.15s, background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#00D4FF";
                                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#8A93A6";
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            Clear chat
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className="chat-msg"
                                style={{
                                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                    maxWidth: "85%",
                                    marginBottom: 10,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: m.role === "user" ? "flex-end" : "flex-start",
                                }}
                            >
                                <div
                                    style={{
                                        background:
                                            m.role === "user" ? "#00D4FF" : "rgba(255,255,255,0.06)",
                                        color: m.role === "user" ? "#0A1628" : "#E5E9F0",
                                        padding: "10px 13px",
                                        borderRadius: 12,
                                        fontSize: 13.5,
                                        lineHeight: 1.5,
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {m.content}
                                </div>
                                <span
                                    style={{
                                        fontSize: 10,
                                        color: "#5B6478",
                                        marginTop: 3,
                                        padding: "0 2px",
                                    }}
                                >
                                    {formatTime(m.timestamp)}
                                </span>
                            </div>
                        ))}

                        {isLoading && (
                            <div
                                className="chat-msg"
                                style={{
                                    alignSelf: "flex-start",
                                    background: "rgba(255,255,255,0.06)",
                                    padding: "12px 16px",
                                    borderRadius: 12,
                                    display: "flex",
                                    gap: 4,
                                    alignItems: "center",
                                }}
                            >
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            padding: 12,
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your results or symptoms..."
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 8,
                                padding: "9px 12px",
                                color: "#fff",
                                fontSize: 13.5,
                                outline: "none",
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            style={{
                                background: "#00D4FF",
                                border: "none",
                                borderRadius: 8,
                                padding: "0 14px",
                                color: "#0A1628",
                                fontWeight: 600,
                                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                                opacity: isLoading || !input.trim() ? 0.5 : 1,
                                fontSize: 13.5,
                            }}
                        >
                            Send
                        </button>
                    </div>

                    {/* Disclaimer */}
                    <div
                        style={{
                            fontSize: 10.5,
                            color: "#5B6478",
                            textAlign: "center",
                            padding: "0 12px 10px",
                        }}
                    >
                        Not a substitute for professional medical advice.
                    </div>
                </div>
            )}
        </>
    );
}