import { eur, type LegalPage, type Settings } from "./catalog";

/**
 * Generated legal texts in a tiny markup: "## " heading, "### " subheading, "- " list item,
 * blank line = new paragraph. The admin can replace any page with an own text (same markup).
 *
 * These are drafts based on common practice and the statutory model texts. They are not legal advice.
 */

export function seller(s: Settings) {
  const name = [s.legalBusiness, s.legalOwner ? `Inhaber ${s.legalOwner}` : ""].filter(Boolean).join(", ");
  return { name: name || "CASTILLA", lines: [name, s.legalStreet, s.legalZipCity, "Deutschland"].filter(Boolean) };
}

export function missingLegalData(s: Settings) {
  const missing: string[] = [];
  if (!s.legalOwner.trim()) missing.push("Vor- und Nachname des Inhabers");
  if (!s.legalStreet.trim()) missing.push("Straße");
  if (!s.legalZipCity.trim()) missing.push("PLZ und Ort");
  if (!s.legalEmail.trim()) missing.push("E-Mail");
  return missing;
}

const shippingLine = (s: Settings) =>
  s.freeShippingFromCents > 0
    ? `Die Versandkosten innerhalb Deutschlands betragen ${eur(s.shippingCents)} pro Bestellung. Ab einem Bestellwert von ${eur(s.freeShippingFromCents)} liefern wir versandkostenfrei.`
    : `Die Versandkosten innerhalb Deutschlands betragen ${eur(s.shippingCents)} pro Bestellung.`;

const priceLine = (s: Settings) =>
  s.smallBusiness
    ? "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und daher auch nicht ausgewiesen."
    : "Alle Preise sind Endpreise und enthalten die gesetzliche Umsatzsteuer.";

function impressum(s: Settings) {
  const v = seller(s);
  return `## Angaben gemäß § 5 DDG

${v.lines.join("\n")}

## Kontakt

E-Mail: ${s.legalEmail}${s.legalPhone ? `\nTelefon: ${s.legalPhone}` : ""}

${s.vatId ? `## Umsatzsteuer\n\nUmsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: ${s.vatId}\n\n` : s.smallBusiness ? `## Umsatzsteuer\n\nKleinunternehmer gemäß § 19 UStG.\n\n` : ""}## Verbraucherstreitbeilegung

Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Für Beschwerden erreichst du uns unter ${s.legalEmail}.`;
}

function versand(s: Settings) {
  return `## Liefergebiet

Wir liefern ausschließlich innerhalb Deutschlands.

## Versandkosten

${shippingLine(s)}

## Lieferzeit

Die Lieferzeit beträgt 2 bis 4 Werktage nach Zahlungseingang, soweit beim Artikel nichts anderes angegeben ist.

## Zahlung

Du zahlst per Vorkasse (Überweisung). Die Bankverbindung erhältst du mit der Bestellbestätigung per E-Mail. Wir versenden die Ware nach Eingang deiner Zahlung.

## Rücksendungen

Du hast ein 14-tägiges Widerrufsrecht, Einzelheiten stehen in der Widerrufsbelehrung. Die unmittelbaren Kosten der Rücksendung trägst du. Den Widerruf kannst du jederzeit über die Schaltfläche „Vertrag widerrufen“ unten auf jeder Seite erklären.

## Preise

${priceLine(s)}`;
}

function agb(s: Settings) {
  const v = seller(s);
  return `## § 1 Geltungsbereich

Diese Allgemeinen Geschäftsbedingungen gelten für alle Bestellungen, die Verbraucher über den Onlineshop CASTILLA abschließen. Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können.

## § 2 Vertragspartner

Der Kaufvertrag kommt zustande mit ${v.lines.join(", ")}, E-Mail: ${s.legalEmail}.

## § 3 Vertragsschluss

Die Darstellung der Produkte im Onlineshop ist kein rechtlich bindendes Angebot, sondern eine Aufforderung zur Bestellung.

Du legst Artikel in den Warenkorb, gibst an der Kasse deine Daten ein und klickst auf „Zahlungspflichtig bestellen“. Damit gibst du ein verbindliches Angebot zum Kauf der Waren im Warenkorb ab. Vor dem Absenden kannst du deine Angaben jederzeit prüfen und korrigieren.

Wir bestätigen den Eingang deiner Bestellung unmittelbar per E-Mail. Mit dieser Bestellbestätigung, die auch die Zahlungsaufforderung enthält, nehmen wir dein Angebot an und der Kaufvertrag kommt zustande.

## § 4 Vertragssprache und Speicherung

Vertragssprache ist Deutsch. Wir speichern den Vertragstext und senden dir die Bestelldaten und diese AGB per E-Mail zu. Mit einem Kundenkonto kannst du deine Bestellungen außerdem jederzeit unter „Mein Konto“ einsehen.

## § 5 Preise und Versandkosten

${priceLine(s)} ${shippingLine(s)} Wir liefern ausschließlich innerhalb Deutschlands.

## § 6 Zahlung

Die Zahlung erfolgt per Vorkasse (Überweisung). Der Kaufpreis ist mit Vertragsschluss fällig. Die Bankverbindung erhältst du mit der Bestellbestätigung.

## § 7 Lieferung

Wir versenden die Ware innerhalb von 2 bis 4 Werktagen nach Zahlungseingang, soweit beim Artikel nichts anderes angegeben ist. Geht die Zahlung nicht innerhalb von 10 Tagen ein, behalten wir uns vor, die Bestellung zu stornieren.

## § 8 Eigentumsvorbehalt

Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.

## § 9 Widerrufsrecht

Als Verbraucher hast du ein gesetzliches Widerrufsrecht. Die Einzelheiten findest du in der Widerrufsbelehrung. Den Widerruf kannst du über die Schaltfläche „Vertrag widerrufen“ auf unserer Website erklären. Die unmittelbaren Kosten der Rücksendung trägst du.

## § 10 Gewährleistung

Es gelten die gesetzlichen Mängelhaftungsrechte.

## § 11 Kundenkonto

Du kannst ein Kundenkonto nutzen, indem du dich mit deiner E-Mail-Adresse und einem per E-Mail zugesandten Code anmeldest. Bestellungen, die mit dieser E-Mail-Adresse aufgegeben wurden, werden dem Konto zugeordnet.

## § 12 Partnerprogramm

Für die Teilnahme am Partnerprogramm (Provisionslinks) gelten zusätzlich die Teilnahmebedingungen für das Partnerprogramm.

## § 13 Streitbeilegung

Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

## § 14 Schlussbestimmungen

Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz durch zwingende Bestimmungen des Rechts des Staates entzogen wird, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat.`;
}

export function widerrufText(s: Settings) {
  const v = seller(s);
  return `## Widerrufsrecht

Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.

Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast bzw. hat. Bei mehreren Waren einer Bestellung, die getrennt geliefert werden, beginnt die Frist an dem Tag, an dem du oder ein von dir benannter Dritter die letzte Ware in Besitz genommen hast bzw. hat.

Um dein Widerrufsrecht auszuüben, musst du uns (${v.lines.join(", ")}, E-Mail: ${s.legalEmail}) mittels einer eindeutigen Erklärung (z. B. eine E-Mail oder ein mit der Post versandter Brief) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür auch die Widerrufsfunktion auf unserer Website nutzen (Schaltfläche „Vertrag widerrufen“). Du kannst außerdem das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.

Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.

## Folgen des Widerrufs

Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet. Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt ist.

Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest.

Du trägst die unmittelbaren Kosten der Rücksendung der Waren.

Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.

## Muster-Widerrufsformular

(Wenn du den Vertrag widerrufen willst, dann fülle bitte dieses Formular aus und sende es zurück.)

An ${v.lines.join(", ")}, E-Mail: ${s.legalEmail}

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*):

