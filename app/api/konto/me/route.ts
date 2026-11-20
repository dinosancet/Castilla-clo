import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { currentEmail, getProfile } from "@/lib/customer";

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: await getProfile(email) });
}

export async function PUT(req: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Bitte melde dich erneut an." }, { status: 401 });
  const parsed = z
    .object({ name: z.string().trim().max(120), street: z.string().trim().max(160), zip: z.string().trim().max(12), city: z.string().trim().max(80) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte prüfe deine Angaben." }, { status: 400 });
  const d = parsed.data;
  await sql()`UPDATE customers SET name = ${d.name}, street = ${d.street}, zip = ${d.zip}, city = ${d.city} WHERE email = ${email}`;
  return NextResponse.json({ ok: true });
}
