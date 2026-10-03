import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { financeSettings, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

async function getSettings() {
  const row = await db!.select().from(financeSettings).where(eq(financeSettings.id, 1)).limit(1);
  return row[0] ?? { bankCents: 0, homeCents: 0 };
}

export async function GET() {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const [settings, orderRows] = await Promise.all([getSettings(), db.select({ totalCents: orders.totalCents, payment: orders.payment }).from(orders)]);
    const ordersTotalCents = orderRows.reduce((sum, order) => sum + order.totalCents, 0);
    const missingCents = orderRows.filter((order) => order.payment === "pending").reduce((sum, order) => sum + order.totalCents, 0);
    return NextResponse.json({ bank: settings.bankCents / 100, home: settings.homeCents / 100, ordersTotal: ordersTotalCents / 100, total: (settings.bankCents + settings.homeCents + ordersTotalCents) / 100, missing: missingCents / 100 });
  } catch (error) {
    console.error("Erro ao carregar finanças", error);
    return NextResponse.json({ error: "Não foi possível carregar o resumo financeiro." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { bank?: number; home?: number };
    const bankCents = Math.round(Number(body.bank) * 100);
    const homeCents = Math.round(Number(body.home) * 100);
    if (!Number.isFinite(bankCents) || !Number.isFinite(homeCents) || bankCents < 0 || homeCents < 0) return NextResponse.json({ error: "Indica valores financeiros válidos." }, { status: 400 });
    await db.insert(financeSettings).values({ id: 1, bankCents, homeCents }).onConflictDoUpdate({ target: financeSettings.id, set: { bankCents, homeCents, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao guardar finanças", error);
    return NextResponse.json({ error: "Não foi possível guardar os valores financeiros." }, { status: 500 });
  }
}
