import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Anmelden", robots: { index: false } };

export default async function MagicLinkPage({ searchParams }: { searchParams: Promise<{ e?: string; c?: string }> }) {
  const { e = "", c = "" } = await searchParams;
  return <LoginForm presetEmail={e} presetCode={c.replace(/\D/g, "").slice(0, 6)} />;
}
