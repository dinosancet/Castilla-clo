import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Versand & Zahlung" };

export default function Page() {
  return <LegalPage page="versand" />;
}
