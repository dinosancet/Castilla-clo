"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { CATEGORIES, CATEGORY_KEYS, COMMISSION_LABEL, FINAL_STATUSES, MAX_IMAGES, STATUS_LABEL, eur, sizesOf, stockOf, type Category, type Commission, type Creator, type CreatorLink, type Order, type OrderStatus, type Product, type Settings, type Withdrawal, LEGAL_PAGES, type LegalPage } from "@/lib/catalog";
import { reframeExisting, uploadImage } from "@/lib/image-client";
import type { CustomerRow } from "@/lib/customer";

type Affiliate = { creators: Creator[]; links: CreatorLink[]; commissions: Commission[] };
type Props = { products: Product[]; orders: Order[]; settings: Settings; subscribers: { email: string; createdAt: string; confirmed: boolean }[]; affiliate: Affiliate; customers: CustomerRow[]; mailReady: boolean; withdrawals: Withdrawal[]; legalMissing: string[]; generated: Record<string, string> };
type Tab = "products" | "orders" | "withdrawals" | "customers" | "creators" | "settings" | "legal" | "subs";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const data = await res?.json().catch(() => ({}));
  if (!res?.ok) throw new Error(data?.error || "Das hat nicht geklappt. Prüfe deine Verbindung.");
  return data;
}

