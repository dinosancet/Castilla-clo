import "server-only";
import { eur, taxNote, type Order, type Settings, type Withdrawal } from "./catalog";
import { legalHtml, legalText, seller } from "./legal";
import { linkUrl, siteUrl } from "./site";
import type { BuyerLink } from "./affiliate";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

/** Sends e-mails via Resend (https://resend.com). Does nothing if RESEND_API_KEY / MAIL_FROM are not set. */
async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return false;
  const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) console.error("mail failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

const wrap = (body: string) => `<!doctype html><html><body style="margin:0;background:#FAF8F4;font-family:Helvetica,Arial,sans-serif;color:#1C1915">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<div style="text-align:center;font-family:Georgia,serif;letter-spacing:.4em;font-size:22px;margin-bottom:28px">CASTILLA</div>
${body}
<p style="font-size:12px;color:#6E675E;margin-top:36px;text-align:center"><a href="${siteUrl()}" style="color:#6E675E">${siteUrl().replace(/^https?:\/\//, "")}</a></p>
</div></body></html>`;

export async function sendOrderConfirmation(order: Order, links: BuyerLink[], token: string | null, settings: Settings) {
  const holdDays = settings.commissionHoldDays;
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${i.qty} × ${esc(i.name)}, ${esc(i.size)}</td><td style="padding:6px 0;text-align:right">${eur(i.priceCents * i.qty)}</td></tr>`)
    .join("");
  const linkBlock = links.length
    ? `<div style="border:1px solid #E3DDD3;background:#fff;padding:20px;margin-top:28px">
<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:20px;margin:0 0 8px">Verdiene mit, wenn du CASTILLA zeigst</h2>
<p style="margin:0 0 14px;font-size:14px;line-height:1.5">Hier ist dein persönlicher Link. Teile ihn auf Instagram, TikTok oder wo du willst. Kauft jemand über deinen Link, bekommst du eine Provision.</p>
${links.map((l) => `<p style="margin:0 0 10px;font-size:14px"><b>${esc(l.productName)}</b><br><a href="${linkUrl(l.code)}" style="color:#6A4824">${linkUrl(l.code)}</a></p>`).join("")}
<p style="margin:14px 0 0;font-size:12px;color:#6E675E;line-height:1.5">Die Provision wird ${holdDays} Tage nach Versand der vermittelten Bestellung freigegeben, also nach Ablauf der Rückgabefrist. Bitte kennzeichne deine Beiträge als Werbung.${token ? ` Klicks, Verkäufe und Provision siehst du in <a href="${siteUrl()}/konto" style="color:#6A4824">deinem Konto</a>. Melde dich dort einfach mit dieser E-Mail-Adresse an.` : ""}</p>
</div>`
    : "";
  const html = wrap(`<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px">Danke für deine Bestellung</h1>
<p style="font-size:14px;line-height:1.5;margin:0 0 20px">Hallo ${esc(order.customer.name)}, vielen Dank für deine Bestellung Nr. ${order.id}. Hiermit bestätigen wir dir den Eingang und nehmen deine Bestellung an.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #E3DDD3;border-bottom:1px solid #E3DDD3">${rows}
<tr><td style="padding:6px 0">Versand</td><td style="padding:6px 0;text-align:right">${order.shippingCents ? eur(order.shippingCents) : "kostenlos"}</td></tr>
<tr><td style="padding:10px 0;font-weight:bold">Gesamt <span style="font-weight:normal;font-size:12px;color:#6E675E">${taxNote(settings)}</span></td><td style="padding:10px 0;text-align:right;font-weight:bold">${eur(order.totalCents)}</td></tr></table>
<div style="background:#fff;border:1px solid #E3DDD3;padding:16px;margin-top:20px;font-size:14px;line-height:1.5">
<b>Zahlung per Vorkasse (Überweisung)</b><br>Bitte überweise ${eur(order.totalCents)} mit dem Verwendungszweck <b>${order.id}</b>${settings.bankDetails.trim() ? ` an:<br>${esc(settings.bankDetails.trim()).replace(/\n/g, "<br>")}` : ". Die Bankverbindung senden wir dir in einer separaten E-Mail."}<br>Wir versenden innerhalb von 2–4 Werktagen nach Zahlungseingang.</div>
<p style="font-size:14px;line-height:1.5;margin:16px 0 0">Lieferadresse:<br>${esc(order.customer.name)}<br>${esc(order.customer.street)}<br>${esc(order.customer.zip)} ${esc(order.customer.city)}</p>
<p style="font-size:14px;margin:16px 0 0"><a href="${siteUrl()}/bestellung/${order.id}" style="color:#6A4824">Bestellung ansehen</a> · <a href="${siteUrl()}/konto" style="color:#6A4824">Mein Konto</a></p>
${linkBlock}
<p style="font-size:13px;line-height:1.5;margin:28px 0 0">Du möchtest die Bestellung widerrufen? Das geht jederzeit über <a href="${siteUrl()}/widerrufen?bestellung=${order.id}" style="color:#6A4824">Vertrag widerrufen</a>.</p>
<div style="margin-top:32px;border-top:1px solid #E3DDD3;padding-top:16px">
<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:18px;margin:0 0 4px">Widerrufsbelehrung</h2>${legalHtml(legalText("widerruf", settings))}
<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:18px;margin:24px 0 4px">Allgemeine Geschäftsbedingungen</h2>${legalHtml(legalText("agb", settings))}
<p style="font-size:12px;color:#6E675E">${esc(seller(settings).lines.join(", "))} · ${esc(settings.legalEmail)}</p>
</div>`);
  const ok = await send(order.customer.email, `Deine CASTILLA-Bestellung ${order.id}`, html);

  const admin = process.env.ADMIN_EMAIL;
  if (admin) {
    await send(admin, `Neue Bestellung ${order.id} (${eur(order.totalCents)})`,
      wrap(`<p style="font-size:14px">Neue Bestellung von ${esc(order.customer.name)} (${esc(order.customer.email)}).</p><table style="width:100%;font-size:14px">${rows}</table>${order.refCode ? `<p style="font-size:14px">Über Creator-Link ${esc(order.refCode)}.</p>` : ""}<p><a href="${siteUrl()}/admin">Zur Verwaltung</a></p>`));
  }
  return ok;
}

export async function sendLoginCode(email: string, code: string) {
  const link = `${siteUrl()}/konto/anmelden?e=${encodeURIComponent(email)}&c=${code}`;
  const html = wrap(`<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px">Dein Anmeldecode</h1>
<p style="font-size:14px;line-height:1.5;margin:0 0 20px">Gib diesen Code auf der Seite ein, auf der du die Anmeldung gestartet hast:</p>
<div style="font-size:34px;letter-spacing:.3em;font-family:Menlo,monospace;text-align:center;padding:18px;background:#fff;border:1px solid #E3DDD3">${code}</div>
<p style="text-align:center;margin:24px 0"><a href="${link}" style="display:inline-block;background:#1C1915;color:#FAF8F4;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:.16em">DIREKT ANMELDEN</a></p>
<p style="font-size:12px;color:#6E675E;line-height:1.5">Der Code ist 15 Minuten gültig. Wenn du dich nicht anmelden wolltest, ignoriere diese E-Mail einfach.</p>`);
  return send(email, `${code} ist dein CASTILLA-Anmeldecode`, html);
}

export async function sendShippingNotice(order: Order) {
  const rows = order.items.map((i) => `${i.qty} × ${esc(i.name)}, ${esc(i.size)}`).join("<br>");
  const html = wrap(`<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px">Deine Bestellung ist unterwegs</h1>
<p style="font-size:14px;line-height:1.5">Hallo ${esc(order.customer.name)}, deine Bestellung Nr. ${order.id} hat unser Lager verlassen.</p>
<p style="font-size:14px;line-height:1.5">${rows}</p>
<p style="font-size:14px"><a href="${siteUrl()}/konto" style="color:#6A4824">Zu deinem Konto</a></p>`);
  return send(order.customer.email, `Deine CASTILLA-Bestellung ${order.id} ist unterwegs`, html);
}

export async function sendWithdrawalReceipt(w: Withdrawal, settings: Settings) {
  const at = new Date(w.createdAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "long", timeStyle: "short" });
  const html = wrap(`<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px">Eingangsbestätigung deines Widerrufs</h1>
<p style="font-size:14px;line-height:1.5">Hallo ${esc(w.name)}, wir bestätigen den Eingang deiner Widerrufserklärung am <b>${at} Uhr</b>.</p>
<table style="width:100%;font-size:14px;line-height:1.5;border-top:1px solid #E3DDD3;border-bottom:1px solid #E3DDD3">
<tr><td style="padding:6px 0;width:40%">Inhalt</td><td>Widerruf des Kaufvertrags</td></tr>
<tr><td style="padding:6px 0">Bestellnummer</td><td>${esc(w.orderRef)}</td></tr>
<tr><td style="padding:6px 0">Betroffene Artikel</td><td>${w.items ? esc(w.items) : "gesamte Bestellung"}</td></tr>
<tr><td style="padding:6px 0">Name</td><td>${esc(w.name)}</td></tr>
<tr><td style="padding:6px 0">E-Mail</td><td>${esc(w.email)}</td></tr>
<tr><td style="padding:6px 0">Eingegangen am</td><td>${at} Uhr</td></tr></table>
<p style="font-size:14px;line-height:1.5">Bitte sende die Ware innerhalb von 14 Tagen an:<br>${esc(seller(settings).lines.join("\n")).replace(/\n/g, "<br>")}<br>Die unmittelbaren Kosten der Rücksendung trägst du. Den Kaufpreis erstatten wir nach Eingang der Ware.</p>`);
  const ok = await send(w.email, `Eingangsbestätigung deines Widerrufs (Bestellung ${w.orderRef})`, html);
  const admin = process.env.ADMIN_EMAIL || settings.legalEmail;
  if (admin) await send(admin, `Widerruf für Bestellung ${w.orderRef}`, wrap(`<p style="font-size:14px">${esc(w.name)} (${esc(w.email)}) hat am ${at} Uhr den Widerruf für Bestellung ${esc(w.orderRef)} erklärt.${w.items ? ` Artikel: ${esc(w.items)}` : ""}</p><p><a href="${siteUrl()}/admin">Zur Verwaltung</a></p>`));
  return ok;
}

export async function sendNewsletterConfirm(email: string, token: string) {
  const link = `${siteUrl()}/api/newsletter/bestaetigen?t=${token}`;
  const html = wrap(`<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px">Bitte bestätige deine Anmeldung</h1>
<p style="font-size:14px;line-height:1.5">Du hast dich für den CASTILLA-Newsletter angemeldet. Bitte bestätige das mit einem Klick, erst dann nehmen wir dich auf.</p>
<p style="text-align:center;margin:24px 0"><a href="${link}" style="display:inline-block;background:#1C1915;color:#FAF8F4;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:.16em">ANMELDUNG BESTÄTIGEN</a></p>
<p style="font-size:12px;color:#6E675E;line-height:1.5">Wenn du dich nicht angemeldet hast, ignoriere diese E-Mail. Du wirst dann nicht eingetragen.</p>`);
  return send(email, "Bitte bestätige deine Newsletter-Anmeldung", html);
}