Bestellt am (*) / erhalten am (*):

Name des/der Verbraucher(s):

Anschrift des/der Verbraucher(s):

Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):

Datum:

(*) Unzutreffendes streichen.`;
}

function datenschutz(s: Settings) {
  const v = seller(s);
  return `## 1. Verantwortlicher

${v.lines.join("\n")}
E-Mail: ${s.legalEmail}

## 2. Allgemeines

Wir verarbeiten personenbezogene Daten nur, soweit das für den Betrieb des Shops, die Abwicklung deiner Bestellungen und die unten genannten Zwecke nötig ist. Wir setzen keine Analyse- oder Werbe-Tracker ein und geben keine Daten zu Werbezwecken an Dritte weiter.

## 3. Hosting und Server-Logs

Der Shop wird bei Vercel Inc. (USA) gehostet. Beim Aufruf der Website werden technisch notwendige Daten verarbeitet (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser), um die Website auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb). Vercel ist nach dem EU-US Data Privacy Framework zertifiziert; zusätzlich gelten Standardvertragsklauseln.

## 4. Datenbank und Dateispeicher

Bestell-, Kunden- und Produktdaten speichern wir in einer Datenbank des Anbieters Neon mit Serverstandort Frankfurt am Main. Produktfotos liegen im Dateispeicher von Vercel (Vercel Blob). Mit den Anbietern bestehen Verträge zur Auftragsverarbeitung.

## 5. Bestellungen

Für deine Bestellung verarbeiten wir Name, E-Mail-Adresse, Lieferadresse und die bestellten Artikel. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Die Daten werden nach den handels- und steuerrechtlichen Aufbewahrungsfristen (bis zu 10 Jahre) gelöscht.

## 6. E-Mail-Versand

Bestellbestätigungen, Versandinformationen, Anmeldecodes und Newsletter versenden wir über den Dienst Resend (USA). Dabei werden deine E-Mail-Adresse und der Inhalt der E-Mail verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bzw. für den Newsletter deine Einwilligung. Es gelten Standardvertragsklauseln.

## 7. Kundenkonto

