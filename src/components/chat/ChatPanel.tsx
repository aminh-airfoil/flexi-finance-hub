import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Check, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "confirmation" | "progress" | "result";
  confirmationData?: {
    summary: string;
    transactions: PendingTx[];
  };
  resultData?: { description: string; success: boolean; error?: string }[];
}

interface PendingTx {
  action: "add" | "edit" | "delete";
  id?: string;
  description: string;
  amount: number;
  date?: string;
  category_id?: string;
  category_name?: string;
  account_id?: string;
  account_name?: string;
  note?: string;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your FinTrack assistant. I can help you add, edit, or delete transactions. Just tell me what you need!",
      type: "text",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // We need fetchData from context to refresh after mutations
  const appCtx = useApp();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const apiMessages = useCallback(() => {
    return messages
      .filter((m) => m.type !== "progress" && m.type !== "result")
      .map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, type: "text" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: [...apiMessages(), { role: "user", content: text }],
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }

      const data = await res.json();

      if (data.type === "confirmation") {
        const confirmMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.summary,
          type: "confirmation",
          confirmationData: {
            summary: data.summary,
            transactions: data.transactions,
          },
        };
        setMessages((prev) => [...prev, confirmMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data.content, type: "text" },
        ]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Sorry, something went wrong. Please try again.", type: "text" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (msgId: string, transactions: PendingTx[]) => {
    setExecuting(true);
    const progressId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: progressId, role: "assistant", content: `Processing ${transactions.length} transaction(s)...`, type: "progress" },
    ]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "execute", transactionData: transactions }),
        }
      );

      const data = await res.json();
      const results = data.results || [];

      // Replace progress with result
      setMessages((prev) =>
        prev.map((m) =>
          m.id === progressId
            ? {
                ...m,
                content: "Done!",
                type: "result" as const,
                resultData: results,
              }
            : m.id === msgId
            ? { ...m, type: "text" as const, confirmationData: undefined }
            : m
        )
      );

      // Remove confirmation buttons
      const successCount = results.filter((r: any) => r.success).length;
      if (successCount > 0) {
        toast.success(`${successCount} transaction(s) processed successfully!`);
        // Refresh app data
        // We need to trigger a data refresh - call fetchData indirectly by reloading
        window.dispatchEvent(new CustomEvent("refresh-data"));
      }
      const failCount = results.filter((r: any) => !r.success).length;
      if (failCount > 0) toast.error(`${failCount} transaction(s) failed.`);
    } catch (e) {
      toast.error("Failed to execute transactions");
      setMessages((prev) => prev.filter((m) => m.id !== progressId));
    } finally {
      setExecuting(false);
    }
  };

  const handleCancel = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, content: "Cancelled. Let me know if you'd like to try again!", type: "text" as const, confirmationData: undefined }
          : m
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
          <Sparkles size={14} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">FinTrack AI</h3>
          <p className="text-[10px] text-muted-foreground">Transaction assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={12} className="text-primary" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {msg.type === "confirmation" && msg.confirmationData ? (
                <ConfirmationCard
                  data={msg.confirmationData}
                  onConfirm={() => handleConfirm(msg.id, msg.confirmationData!.transactions)}
                  onCancel={() => handleCancel(msg.id)}
                  disabled={executing}
                />
              ) : msg.type === "progress" ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>{msg.content}</span>
                </div>
              ) : msg.type === "result" && msg.resultData ? (
                <ResultCard results={msg.resultData} />
              ) : (
                <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={12} className="text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot size={12} className="text-primary" />
            </div>
            <div className="bg-secondary rounded-xl px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Add lunch $12.50 from Checking"
            className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            disabled={loading || executing}
          />
          <Button
            type="submit"
            size="icon"
            variant="default"
            className="h-9 w-9 rounded-lg"
            disabled={loading || executing || !input.trim()}
          >
            <Send size={14} />
          </Button>
        </form>
      </div>
    </div>
  );
}

function ConfirmationCard({
  data,
  onConfirm,
  onCancel,
  disabled,
}: {
  data: { summary: string; transactions: PendingTx[] };
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0">
        <ReactMarkdown>{data.summary}</ReactMarkdown>
      </div>
      <div className="space-y-1.5 mt-2">
        {data.transactions.map((tx, i) => (
          <div key={i} className="bg-background/50 rounded-lg px-2.5 py-1.5 text-xs space-y-0.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{tx.description}</span>
              <span className={`font-bold ${tx.amount < 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
            <div className="text-muted-foreground flex gap-2 flex-wrap">
              {tx.date && <span>{tx.date}</span>}
              {tx.category_name && <span>· {tx.category_name}</span>}
              {tx.account_name && <span>· {tx.account_name}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={onConfirm} disabled={disabled} className="flex-1 h-7 text-xs gap-1">
          <Check size={12} /> Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={disabled} className="flex-1 h-7 text-xs gap-1">
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
}

function ResultCard({ results }: { results: { description: string; success: boolean; error?: string }[] }) {
  return (
    <div className="space-y-1">
      {results.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {r.success ? (
            <Check size={12} className="text-[hsl(var(--success))]" />
          ) : (
            <X size={12} className="text-destructive" />
          )}
          <span>{r.description}</span>
          {r.error && <span className="text-destructive text-[10px]">({r.error})</span>}
        </div>
      ))}
    </div>
  );
}
