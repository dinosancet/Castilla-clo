import Link from "next/link";
import { currentEmail } from "@/lib/customer";
import WithdrawalForm from "@/components/WithdrawalForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vertrag widerrufen", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ bestellung?: string }> }) {
  const { bestellung = "" } = await searchParams;
  const email = (await currentEmail()) ?? "";
  return (
    <main className="page-narrow">
      <h1>Vertrag widerrufen</h1>
      <p>Hier kannst du deinen Kaufvertrag innerhalb der Widerrufsfrist widerrufen. Eine Anmeldung ist nicht nötig. Gib an, welche Bestellung betroffen ist, und bestätige den Widerruf. Du erhältst sofort eine Eingangsbestätigung per E-Mail.</p>
      <p className="small">Alle Einzelheiten stehen in der <Link className="textlink" style={{ textTransform: "none", letterSpacing: 0 }} href="/widerruf">Widerrufsbelehrung</Link>.</p>
      <WithdrawalForm presetOrder={bestellung.slice(0, 40)} presetEmail={email} />
    </main>
  );
}
