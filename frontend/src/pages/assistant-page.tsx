import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AiSetupNotice } from "@/components/ai-setup-notice";
import { useAiStatus } from "@/api/hooks";
import { streamChat } from "@/api/client";
import type { ChatMessage } from "@/api/types";
import { cn } from "@/lib/utils";

export function AssistantPage() {
  const { data: aiStatus } = useAiStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      let accumulated = "";
      for await (const chunk of streamChat(nextMessages)) {
        accumulated += chunk;
        setMessages([...nextMessages, { role: "assistant", content: accumulated }]);
      }
    } catch {
      setMessages([...nextMessages, { role: "assistant", content: "Sorry — something went wrong. Please try again." }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <PageHeader
        icon={<Bot className="h-5 w-5" />}
        title="AI Assistant"
        subtitle="Ask questions about NGX prices, your portfolio, or the market — grounded in live data"
        disclaimer="Analytical commentary only, not investment advice. Data delayed 20 minutes."
      />

      {!aiStatus?.available ? (
        <AiSetupNotice />
      ) : (
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center text-ink-muted">
                  <Bot className="mb-3 h-10 w-10 text-primary/40" />
                  <p className="text-sm">Ask about a stock, your portfolio, or what's moving the market today.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      m.role === "user" ? "bg-surface-hover text-ink-muted" : "bg-primary/10 text-primary"
                    )}
                  >
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user" ? "bg-primary/10 text-ink" : "bg-surface-hover text-ink"
                    )}
                  >
                    {m.content || <span className="text-ink-dim">…</span>}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about NGX stocks, your portfolio, or the market…"
                disabled={streaming}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