export default function AdminDashboard({ products, orders, settings, subscribers, affiliate, customers, mailReady, withdrawals, legalMissing, generated }: Props) {
  const openW = withdrawals.filter((w) => !w.handled).length;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("products");
  const open = orders.filter((o) => o.status === "neu").length;
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }
  return (
    <main className="admin">
      <div className="wrap">
        <div className="admin-top">
          <div><h1>Verwaltung</h1><p className="small">Änderungen sind sofort im Shop sichtbar.</p></div>
          <button className="link" onClick={logout}>Abmelden</button>
        </div>
        {!mailReady ? (
          <div className="earn" style={{ margin: "20px 0 0", padding: "14px 18px" }}>
            <b style={{ fontWeight: 500 }}>E-Mail-Versand ist noch nicht eingerichtet.</b>{" "}
            <span className="small">Ohne RESEND_API_KEY und MAIL_FROM in Vercel gibt es keine Bestellbestätigungen, keine Versandmails und Kunden können sich nicht anmelden.</span>
          </div>
        ) : null}
        {legalMissing.length ? (
          <div className="earn" style={{ margin: "12px 0 0", padding: "14px 18px", borderColor: "var(--danger)" }}>
            <b style={{ fontWeight: 500 }}>Impressum unvollständig.</b>{" "}
            <span className="small">Es fehlt: {legalMissing.join(", ")}. Bitte unter „Rechtliches &amp; Versand“ ergänzen, bevor du verkaufst.</span>{" "}
            <button className="link" onClick={() => setTab("legal")}>Jetzt ergänzen</button>
          </div>
        ) : null}
        <div className="tabs" role="tablist">
          {([["products", "Produkte"], ["orders", `Bestellungen${open ? ` (${open})` : ""}`], ["withdrawals", `Widerrufe${openW ? ` (${openW})` : ""}`], ["customers", `Kunden (${customers.length})`], ["creators", `Creators${affiliate.creators.length ? ` (${affiliate.creators.length})` : ""}`], ["settings", "Startseite & Drop"], ["legal", "Rechtliches & Versand"], ["subs", "Newsletter"]] as [Tab, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {tab === "products" && <ProductsPanel products={products} onChange={() => router.refresh()} />}
        {tab === "orders" && <OrdersPanel orders={orders} affiliate={affiliate} onChange={() => router.refresh()} />}
        {tab === "customers" && <CustomersPanel customers={customers} orders={orders} affiliate={affiliate} openCreator={() => setTab("creators")} />}
        {tab === "creators" && <CreatorsPanel affiliate={affiliate} holdDays={settings.commissionHoldDays} onChange={() => router.refresh()} />}
        {tab === "settings" && <SettingsPanel settings={settings} onChange={() => router.refresh()} />}
        {tab === "legal" && <LegalPanel settings={settings} generated={generated} onChange={() => router.refresh()} />}
        {tab === "withdrawals" && <WithdrawalsPanel withdrawals={withdrawals} orders={orders} onChange={() => router.refresh()} />}
        {tab === "subs" && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>E-Mail</th><th>Angemeldet am</th><th>Status</th></tr></thead>
              <tbody>
                {subscribers.length ? subscribers.map((s) => (
                  <tr key={s.email}><td>{s.email}</td><td>{new Date(s.createdAt).toLocaleDateString("de-DE")}</td>
                    <td>{s.confirmed ? <span className="pill on">Bestätigt</span> : <span className="pill">Unbestätigt</span>}</td></tr>
                )) : <tr><td colSpan={3} className="small">Noch keine Anmeldungen.</td></tr>}
              </tbody>
            </table>
            <p className="small">Newsletter nur an bestätigte Adressen senden. Unbestätigte Anmeldungen (auch alle aus der Zeit vor dem Double-Opt-in) dürfen nicht angeschrieben werden.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function PhotoSlot({ label, url, onChange, maxEdge, setMsg }: { label: string; url: string | null; onChange: (u: string | null) => void; maxEdge?: number; setMsg: (m: { ok: boolean; text: string } | null) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="t">
      <div>{url ? <img src={url} alt="" /> : null}</div>
      <div className="small">{label}</div>
      <label className="link" style={{ display: "inline-block" }}>
        {busy ? "Lädt …" : url ? "Ersetzen" : "Hochladen"}
        <input type="file" accept="image/*" hidden disabled={busy} onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setMsg(null);
          try { onChange(await uploadImage(f, maxEdge)); setMsg({ ok: true, text: "Foto hochgeladen. Jetzt speichern, damit es im Shop erscheint." }); }
          catch (err: any) { setMsg({ ok: false, text: err.message }); }
          setBusy(false);
        }} />
      </label>
      {url ? <> <button type="button" className="link" onClick={() => onChange(null)}>Entfernen</button></> : null}
    </div>
  );
}

type SizeRow = { key: number; name: string; stock: string };
type Draft = { id: string | null; name: string; price: string; commission: string; category: Category; sizes: SizeRow[]; color: string; description: string; material: string; care: string; isNew: boolean; images: string[] };
let rowKey = 1;
const row = (name: string, stock = "0"): SizeRow => ({ key: rowKey++, name, stock });
const PRESETS: Record<string, string[]> = {
  "S–XL": ["S", "M", "L", "XL"],
  "XS–XXL": ["XS", "S", "M", "L", "XL", "XXL"],
  "One Size": ["One Size"],
  "Hosen 28–36": ["28", "30", "32", "34", "36"],
};
const emptyDraft = (): Draft => ({ id: null, name: "", price: "", commission: "10", category: "hoodie", sizes: PRESETS["S–XL"].map((n) => row(n)), color: "#2a2622", description: "", material: "", care: "", isNew: false, images: [] });

function PhotoManager({ images, onChange, setMsg }: { images: string[]; onChange: (imgs: string[]) => void; setMsg: (m: { ok: boolean; text: string } | null) => void }) {
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const free = MAX_IMAGES - images.length;

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = images.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }
  async function addFiles(files: FileList | null) {
    const list = Array.from(files ?? []).slice(0, Math.max(0, free));
    if (!list.length) return;
    if ((files?.length ?? 0) > free) setMsg({ ok: false, text: `Es sind höchstens ${MAX_IMAGES} Fotos möglich. Die ersten ${free} werden hochgeladen.` });
    else setMsg(null);
    setBusy(list.length);
    const added: string[] = [];
    for (const f of list) {
      try { added.push(await uploadImage(f)); }
      catch (err: any) { setMsg({ ok: false, text: `${f.name}: ${err.message}` }); }
      setBusy((n) => n - 1);
    }
    if (added.length) {
      onChange([...images, ...added]);
      setMsg({ ok: true, text: `${added.length} ${added.length === 1 ? "Foto" : "Fotos"} hochgeladen. Jetzt speichern, damit sie im Shop erscheinen.` });
    }
  }
  /** Cleans up photos uploaded before automatic framing existed: removes bars and fits them into the 3:4 frame. */
  async function reframeAll() {
    if (!images.length) return;
    setBusy(images.length);
    setMsg(null);
    const next: string[] = [];
    let failed = 0;
    for (const src of images) {
      try { next.push(await reframeExisting(src)); }
      catch { next.push(src); failed++; }
      setBusy((n) => n - 1);
    }
    onChange(next);
    setMsg(failed
      ? { ok: false, text: `${failed} von ${images.length} Fotos konnten nicht angepasst werden. Lade sie bitte neu hoch.` }
      : { ok: true, text: "Fotos angepasst. Jetzt speichern, damit sie im Shop erscheinen." });
  }

  return (
    <>
    <div className="photos">
      {images.map((src, i) => (
        <div
          key={src}
          className={`photo${drag === i ? " dragging" : ""}${over === i && drag !== i ? " over" : ""}`}
          draggable
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => { e.preventDefault(); setOver(i); }}
          onDragLeave={() => setOver((o) => (o === i ? null : o))}
          onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }}
          onDragEnd={() => { setDrag(null); setOver(null); }}
        >
          <div className="pi">
            <img src={src} alt="" />
            <span className="badge">{i === 0 ? "Hauptbild" : i + 1}</span>
          </div>
          <div className="pa">
            <button type="button" aria-label="Nach vorne" disabled={i === 0} onClick={() => move(i, i - 1)}>←</button>
            <button type="button" aria-label="Foto entfernen" onClick={() => onChange(images.filter((_, n) => n !== i))}>×</button>
            <button type="button" aria-label="Nach hinten" disabled={i === images.length - 1} onClick={() => move(i, i + 1)}>→</button>
          </div>
        </div>
      ))}
      {free > 0 ? (
        <label className="addphoto">
          {busy ? `Lädt … (${busy})` : <>+ Fotos hinzufügen<br />{images.length}/{MAX_IMAGES}</>}
          <input type="file" accept="image/*" multiple hidden disabled={!!busy} onChange={(e) => { const f = e.target.files; addFiles(f).finally(() => { e.target.value = ""; }); }} />
        </label>
      ) : null}
    </div>
    {images.length ? (
      <button type="button" className="link" style={{ marginTop: 10 }} disabled={!!busy} onClick={reframeAll}>
        {busy ? "Fotos werden angepasst …" : "Fotos in den Rahmen einpassen (Ränder entfernen, auf 3:4 bringen)"}
      </button>
    ) : null}
    </>
  );
}

