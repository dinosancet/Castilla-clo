import type { Metadata, Viewport } from "next";
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <CartProvider>
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
