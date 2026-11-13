"use client";
import { useState } from "react";

export default function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="copylink">
      <input className="field" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Dein Link" />
      <button
        type="button"
        className="btn"
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1800); } catch {}
        }}
      >
        {done ? "Kopiert" : "Kopieren"}
      </button>
    </div>
  );
}
