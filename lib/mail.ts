import "server-only";
import { eur, type Order } from "./catalog";
import { linkUrl, partnerUrl, siteUrl } from "./site";
import type { BuyerLink } from "./affiliate";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sends e-mails via Resend (https://resend.com). Does nothing if RESEND_API_KEY / MAIL_FROM are not set. */
async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
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

export async function sendOrderConfirmation(order: Order, links: BuyerLink[], token: string | null, holdDays: number) {
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${i.qty} × ${esc(i.name)}, ${esc(i.size)}</td><td style="padding:6px 0;text-align:right">${eur(i.priceCents * i.qty)}</td></tr>`)
    .join("");
  const linkBlock = links.length
    ? `<div style="border:1px solid #E3DDD3;background:#fff;padding:20px;margin-top:28px">
<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:20px;margin:0 0 8px">Verdiene mit, wenn du CASTILLA zeigst</h2>
<p style="margin:0 0 14px;font-size:14px;line-height:1.5">Hier ist dein persönlicher Link. Teile ihn auf Instagram, TikTok oder wo du willst. Kauft jemand über deinen Link, bekommst du eine Provision.</p>
${links.map((l) => `<p style="margin:0 0 10px;font-size:14px"><b>${esc(l.productName)}</b><br><a href="${linkUrl(l.code)}" style="color:#6A4824">${linkUrl(l.code)}</a></p>`).join("")}
<p style="margin:14px 0 0;font-size:12px;color:#6E675E;line-height:1.5">Die Provision wird ${holdDays} Tage nach Versand der vermittelten Bestellung freigegeben, also nach Ablauf der Rückgabefrist. Bitte kennzeichne deine Beiträge als Werbung.${token ? ` Klicks, Verkäufe und Provision siehst du in deinem <a href="${partnerUrl(token)}" style="color:#6A4824">Partnerbereich</a>.` : ""}</p>
</div>`
    : "";
  const html = wrap(`<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px">Danke für deine Bestellung</h1>
<p style="font-size:14px;line-height:1.5;margin:0 0 20px">Hallo ${esc(order.customer.name)}, deine Bestellung Nr. ${order.id} ist bei uns eingegangen. Die Zahlungsdaten folgen in einer separaten E-Mail.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #E3DDD3;border-bottom:1px solid #E3DDD3">${rows}
<tr><td style="padding:10px 0;font-weight:bold">Gesamt</td><td style="padding:10px 0;text-align:right;font-weight:bold">${eur(order.totalCents)}</td></tr></table>
<p style="font-size:14px;line-height:1.5;margin:16px 0 0">Lieferadresse:<br>${esc(order.customer.name)}<br>${esc(order.customer.street)}<br>${esc(order.customer.zip)} ${esc(order.customer.city)}</p>
<p style="font-size:14px;margin:16px 0 0"><a href="${siteUrl()}/bestellung/${order.id}" style="color:#6A4824">Bestellung ansehen</a></p>
${linkBlock}`);
  const ok = await send(order.customer.email, `Deine CASTILLA-Bestellung ${order.id}`, html);

  const admin = process.env.ADMIN_EMAIL;
  if (admin) {
    await send(admin, `Neue Bestellung ${order.id} (${eur(order.totalCents)})`,
      wrap(`<p style="font-size:14px">Neue Bestellung von ${esc(order.customer.name)} (${esc(order.customer.email)}).</p><table style="width:100%;font-size:14px">${rows}</table>${order.refCode ? `<p style="font-size:14px">Über Creator-Link ${esc(order.refCode)}.</p>` : ""}<p><a href="${siteUrl()}/admin">Zur Verwaltung</a></p>`));
  }
  return ok;
}
