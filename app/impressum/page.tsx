import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impressum" };

export default function Page() {
  return <LegalPage page="impressum" />;
}
