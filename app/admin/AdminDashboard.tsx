"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, CATEGORY_KEYS, MAX_IMAGES, STATUS_LABEL, eur, sizesOf, stockOf, type Category, type Order, type OrderStatus, type Product, type Settings } from "@/lib/catalog";
import { uploadImage } from "@/lib/image-client";

type Props = { products: Product[]; orders: Order[]; settings: Settings; subscribers: { email: string; createdAt: string }[] };
type Tab = "products" | "orders" | "settings" | "subs";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const data = await res?.json().catch(() => ({}));
  if (!res?.ok) throw new Error(data?.error || "Das hat nicht geklappt. Prüfe deine Verbindung.");
  return data;
}

export default function AdminDashboard({ products, orders, settings, subscribers }: Props) {
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
        <div className="tabs" role="tablist">
          {([["products", "Produkte"], ["orders", `Bestellungen${open ? ` (${open})` : ""}`], ["settings", "Startseite & Drop"], ["subs", "Newsletter"]] as [Tab, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {tab === "products" && <ProductsPanel products={products} onChange={() => router.refresh()} />}
        {tab === "orders" && <OrdersPanel orders={orders} onChange={() => router.refresh()} />}
        {tab === "settings" && <SettingsPanel settings={settings} onChange={() => router.refresh()} />}
        {tab === "subs" && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>E-Mail</th><th>Angemeldet am</th></tr></thead>
              <tbody>
                {subscribers.length ? subscribers.map((s) => (
                  <tr key={s.email}><td>{s.email}</td><td>{new Date(s.createdAt).toLocaleDateString("de-DE")}</td></tr>
                )) : <tr><td colSpan={2} className="small">Noch keine Anmeldungen.</td></tr>}
              </tbody>
            </table>
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
type Draft = { id: string | null; name: string; price: string; category: Category; sizes: SizeRow[]; color: string; description: string; isNew: boolean; images: string[] };
let rowKey = 1;
const row = (name: string, stock = "0"): SizeRow => ({ key: rowKey++, name, stock });
const PRESETS: Record<string, string[]> = {
  "S–XL": ["S", "M", "L", "XL"],
  "XS–XXL": ["XS", "S", "M", "L", "XL", "XXL"],
  "One Size": ["One Size"],
  "Hosen 28–36": ["28", "30", "32", "34", "36"],
};
const emptyDraft = (): Draft => ({ id: null, name: "", price: "", category: "hoodie", sizes: PRESETS["S–XL"].map((n) => row(n)), color: "#2a2622", description: "", isNew: false, images: [] });

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

  return (
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
      id: p.id, name: p.name, price: (p.priceCents / 100).toFixed(2), category: p.category,
      sizes: sizesOf(p).map((n) => row(n, String(stockOf(p, n)))),
      color: p.color, description: p.description, isNew: p.isNew, images: p.images,
    });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const sizes = d.sizes.map((r) => ({ name: r.name.trim(), stock: Math.max(0, parseInt(r.stock, 10) || 0) })).filter((r) => r.name);
    if (!sizes.length) return setMsg({ ok: false, text: "Lege mindestens eine Größe an, zum Beispiel „One Size“." });
    const price = Math.round(parseFloat(d.price.replace(",", ".")) * 100);
    if (!Number.isFinite(price)) return setMsg({ ok: false, text: "Bitte gib einen gültigen Preis ein." });
    setBusy(true);
    setMsg(null);
    const body = { name: d.name.trim(), priceCents: price, category: d.category, sizes, color: d.color, description: d.description.trim(), isNew: d.isNew, images: d.images };
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
        <div className="full">
          <div className="l" style={{ marginBottom: 8 }}>Größen und Bestand</div>
          <SizeEditor sizes={d.sizes} onChange={(rows) => set("sizes", rows)} />
        </div>
        <label className="l full">Beschreibung<textarea className="field" rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} /></label>
        <div className="full">
          <div className="l" style={{ marginBottom: 4 }}>Fotos</div>
          <div className="small" style={{ marginBottom: 10 }}>Bis zu {MAX_IMAGES} Fotos. Reihenfolge per Ziehen oder mit ← → ändern. Das erste ist das Hauptbild, das zweite erscheint im Shop beim Darüberfahren. Am besten Hochformat 3:4 auf hellem Hintergrund.</div>
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
                <td>{p.name}{p.isNew ? <> <span className="status">Neu</span></> : null}<div className="small">{p.images.length ? `${p.images.length} ${p.images.length === 1 ? "Foto" : "Fotos"}` : "ohne Foto"}</div></td>
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

function OrdersPanel({ orders, onChange }: { orders: Order[]; onChange: () => void }) {
  const [err, setErr] = useState("");
  async function setStatus(o: Order, status: OrderStatus) {
    if (status === "storniert" && !confirm(`Bestellung ${o.id} stornieren? Die Artikel gehen zurück ins Lager. Das lässt sich nicht rückgängig machen.`)) return;
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
            <select className="field" style={{ width: "auto", padding: "6px 10px" }} aria-label="Status" value={o.status} disabled={o.status === "storniert"} onChange={(e) => setStatus(o, e.target.value as OrderStatus)}>
              {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 12, fontSize: 14 }}>
            <div>
              {o.items.map((i, n) => <div key={n}>{i.qty} × {i.name}, {i.size} ({eur(i.priceCents * i.qty)})</div>)}
              <div style={{ marginTop: 6, fontWeight: 500 }}>{eur(o.totalCents)}</div>
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
      <label className="l full">Versand &amp; Rückgabe (erscheint auf jeder Produktseite)<textarea className="field" rows={3} value={s.shippingText} onChange={(e) => set("shippingText", e.target.value)} /></label>
      <div className="full"><button className="btn">Einstellungen speichern</button><div className={`msg ${msg ? (msg.ok ? "ok" : "err") : ""}`}>{msg?.text}</div></div>
    </form>
  );
}