Wenn du dich unter „Mein Konto“ anmeldest, senden wir dir einen einmaligen Code an deine E-Mail-Adresse. Wir speichern deine E-Mail-Adresse, optional Name und Adresse sowie den Zeitpunkt der letzten Anmeldung. Bestellungen mit derselben E-Mail-Adresse werden deinem Konto zugeordnet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Du kannst die Löschung deines Kontos jederzeit per E-Mail verlangen.

## 8. Newsletter

Für den Newsletter verwenden wir das Double-Opt-in-Verfahren: Du erhältst nach der Anmeldung eine E-Mail, in der du die Anmeldung bestätigst. Wir speichern deine E-Mail-Adresse sowie die Zeitpunkte von Anmeldung und Bestätigung. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit über den Abmeldelink in jeder E-Mail widerrufen kannst.

## 9. Partnerprogramm (Provisionslinks)

Kunden, die ein Produkt mit Provision kaufen, erhalten einen persönlichen Link. Ruft jemand einen solchen Link auf, setzen wir ein Cookie („castilla_ref“) mit der Kennung des Links für ${s.refCookieDays} Tage, damit ein späterer Kauf dem Partner zugeordnet werden kann. Zur Zählung der Klicks speichern wir einen täglich wechselnden, nicht umkehrbaren Hashwert aus IP-Adresse und Browserkennung, nicht die IP-Adresse selbst. Bei Partnern verarbeiten wir zusätzlich die von ihnen angegebenen Auszahlungsdaten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f DSGVO.

## 10. Cookies und lokale Speicherung

Wir verwenden nur folgende Speicherungen: den Warenkorb im lokalen Speicher deines Browsers, ein Anmelde-Cookie für dein Kundenkonto, ein Anmelde-Cookie für die Shop-Verwaltung sowie das unter Ziffer 9 beschriebene Partner-Cookie.

## 11. Schriftarten

Die verwendeten Schriftarten sind lokal in den Shop eingebunden. Es findet keine Verbindung zu Servern von Google statt.

## 12. Deine Rechte

Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung (Art. 15 bis 21 DSGVO). Erteilte Einwilligungen kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Wende dich dazu an ${s.legalEmail}. Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.`;
}

function partnerbedingungen(s: Settings) {
  return `## Teilnahme

Am Partnerprogramm von CASTILLA nimmt automatisch teil, wer ein Produkt kauft, für das eine Provision angeboten wird. Der Partner erhält einen persönlichen Link pro Produkt. Die Teilnahme ist freiwillig und kostenlos. Partner müssen volljährig sein.

## Provision

Ruft jemand den Link auf und kauft innerhalb von ${s.refCookieDays} Tagen das zugehörige Produkt, erhält der Partner die beim Produkt angegebene Provision in Prozent des Artikelpreises. Versandkosten zählen nicht dazu.

Die Provision ist zunächst vorgemerkt. Sie wird ${s.commissionHoldDays} Tage nach Versand der vermittelten Bestellung freigegeben, wenn die Bestellung nicht storniert, widerrufen oder zurückgeschickt wurde.

## Ausschlüsse

Keine Provision gibt es für Käufe über den eigenen Link, für Käufe an die eigene Lieferadresse, für manipulierte Klicks oder für Werbung mit falschen Versprechen, Spam oder bezahlter Suchmaschinenwerbung auf den Markennamen. Bei Verstößen können wir den Partnerzugang sperren und nicht ausgezahlte Provisionen verfallen lassen.

## Kennzeichnung

Beiträge mit Partnerlinks sind Werbung und müssen deutlich als solche gekennzeichnet werden (z. B. „Werbung“ oder „Anzeige“).

## Auszahlung

Die Auszahlung freigegebener Provisionen erfolgt per Überweisung oder PayPal an die im Konto hinterlegten Daten. Partner sind für die Versteuerung ihrer Einnahmen selbst verantwortlich.

## Änderungen

Wir können das Programm, die Provisionssätze und diese Bedingungen mit Wirkung für die Zukunft ändern oder das Programm beenden. Bereits vorgemerkte Provisionen bleiben davon unberührt.`;
}

export function legalText(page: LegalPage, s: Settings) {
  const custom = s.legalOverrides?.[page]?.trim();
  if (custom) return custom;
  switch (page) {
    case "impressum": return impressum(s);
    case "datenschutz": return datenschutz(s);
    case "agb": return agb(s);
    case "widerruf": return widerrufText(s);
    case "versand": return versand(s);
    case "partnerbedingungen": return partnerbedingungen(s);
  }
}

/** Default (generated) text, used to prefill the admin editor. */
export function generatedText(page: LegalPage, s: Settings) {
  return legalText(page, { ...s, legalOverrides: {} });
}

/** Plain-text to minimal HTML, for e-mails. */
export function legalHtml(text: string) {
  const esc = (x: string) => x.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return text
    .split(/\n{2,}/)
    .map((b) => {
      if (b.startsWith("## ")) return `<h3 style="font-size:14px;margin:16px 0 6px">${esc(b.slice(3))}</h3>`;
      return `<p style="font-size:12px;line-height:1.5;margin:0 0 8px;color:#444">${esc(b).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}
