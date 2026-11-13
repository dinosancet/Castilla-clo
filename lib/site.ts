/** Public base URL of the shop, e.g. https://castilla-clo.vercel.app (Vercel sets VERCEL_PROJECT_PRODUCTION_URL). */
export function siteUrl() {
  const explicit = process.env.SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}
export const linkUrl = (code: string) => `${siteUrl()}/r/${code}`;
export const partnerUrl = (token: string) => `${siteUrl()}/partner?t=${token}`;
export const REF_COOKIE = "castilla_ref";