function SizeEditor({ sizes, onChange }: { sizes: SizeRow[]; onChange: (rows: SizeRow[]) => void }) {
  const update = (key: number, patch: Partial<SizeRow>) => onChange(sizes.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const total = sizes.reduce((a, r) => a + (parseInt(r.stock, 10) || 0), 0);
  return (
    <div>
      <div className="sizerows">
        <div className="sizerow small"><span>Größe</span><span>Bestand</span><span /></div>
        {sizes.map((r) => (
          <div className="sizerow" key={r.key}>
            <input className="field" value={r.name} aria-label="Größe" onChange={(e) => update(r.key, { name: e.target.value })} />
            <input className="field" type="number" min={0} inputMode="numeric" value={r.stock} aria-label={`Bestand ${r.name}`} onChange={(e) => update(r.key, { stock: e.target.value })} />
            <button type="button" className="link" disabled={sizes.length === 1} onClick={() => onChange(sizes.filter((x) => x.key !== r.key))}>Entfernen</button>
          </div>
        ))}
      </div>
      <div className="presets">
        <button type="button" className="link" onClick={() => onChange([...sizes, row("")])}>+ Größe hinzufügen</button>
        <span className="small">Vorlagen:</span>
        {Object.entries(PRESETS).map(([label, names]) => (
          <button key={label} type="button" className="link" onClick={() => {
            const keep = new Map(sizes.map((r) => [r.name, r.stock]));
            onChange(names.map((n) => row(n, keep.get(n) ?? "0")));
          }}>{label}</button>
        ))}
      </div>
      <div className="small" style={{ marginTop: 8 }}>Gesamt: {total} Stück</div>
    </div>
  );
}

function ProductsPanel({ products, onChange }: { products: Product[]; onChange: () => void }) {
  const [d, setD] = useState<Draft>(emptyDraft);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  function edit(p: Product) {
    setD({
      id: p.id, name: p.name, price: (p.priceCents / 100).toFixed(2), commission: String(p.commissionPercent), category: p.category,
      sizes: sizesOf(p).map((n) => row(n, String(stockOf(p, n)))),
      color: p.color, description: p.description, material: p.material, care: p.care, isNew: p.isNew, images: p.images,
    });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const sizes = d.sizes.map((r) => ({ name: r.name.trim(), stock: Math.max(0, parseInt(r.stock, 10) || 0) })).filter((r) => r.name);
    if (!sizes.length) return setMsg({ ok: false, text: "Lege mindestens eine Größe an, zum Beispiel „One Size“." });
    if (!d.material.trim() && !confirm("Ohne Materialangabe ist das Produkt rechtlich angreifbar. Trotzdem speichern?")) return;
    const price = Math.round(parseFloat(d.price.replace(",", ".")) * 100);
    if (!Number.isFinite(price)) return setMsg({ ok: false, text: "Bitte gib einen gültigen Preis ein." });
    const commissionPercent = d.commission.trim() === "" ? 0 : Math.round(parseFloat(d.commission.replace(",", ".")) * 100) / 100;
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 90) return setMsg({ ok: false, text: "Die Provision muss zwischen 0 und 90 % liegen." });
    setBusy(true);
    setMsg(null);
    const body = { name: d.name.trim(), priceCents: price, commissionPercent, category: d.category, sizes, color: d.color, description: d.description.trim(), material: d.material.trim(), care: d.care.trim(), isNew: d.isNew, images: d.images };
    try {
      if (d.id) await send(`/api/admin/products?id=${encodeURIComponent(d.id)}`, "PUT", body);
      else await send("/api/admin/products", "POST", body);
      setMsg({ ok: true, text: d.id ? "Änderungen gespeichert." : "Produkt angelegt." });
      setD(emptyDraft());
      onChange();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
    setBusy(false);
  }
  async function del(p: Product) {
    if (!confirm(`„${p.name}“ wirklich löschen?`)) return;
    try { await send(`/api/admin/products?id=${encodeURIComponent(p.id)}`, "DELETE"); onChange(); }
    catch (err: any) { setMsg({ ok: false, text: err.message }); }
  }

  return (
    <>
      <form className="pform" onSubmit={save}>
        <label className="l">Name<input className="field" required value={d.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="l">Preis (€)<input className="field" required inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value)} /></label>
        <label className="l">Kategorie
          <select className="field" value={d.category} onChange={(e) => set("category", e.target.value as Category)}>
            {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
          </select>
        </label>
        <label className="l">Farbe der Platzhalter-Grafik<input className="field" type="color" value={d.color} onChange={(e) => set("color", e.target.value)} style={{ height: 46, padding: 4 }} /></label>
        <label className="l">Provision für Creator (%)
          <input className="field" inputMode="decimal" value={d.commission} onChange={(e) => set("commission", e.target.value)} placeholder="0 = keine Provisionslinks" />
          <span className="small">
            {(() => {
              const pct = parseFloat(d.commission.replace(",", ".")) || 0;
              const price = parseFloat(d.price.replace(",", ".")) || 0;
              return pct > 0 ? `Pro verkauftem Stück ${eur(Math.round(price * pct))} Provision. Käufer erhalten einen Link.` : "0 % = Käufer erhalten keinen Provisionslink.";
            })()}
          </span>
        </label>
        <div className="full">
          <div className="l" style={{ marginBottom: 8 }}>Größen und Bestand</div>
          <SizeEditor sizes={d.sizes} onChange={(rows) => set("sizes", rows)} />
        </div>
        <label className="l full">Beschreibung<textarea className="field" rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} /></label>
        <label className="l">Material (Pflichtangabe)
          <input className="field" value={d.material} onChange={(e) => set("material", e.target.value)} placeholder="z. B. 100 % Baumwolle" />
          <span className="small">Faseranteile in Prozent, nur zulässige Faserbezeichnungen (Baumwolle, Polyester, Elasthan …).</span>
        </label>
        <label className="l">Pflegehinweise (optional)<input className="field" value={d.care} onChange={(e) => set("care", e.target.value)} placeholder="z. B. 30 °C, links gewaschen, nicht in den Trockner" /></label>
        <div className="full">
          <div className="l" style={{ marginBottom: 4 }}>Fotos</div>
          <div className="small" style={{ marginBottom: 10 }}>Bis zu {MAX_IMAGES} Fotos. Neue Fotos werden automatisch in den Rahmen eingepasst: einfarbige Ränder werden entfernt und das Foto mit seiner Hintergrundfarbe auf 3:4 ergänzt. Reihenfolge per Ziehen oder mit ← → ändern. Das erste ist das Hauptbild, das zweite erscheint im Shop beim Darüberfahren. Am besten Hochformat 3:4 auf hellem Hintergrund.</div>
          <PhotoManager images={d.images} onChange={(imgs) => set("images", imgs)} setMsg={setMsg} />
        </div>
        <label className="l full"><span><input type="checkbox" checked={d.isNew} onChange={(e) => set("isNew", e.target.checked)} /> Als „Neu“ markieren</span></label>
        <div className="full row-actions">
          <button className="btn" disabled={busy}>{busy ? "Wird gespeichert …" : d.id ? "Änderungen speichern" : "Produkt anlegen"}</button>
          {d.id ? <button type="button" className="btn ghost" onClick={() => { setD(emptyDraft()); setMsg(null); }}>Abbrechen</button> : null}
        </div>
        <div className={`msg full ${msg ? (msg.ok ? "ok" : "err") : ""}`}>{msg?.text}</div>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Produkt</th><th>Kategorie</th><th>Preis</th><th>Bestand je Größe</th><th></th></tr></thead>
          <tbody>
            {products.length ? products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}{p.isNew ? <> <span className="status">Neu</span></> : null}<div className="small">{p.images.length ? `${p.images.length} ${p.images.length === 1 ? "Foto" : "Fotos"}` : "ohne Foto"} · {p.commissionPercent > 0 ? `${p.commissionPercent.toLocaleString("de-DE")} % Provision` : "keine Provision"}</div></td>
                <td>{CATEGORIES[p.category].label}</td>
                <td>{eur(p.priceCents)}</td>
                <td className="stocklist">
                  {sizesOf(p).map((s, i) => {
                    const n = stockOf(p, s);
                    return <span key={s}>{i ? " · " : ""}{s} <b className={n <= 0 ? "zero" : undefined}>{n}</b></span>;
                  })}
                </td>
                <td className="row-actions"><button className="link" onClick={() => edit(p)}>Bearbeiten</button><button className="link" onClick={() => del(p)}>Löschen</button></td>
              </tr>
            )) : <tr><td colSpan={5} className="small">Noch keine Produkte.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OrdersPanel({ orders, affiliate, onChange }: { orders: Order[]; affiliate: Affiliate; onChange: () => void }) {
  const creatorOf = (code: string | null) => {
    const link = code ? affiliate.links.find((l) => l.code === code) : null;
    return link ? affiliate.creators.find((c) => c.id === link.creatorId) ?? null : null;
  };
  const [err, setErr] = useState("");
  async function setStatus(o: Order, status: OrderStatus) {
    if (status === "storniert" && !confirm(`Bestellung ${o.id} stornieren? Die Artikel gehen zurück ins Lager, eine Provision verfällt. Das lässt sich nicht rückgängig machen.`)) return;
    if (status === "retourniert" && !confirm(`Bestellung ${o.id} als retourniert markieren? Die Artikel gehen zurück ins Lager, eine Provision verfällt. Das lässt sich nicht rückgängig machen.`)) return;
    try { await send(`/api/admin/orders?id=${encodeURIComponent(o.id)}`, "PATCH", { status }); setErr(""); onChange(); }
    catch (e: any) { setErr(e.message); }
  }
  if (!orders.length) return <p className="small">Noch keine Bestellungen.</p>;
  return (
    <>
      <div className="msg err">{err}</div>
      {orders.map((o) => (
        <div className="order" key={o.id}>
          <div className="top">
            <div>Nr. {o.id} <span className="small">{new Date(o.createdAt).toLocaleString("de-DE")}</span></div>
            <select className="field" style={{ width: "auto", padding: "6px 10px" }} aria-label="Status" value={o.status} disabled={FINAL_STATUSES.includes(o.status)} onChange={(e) => setStatus(o, e.target.value as OrderStatus)}>
              {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 12, fontSize: 14 }}>
            <div>
              {o.items.map((i, n) => <div key={n}>{i.qty} × {i.name}, {i.size} ({eur(i.priceCents * i.qty)})</div>)}
              <div style={{ marginTop: 6, fontWeight: 500 }}>{eur(o.totalCents)}</div>
              {o.refCode ? <div className="small" style={{ marginTop: 6 }}>Über Creator-Link von {creatorOf(o.refCode)?.name ?? o.refCode}</div> : null}
              {o.shippedAt ? <div className="small">Versendet am {new Date(o.shippedAt).toLocaleDateString("de-DE")}</div> : null}
            </div>
            <div>
              {o.customer.name}<br />{o.customer.street}<br />{o.customer.zip} {o.customer.city}<br />
              <a className="textlink" style={{ textTransform: "none", letterSpacing: 0 }} href={`mailto:${o.customer.email}`}>{o.customer.email}</a>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: () => void }) {
  const [s, setS] = useState({ ...settings, dropLocal: toLocalInput(settings.dropAt) });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof s, v: string | null) => setS((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { dropLocal, ...rest } = s;
    try {
      await send("/api/admin/settings", "PUT", { ...rest, dropAt: dropLocal ? new Date(dropLocal).toISOString() : null });
      setMsg({ ok: true, text: "Gespeichert." });
      onChange();
    } catch (err: any) { setMsg({ ok: false, text: err.message }); }
  }
  return (
    <form className="pform" onSubmit={save}>
      <label className="l full">Text im Startbild<input className="field" value={s.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} placeholder="Herbst Winter 26" /></label>
      <div className="full">
        <div className="small" style={{ marginBottom: 8 }}>Startbild (optional): Ein Querformat-Foto ersetzt das Tempel-Logo auf der Startseite.</div>
        <div className="thumbs"><PhotoSlot label="Startbild" url={s.heroImageUrl} onChange={(u) => set("heroImageUrl", u)} maxEdge={2400} setMsg={setMsg} /></div>
      </div>
      <label className="l">Name des nächsten Drops<input className="field" value={s.dropName} onChange={(e) => set("dropName", e.target.value)} /></label>
      <label className="l">Start des Drops<input className="field" type="datetime-local" value={s.dropLocal} onChange={(e) => set("dropLocal", e.target.value)} /></label>
      <label className="l full">Text zum Drop<input className="field" value={s.dropText} onChange={(e) => set("dropText", e.target.value)} /></label>
      <label className="l full">Leiste ganz oben (leer lassen zum Ausblenden)<input className="field" value={s.banner} onChange={(e) => set("banner", e.target.value)} /></label>
      <label className="l">Provision freigeben nach (Tage ab Versand)
        <input className="field" type="number" min={0} max={365} value={s.commissionHoldDays} onChange={(e) => setS((x) => ({ ...x, commissionHoldDays: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
        <span className="small">Rückgabefrist plus Puffer für den Rückversand, z. B. 14 + 7 = 21.</span>
      </label>
      <label className="l">Link-Klick zählt für Käufe innerhalb von (Tagen)
        <input className="field" type="number" min={1} max={365} value={s.refCookieDays} onChange={(e) => setS((x) => ({ ...x, refCookieDays: Math.max(1, parseInt(e.target.value, 10) || 1) }))} />
      </label>
      <label className="l full">Versand &amp; Rückgabe (erscheint auf jeder Produktseite)<textarea className="field" rows={3} value={s.shippingText} onChange={(e) => set("shippingText", e.target.value)} /></label>
      <div className="full"><button className="btn">Einstellungen speichern</button><div className={`msg ${msg ? (msg.ok ? "ok" : "err") : ""}`}>{msg?.text}</div></div>
    </form>
  );
}

type CreatorSort = "new" | "links" | "clicks" | "sales" | "commission";

function CreatorsPanel({ affiliate, holdDays, onChange }: { affiliate: Affiliate; holdDays: number; onChange: () => void }) {
  const [sort, setSort] = useState<CreatorSort>("new");
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const total = (k: "pendingCents" | "releasedCents" | "paidCents") => affiliate.creators.reduce((a, c) => a + c[k], 0);
  const earned = (c: Creator) => c.pendingCents + c.releasedCents + c.paidCents;
  const list = affiliate.creators.slice().sort((a, b) =>
    sort === "links" ? b.links - a.links :
    sort === "clicks" ? b.clicks - a.clicks :
    sort === "sales" ? b.sales - a.sales :
    sort === "commission" ? earned(b) - earned(a) :
    b.createdAt.localeCompare(a.createdAt));

  async function patch(c: Creator, body: unknown, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    try { await send(`/api/admin/creators?id=${encodeURIComponent(c.id)}`, "PATCH", body); setErr(""); onChange(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <div className="kpis">
        <div><b>{affiliate.creators.length}</b><span>Creators</span></div>
        <div><b>{affiliate.creators.reduce((a, c) => a + c.clicks, 0)}</b><span>Klicks</span></div>
        <div><b>{eur(total("pendingCents"))}</b><span>Vorgemerkt</span></div>
        <div><b>{eur(total("releasedCents"))}</b><span>Zur Auszahlung frei</span></div>
        <div><b>{eur(total("paidCents"))}</b><span>Ausgezahlt</span></div>
      </div>
      <p className="small" style={{ marginTop: 12 }}>
        Provisionen sind vorgemerkt, bis die Bestellung als versendet markiert ist und danach {holdDays} Tage vergangen sind. Stornierte und retournierte Bestellungen erhalten keine Provision.
      </p>
      <div className="chiprow">
        {([["new", "Neueste"], ["links", "Meiste Links"], ["clicks", "Meiste Klicks"], ["sales", "Meiste Käufe"], ["commission", "Höchste Provision"]] as [CreatorSort, string][]).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
        ))}
      </div>
      <div className="msg err">{err}</div>
      {!list.length ? <p className="small">Noch keine Creators. Sobald jemand ein Produkt mit Provision kauft, erscheint er hier.</p> : null}
      {list.map((c) => {
        const links = affiliate.links.filter((l) => l.creatorId === c.id);
        const comms = affiliate.commissions.filter((x) => x.creatorId === c.id);
        return (
          <div className="creator" key={c.id}>
            <div className="head">
              <div>
                <div style={{ fontSize: 17 }}>{c.name}<span className={`pill ${c.active ? "on" : "off"}`}>{c.active ? "Aktiv" : "Deaktiviert"}</span></div>
                <div className="small">{c.email}</div>
                <div className="small">Seit {new Date(c.createdAt).toLocaleDateString("de-DE")}</div>
              </div>
              <div className="stats">
                <div><b>{c.links}</b><span>Links</span></div>
                <div><b>{c.clicks}</b><span>Klicks</span></div>
                <div><b>{c.sales}</b><span>Käufe</span></div>
                <div><b>{eur(earned(c))}</b><span>Provision</span></div>
              </div>
            </div>
            <div className="row-actions" style={{ marginTop: 14 }}>
              <button className="btn ghost" type="button" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Details schließen" : "Details ansehen"}</button>
              <button className="btn ghost" type="button" onClick={() => patch(c, { active: !c.active }, c.active ? `${c.name} deaktivieren? Neue Käufe über die Links bringen dann keine Provision mehr.` : undefined)}>{c.active ? "Deaktivieren" : "Aktivieren"}</button>
              {c.releasedCents > 0 ? (
                <button className="btn" type="button" onClick={() => patch(c, { action: "markPaid" }, `${eur(c.releasedCents)} an ${c.name} als ausgezahlt markieren? Überweise den Betrag vorher an: ${c.payout || "(keine Auszahlungsdaten hinterlegt)"}`)}>
                  {eur(c.releasedCents)} als ausgezahlt markieren
                </button>
              ) : null}
            </div>
            {open === c.id ? (
              <div className="details">
                <div className="small">Auszahlung an: <b style={{ color: "var(--ink)", fontWeight: 400 }}>{c.payout || "noch nicht hinterlegt"}</b></div>
                <div className="kpis">
                  <div><b>{eur(c.pendingCents)}</b><span>Vorgemerkt</span></div>
                  <div><b>{eur(c.releasedCents)}</b><span>Zur Auszahlung frei</span></div>
                  <div><b>{eur(c.paidCents)}</b><span>Ausgezahlt</span></div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Link</th><th>Produkt</th><th>Klicks</th><th>Käufe</th><th>Provision</th></tr></thead>
                    <tbody>{links.map((l) => <tr key={l.code}><td>/r/{l.code}</td><td>{l.productName}</td><td>{l.clicks}</td><td>{l.sales}</td><td>{eur(l.earnedCents)}</td></tr>)}</tbody>
                  </table>
                </div>
                {comms.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Datum</th><th>Bestellung</th><th>Produkt</th><th>Betrag</th><th>Status</th></tr></thead>
                      <tbody>{comms.map((x) => (
                        <tr key={x.id}>
                          <td>{new Date(x.createdAt).toLocaleDateString("de-DE")}</td><td>{x.orderId}</td><td>{x.productName}</td><td>{eur(x.amountCents)}</td>
                          <td>{COMMISSION_LABEL[x.status]}{x.status === "vorgemerkt" && x.releaseAt ? <span className="small"> (ab {new Date(x.releaseAt).toLocaleDateString("de-DE")})</span> : null}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="small">Noch keine Verkäufe über diese Links.</p>}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function CustomersPanel({ customers, orders, affiliate, openCreator }: { customers: CustomerRow[]; orders: Order[]; affiliate: Affiliate; openCreator: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "account" | "creator" | "newsletter">("all");
  const [open, setOpen] = useState<string | null>(null);
  const t = q.trim().toLowerCase();
  const list = customers.filter((c) =>
    (filter === "all" || (filter === "account" && c.hasAccount) || (filter === "creator" && c.creatorId) || (filter === "newsletter" && c.newsletter)) &&
    (!t || `${c.name} ${c.email} ${c.address}`.toLowerCase().includes(t)));
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("de-DE") : "–");
  return (
    <>
      <div className="kpis">
        <div><b>{customers.length}</b><span>Kunden</span></div>
        <div><b>{customers.filter((c) => c.hasAccount).length}</b><span>Mit Konto</span></div>
        <div><b>{customers.filter((c) => c.orders > 1).length}</b><span>Wiederkäufer</span></div>
        <div><b>{eur(customers.reduce((a, c) => a + c.spentCents, 0))}</b><span>Umsatz gesamt</span></div>
      </div>
      <div className="toolbar" style={{ marginTop: 18, flexWrap: "wrap" }}>
        <input className="field" style={{ maxWidth: 360 }} placeholder="Name, E-Mail oder Adresse suchen" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chiprow" style={{ margin: 0 }}>
          {([["all", "Alle"], ["account", "Mit Konto"], ["creator", "Creators"], ["newsletter", "Newsletter"]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Kunde</th><th>Bestellungen</th><th>Umsatz</th><th>Letzte Bestellung</th><th>Konto</th><th></th></tr></thead>
          <tbody>
            {list.map((c) => {
              const own = orders.filter((o) => o.customer.email.toLowerCase() === c.email);
              const creator = c.creatorId ? affiliate.creators.find((x) => x.id === c.creatorId) : null;
              return (
                <Fragment key={c.email}>
                  <tr>
                    <td>
                      {c.name || "–"}
                      {creator ? <span className="pill on">Creator</span> : null}
                      {c.newsletter ? <span className="pill">Newsletter</span> : null}
                      <div className="small"><a href={`mailto:${c.email}`}>{c.email}</a></div>
                    </td>
                    <td>{c.orders}</td>
                    <td>{eur(c.spentCents)}</td>
                    <td>{fmt(c.lastOrderAt)}</td>
                    <td className="small">{c.hasAccount ? `seit ${fmt(c.createdAt)}${c.lastLoginAt ? `, zuletzt ${fmt(c.lastLoginAt)}` : ""}` : "Gast"}</td>
                    <td><button className="link" onClick={() => setOpen(open === c.email ? null : c.email)}>{open === c.email ? "Schließen" : "Kartei"}</button></td>
                  </tr>
                  {open === c.email ? (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--surface)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, padding: "8px 0" }}>
                          <div className="small">
                            <div><b style={{ color: "var(--ink)", fontWeight: 500 }}>Adresse</b></div>
                            {c.address || "–"}
                            <div style={{ marginTop: 10 }}><b style={{ color: "var(--ink)", fontWeight: 500 }}>Kunde seit</b></div>
                            {fmt(c.createdAt)}
                          </div>
                          <div className="small">
                            <div><b style={{ color: "var(--ink)", fontWeight: 500 }}>Bestellungen</b></div>
                            {own.length ? own.map((o) => (
                              <div key={o.id}>{fmt(o.createdAt)} · Nr. {o.id} · {eur(o.totalCents)} · {STATUS_LABEL[o.status]}</div>
                            )) : "–"}
                          </div>
                          <div className="small">
                            <div><b style={{ color: "var(--ink)", fontWeight: 500 }}>Provision</b></div>
                            {creator ? (
                              <>
                                {creator.links} Links · {creator.clicks} Klicks · {creator.sales} Käufe<br />
                                Vorgemerkt {eur(creator.pendingCents)} · Frei {eur(creator.releasedCents)} · Ausgezahlt {eur(creator.paidCents)}<br />
                                <button className="link" onClick={openCreator}>Zu den Creators</button>
                              </>
                            ) : "Kein Creator"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!list.length ? <tr><td colSpan={6} className="small">Keine Kunden gefunden.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LegalPanel({ settings, generated, onChange }: { settings: Settings; generated: Record<string, string>; onChange: () => void }) {
  const [s, setS] = useState({ ...settings, shipping: (settings.shippingCents / 100).toFixed(2), free: settings.freeShippingFromCents ? (settings.freeShippingFromCents / 100).toFixed(2) : "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof s, v: unknown) => setS((x) => ({ ...x, [k]: v }));
  const setOverride = (k: LegalPage, v: string) => setS((x) => ({ ...x, legalOverrides: { ...x.legalOverrides, [k]: v } }));
  const euros = (v: string) => Math.max(0, Math.round((parseFloat(v.replace(",", ".")) || 0) * 100));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { shipping, free, ...rest } = s;
    const overrides = Object.fromEntries(Object.entries(rest.legalOverrides).filter(([, v]) => v && v.trim()));
    try {
      await send("/api/admin/settings", "PUT", { ...rest, shippingCents: euros(shipping), freeShippingFromCents: euros(free), legalOverrides: overrides });
      setMsg({ ok: true, text: "Gespeichert. Impressum, AGB und alle Rechtstexte sind aktualisiert." });
      onChange();
    } catch (err: any) { setMsg({ ok: false, text: err.message }); }
  }
  return (
    <form className="pform" onSubmit={save}>
      <div className="full"><div className="l">Verkäufer (Impressum)</div><div className="small">Diese Angaben erscheinen im Impressum, in AGB, Widerrufsbelehrung, Bestellmails und als Herstellerangabe auf jeder Produktseite.</div></div>
      <label className="l">Vor- und Nachname des Inhabers *<input className="field" value={s.legalOwner} onChange={(e) => set("legalOwner", e.target.value)} placeholder="Max Mustermann" /></label>
      <label className="l">Geschäftsbezeichnung<input className="field" value={s.legalBusiness} onChange={(e) => set("legalBusiness", e.target.value)} /></label>
      <label className="l">Straße und Hausnummer *<input className="field" value={s.legalStreet} onChange={(e) => set("legalStreet", e.target.value)} /></label>
      <label className="l">PLZ und Ort *<input className="field" value={s.legalZipCity} onChange={(e) => set("legalZipCity", e.target.value)} placeholder="12345 Musterstadt" /></label>
      <label className="l">E-Mail *<input className="field" type="email" value={s.legalEmail} onChange={(e) => set("legalEmail", e.target.value)} /></label>
      <label className="l">Telefon (optional)<input className="field" value={s.legalPhone} onChange={(e) => set("legalPhone", e.target.value)} /></label>
      <label className="l">USt-IdNr. (§ 27a UStG, leer wenn keine)<input className="field" value={s.vatId} onChange={(e) => set("vatId", e.target.value)} placeholder="DE123456789" /></label>
      <label className="l" style={{ alignSelf: "end" }}><span><input type="checkbox" checked={s.smallBusiness} onChange={(e) => set("smallBusiness", e.target.checked)} /> Kleinunternehmer nach § 19 UStG (keine Umsatzsteuer)</span></label>

      <div className="full" style={{ marginTop: 10 }}><div className="l">Versand &amp; Zahlung</div></div>
      <label className="l">Versandkosten Deutschland (€)<input className="field" inputMode="decimal" value={s.shipping} onChange={(e) => set("shipping", e.target.value)} /></label>
      <label className="l">Kostenloser Versand ab (€, leer = nie)<input className="field" inputMode="decimal" value={s.free} onChange={(e) => set("free", e.target.value)} /></label>
      <label className="l full">Bankverbindung für Vorkasse (steht in jeder Bestellbestätigung)
        <textarea className="field" rows={3} value={s.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} placeholder={"Kontoinhaber: Max Mustermann\nIBAN: DE…\nBank: …"} />
      </label>

      <div className="full" style={{ marginTop: 10 }}>
        <div className="l">Rechtstexte</div>
        <div className="small">Die Texte werden automatisch aus deinen Angaben erzeugt. Wenn du Texte von einem Rechtstexte-Dienst oder Anwalt hast, kannst du sie hier einfügen. Format: „## “ am Zeilenanfang für Überschriften, Leerzeile für neuen Absatz.</div>
      </div>
      {LEGAL_PAGES.map((p) => {
        const custom = s.legalOverrides[p.key] !== undefined && s.legalOverrides[p.key] !== "";
        return (
          <div className="full" key={p.key} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <div className="row-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span>{p.label} <a className="link" href={p.href} target="_blank">ansehen</a></span>
              <label className="small"><input type="checkbox" checked={custom} onChange={(e) => setOverride(p.key, e.target.checked ? generated[p.key] : "")} /> Eigenen Text verwenden</label>
            </div>
            {custom ? <textarea className="field" rows={12} style={{ marginTop: 8, fontSize: 13 }} value={s.legalOverrides[p.key]} onChange={(e) => setOverride(p.key, e.target.value)} /> : null}
          </div>
        );
      })}
      <div className="full"><button className="btn">Speichern</button><div className={`msg ${msg ? (msg.ok ? "ok" : "err") : ""}`}>{msg?.text}</div></div>
    </form>
  );
}

function WithdrawalsPanel({ withdrawals, orders, onChange }: { withdrawals: Withdrawal[]; orders: Order[]; onChange: () => void }) {
  const [err, setErr] = useState("");
  async function toggle(w: Withdrawal) {
    try { await send(`/api/admin/widerrufe?id=${encodeURIComponent(w.id)}`, "PATCH", { handled: !w.handled }); setErr(""); onChange(); }
    catch (e: any) { setErr(e.message); }
  }
  if (!withdrawals.length) return <p className="small">Noch keine Widerrufe. Kunden widerrufen über die Schaltfläche „Vertrag widerrufen“ im Footer, ohne Anmeldung.</p>;
  return (
    <>
      <p className="small">Nach Eingang der Rücksendung die Bestellung unter „Bestellungen“ auf „Retourniert“ setzen. Dann geht die Ware zurück ins Lager und eine Provision verfällt. Den Kaufpreis inklusive Versandkosten innerhalb von 14 Tagen erstatten.</p>
      <div className="msg err">{err}</div>
      {withdrawals.map((w) => {
        const o = w.orderId ? orders.find((x) => x.id === w.orderId) : null;
        return (
          <div className="order" key={w.id} style={w.handled ? { opacity: 0.6 } : undefined}>
            <div className="top">
              <span>Bestellung {w.orderRef} <span className="small">{new Date(w.createdAt).toLocaleString("de-DE")}</span></span>
              <span className={`pill ${w.handled ? "on" : "off"}`}>{w.handled ? "Erledigt" : "Offen"}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 14 }}>
              {w.name} · <a href={`mailto:${w.email}`}>{w.email}</a><br />
              Artikel: {w.items || "gesamte Bestellung"}<br />
              {o ? <span className="small">Bestellung gefunden: {eur(o.totalCents)}, Status {STATUS_LABEL[o.status]}</span> : <span className="small" style={{ color: "var(--danger)" }}>Keine passende Bestellung zu Nummer und E-Mail gefunden, bitte manuell prüfen.</span>}
            </div>
            <div style={{ marginTop: 10 }}><button className="link" onClick={() => toggle(w)}>{w.handled ? "Wieder öffnen" : "Als erledigt markieren"}</button></div>
          </div>
        );
      })}
    </>
  );
}
