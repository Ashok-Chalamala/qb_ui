import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/qb/Layout";
import { useMemberData } from "@/lib/family-context";
import { Send, Mic, Sparkles, Calendar, Utensils } from "lucide-react";

type Msg = {
  role: "assistant" | "user";
  content: string;
  actions?: string[];
};

export const Route = createFileRoute("/genie")({
  head: () => ({
    meta: [
      { title: "Genie AI · Quest Beyond" },
      { name: "description", content: "Voice + text AI assistant turning patient signals into plain-English insight." },
    ],
  }),
  component: Genie,
});

function Genie() {
  const { data } = useMemberData();
  const [messages, setMessages] = useState<Msg[]>(() => data.genieMessages as Msg[]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Re-seed conversation when member changes
  useEffect(() => {
    setMessages(data.genieMessages as Msg[]);
    setInput("");
  }, [data.genieMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Based on the last 72 hours, I'd recommend a 20-minute walk after dinner and a fiber-forward breakfast tomorrow. I'll quietly watch your CGM and flag an alert if values stay >200 mg/dL by 10am.",
          actions: ["Set reminder", "Share summary"],
        },
      ]);
    }, 1200);
  };

  const toggleVoice = () => {
    if (recording) {
      setRecording(false);
      send("How is my sleep impacting my glucose?");
    } else {
      setRecording(true);
    }
  };

  return (
    <Layout>
      <div className="mx-auto flex h-[calc(100vh-140px)] max-w-3xl flex-col qb-card overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-soft ring-1 ring-violet/40">
              <Sparkles className="h-5 w-5 text-violet" />
            </div>
            <div>
              <div className="qb-display text-sm font-semibold">Genie</div>
              <div className="flex items-center gap-1.5 qb-mono text-[10px] uppercase tracking-widest text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime qb-pulse" /> Listening · GPT-4 · HIPAA
              </div>
              <div className="qb-mono text-[9px] uppercase tracking-widest text-muted mt-0.5">
                Viewing: {data.memberName}
              </div>
            </div>
          </div>
          <span className="qb-chip border-violet/40 text-violet">Beta</span>
        </div>

        {/* Messages */}
        <div className="qb-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-teal text-bg"
                  : "bg-surface-2 border border-border-soft text-fg"
              }`}>
                <div className="whitespace-pre-line leading-relaxed">{m.content}</div>
                {m.actions && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.actions.map((act) => {
                      const Icon = act.toLowerCase().includes("schedule") ? Calendar : act.toLowerCase().includes("meal") ? Utensils : Sparkles;
                      return (
                        <button
                          key={act}
                          className="flex items-center gap-1.5 rounded-lg border border-violet/40 bg-violet-soft px-2.5 py-1 text-xs text-violet hover:bg-violet/20"
                        >
                          <Icon className="h-3 w-3" /> {act}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border-soft bg-surface-2 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet" />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border-soft px-5 py-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border-strong bg-surface-2 px-3 py-2 focus-within:border-teal/50">
            <button
              onClick={toggleVoice}
              className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                recording ? "bg-rose text-bg qb-recording" : "bg-surface-3 text-muted hover:text-fg"
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={recording ? "Listening… speak now" : "Ask Genie anything about your health…"}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
            <button
              onClick={() => send()}
              className="grid h-9 w-9 place-items-center rounded-xl bg-teal text-bg hover:bg-teal/90"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between qb-mono text-[10px] uppercase tracking-widest text-muted">
            <span>POST /genie/chat · WS /genie/voice</span>
            <span className="text-lime">● Streaming ready</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
