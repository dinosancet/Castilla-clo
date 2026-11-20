import { currentEmail, creatorTokenOf, getProfile, ordersOf } from "@/lib/customer";
import { getPartner } from "@/lib/affiliate";
import LoginForm from "@/components/LoginForm";
import AccountDashboard from "@/components/AccountDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mein Konto", robots: { index: false } };

export default async function AccountPage() {
  const email = await currentEmail();
  if (!email) return <LoginForm />;
  const [profile, orders, token] = await Promise.all([getProfile(email), ordersOf(email), creatorTokenOf(email)]);
  const partner = token ? await getPartner(token) : null;
  return (
    <AccountDashboard
      email={email}
      profile={profile ?? { id: "", email, name: "", street: "", zip: "", city: "", createdAt: new Date().toISOString() }}
      orders={orders}
      partner={partner}
    />
  );
}
