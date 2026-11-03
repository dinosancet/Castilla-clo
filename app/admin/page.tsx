import { getOrders, getProducts, getSettings, getSubscribers } from "@/lib/data";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verwaltung", robots: { index: false } };

export default async function AdminPage() {
  const [products, orders, settings, subscribers] = await Promise.all([getProducts(), getOrders(), getSettings(), getSubscribers()]);
  return <AdminDashboard products={products} orders={orders} settings={settings} subscribers={subscribers} />;
}
