import Link from "next/link";

export const metadata = { title: "Newsletter", robots: { index: false } };

const TEXT: Record<string, [string, string]> = {
  ok: ["Danke!", "Deine Anmeldung ist bestätigt. Du erfährst als Erstes von neuen Drops."],
  ab: ["Abgemeldet", "Du bekommst keinen Newsletter mehr von uns."],
  fehler: ["Link ungültig", "Dieser Link ist nicht mehr gültig. Melde dich gern erneut an."],
};

export default async function Page({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "fehler" } = await searchParams;
  const [title, text] = TEXT[s] ?? TEXT.fehler;
  return (
    <main className="page-narrow" style={{ textAlign: "center" }}>
      <h1>{title}</h1>
      <p>{text}</p>
      <Link className="btn" href="/shop">Zum Shop</Link>
    </main>
  );
}
