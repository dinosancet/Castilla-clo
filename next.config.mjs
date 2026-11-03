/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Schöne Adressen ohne Ordner mit eckigen Klammern (die lassen sich im GitHub-Browser nicht hochladen).
  async rewrites() {
    return [
      { source: "/shop/:kategorie", destination: "/shop?kategorie=:kategorie" },
      { source: "/produkt/:id", destination: "/produkt?id=:id" },
      { source: "/bestellung/:id", destination: "/bestellung?id=:id" },
    ];
  },
};
export default nextConfig;
