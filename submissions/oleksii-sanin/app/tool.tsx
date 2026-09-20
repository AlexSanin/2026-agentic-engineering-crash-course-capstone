"use client";

import { useState } from "react";

import type { TransformResult } from "@/lib/transform";

/**
 * The tool surface. It is the only client component in the app: it needs state, an event
 * handler and the clipboard.
 *
 * The type import above is erased at build time, so the `unified` stack stays on the server.
 */

const TABS = [
  { id: "blog", label: "Blog" },
  { id: "email", label: "Email" },
  { id: "x", label: "X thread" },
  { id: "linkedin", label: "LinkedIn" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      disabled={text === ""}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md border border-black/15 px-3 py-1 text-xs font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function Output({ text }: { text: string }) {
  if (text === "") {
    return <p className="p-4 text-sm opacity-60">No output. The source is empty.</p>;
  }
  return (
    <pre className="max-h-[28rem] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap">
      {text}
    </pre>
  );
}

export function Tool() {
  const [markdown, setMarkdown] = useState("");
  const [result, setResult] = useState<TransformResult | null>(null);
  const [tab, setTab] = useState<TabId>("blog");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const body = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(body.error ?? `The transform failed with status ${response.status}.`);
        return;
      }
      setResult(body as TransformResult);
    } catch {
      setResult(null);
      setError("The transform did not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const panel = "rounded-lg border border-black/10 dark:border-white/15";

  return (
    <div className="mt-8 grid gap-6">
      <div className="grid gap-3">
        <label htmlFor="source" className="text-sm font-medium">
          Markdown source
        </label>
        <textarea
          id="source"
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          rows={12}
          spellCheck={false}
          placeholder="# Your post&#10;&#10;Paste markdown here."
          className={`${panel} bg-transparent p-4 font-mono text-sm outline-none focus:border-black/40 dark:focus:border-white/40`}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Working" : "Transform"}
          </button>
          <span className="text-xs opacity-60">
            Nothing is stored. A reload clears the work.
          </span>
        </div>
      </div>

      {error !== "" && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      )}

      {result !== null && (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Outputs">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  tab === item.id
                    ? "bg-foreground text-background"
                    : "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={panel}>
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-2 dark:border-white/15">
              <span className="text-xs opacity-70">
                {tab === "x"
                  ? `${result.meta.x.parts} part${result.meta.x.parts === 1 ? "" : "s"}, ${result.meta.x.chars} characters`
                  : `${result.meta[tab].chars} characters`}
                {tab === "linkedin" && result.meta.linkedin.truncated ? " · cut at 3000" : ""}
              </span>
              <CopyButton
                text={tab === "x" ? result.x.join("\n\n") : result[tab]}
                label={tab === "x" ? "Copy the thread" : "Copy"}
              />
            </div>

            {tab === "x" ? (
              <div className="grid gap-3 p-4">
                {result.x.length === 0 && (
                  <p className="text-sm opacity-60">No output. The source is empty.</p>
                )}
                {result.x.map((part, index) => (
                  <div key={index} className={`${panel} grid gap-2 p-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium opacity-70">
                        Part {index + 1} of {result.x.length}
                      </span>
                      <CopyButton text={part} label="Copy this part" />
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{part}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Output text={result[tab]} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
