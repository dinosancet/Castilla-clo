import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Widerrufsbelehrung" };

export default function Page() {
  return (
    <LegalPage page="widerruf">
      <p style={{ marginTop: 28 }}><Link className="btn" href="/widerrufen">Vertrag widerrufen</Link></p>
    </LegalPage>
  );
}
