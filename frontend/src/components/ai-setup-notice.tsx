import { useState } from "react";
import { Lock, ChevronDown } from "lucide-react";

export function AiSetupNotice() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-amber/20 bg-amber/5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium text-amber"
      >
        <span className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" /> AI feature locked — click to enable it
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-amber/20 p-3 text-sm text-ink-muted space-y-1.5">
          <p>1. Grab a free API key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-primary underline">console.anthropic.com</a></p>
          <p>2. Set <code className="font-mono text-xs bg-surface-hover px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> as an environment variable on the backend service</p>
          <p>3. Restart the API — this message disappears automatically once it's detected</p>
        </div>
      )}
    </div>
  );
}
