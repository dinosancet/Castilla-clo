import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "AGB" };

export default function Page() {
  return <LegalPage page="agb" />;
}
