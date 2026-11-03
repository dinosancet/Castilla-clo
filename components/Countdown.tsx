"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({ at, name, text }: { at: string; name: string; text: string }) {
  const target = new Date(at).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now !== null && target <= now) return null;
  const d = now === null ? 0 : Math.floor((target - now) / 1000);
  return (
    <section className="dropband">
      <div className="wrap">
        <div className="lbl">Nächster Drop</div>
        <h3>{name}</h3>
        <div className="count">
          <div><b>{pad(Math.floor(d / 86400))}</b><span>Tage</span></div>
          <div><b>{pad(Math.floor((d % 86400) / 3600))}</b><span>Std</span></div>
          <div><b>{pad(Math.floor((d % 3600) / 60))}</b><span>Min</span></div>
          <div><b>{pad(d % 60)}</b><span>Sek</span></div>
        </div>
        {text ? <p className="small" style={{ margin: "22px auto 0", maxWidth: "52ch" }}>{text}</p> : null}
      </div>
    </section>
  );
}
