import type { Metadata, Viewport } from "next";
import "@fontsource/cinzel/400.css";
import "@fontsource/cinzel/500.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "./globals.css";
import { getProducts, getSettings } from "@/lib/data";
import { CartProvider } from "@/components/Cart";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "CASTILLA", template: "%s | CASTILLA" },
  description: "CASTILLA: Kleidung mit Haltung, in kleinen Auflagen.",
  icons: { icon: "/logo-temple-sm.webp" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  return (
    <html lang="de">
      <body>
        <CartProvider terms={{ shippingCents: settings.shippingCents, freeShippingFromCents: settings.freeShippingFromCents, smallBusiness: settings.smallBusiness }}>
          {settings.banner ? <div className="announce">{settings.banner}</div> : null}
          <Header products={products} />
          {children}
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
