import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Datenschutzerklärung" };

export default function Page() {
  return <LegalPage page="datenschutz" />;
}
