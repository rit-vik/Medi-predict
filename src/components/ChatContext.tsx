// src/components/ChatContext.tsx
//
// A tiny global store so any page can tell the floating ChatWidget
// "here's the prediction context for this page" without prop-drilling
// or rendering a second widget.
//
// Setup (one-time):
//   1. Wrap your app with <ChatContextProvider> in __root.tsx
//   2. ChatWidget reads from this context automatically
//   3. On the Results page, call useSetChatContext(chatContext) to
//      push this assessment's data into the chatbot
//   4. On any other page, context is automatically cleared back to
//      "no context" (general health Q&A mode)

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface PredictionContext {
    top_diseases?: { disease: string; probability: number; severity: string }[];
    risk_score?: number;
    estimated_cost?: { min_inr: number; max_inr: number };
}

interface ChatContextValue {
    context: PredictionContext | null;
    setContext: (ctx: PredictionContext | null) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatContextProvider({ children }: { children: ReactNode }) {
    const [context, setContext] = useState<PredictionContext | null>(null);
    return (
        <ChatContext.Provider value={{ context, setContext }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const ctx = useContext(ChatContext);
    if (!ctx) {
        throw new Error("useChatContext must be used within ChatContextProvider");
    }
    return ctx;
}

/**
 * Call this inside any page component to push prediction context into
 * the global chatbot. Automatically clears itself when the page unmounts
 * (i.e. when the user navigates away), so the chatbot reverts to general
 * health Q&A mode on other pages.
 *
 * Usage in results.$id.tsx:
 *   useSetChatContext(chatContext);
 */
export function useSetChatContext(ctx: PredictionContext | null) {
    const { setContext } = useChatContext();

    useEffect(() => {
        setContext(ctx);
        return () => setContext(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(ctx)]);
}