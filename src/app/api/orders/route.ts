import { NextResponse } from "next/server";
import { eq, inArray, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, orderItems, orders, products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { customerId?: string; productIds?: string[]; quantities?: Record<string, number>; delivery?: string; notes?: string; payment?: "pending" | "paid" };
    const productIds = [...new Set(body.productIds ?? [])];
    if (!body.customerId || !productIds.length) return NextResponse.json({ error: "Seleciona um cliente e pelo menos um produto." }, { status: 400 });
    const customer = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, body.customerId)).limit(1);
    if (!customer[0]) return NextResponse.json({ error: "O cliente selecionado não existe na base de dados." }, { status: 400 });
    const productRows = await db.select().from(products).where(inArray(products.id, productIds));
    if (productRows.length !== productIds.length) return NextResponse.json({ error: "Um dos produtos selecionados não existe na base de dados." }, { status: 400 });
    const quantities = Object.fromEntries(productRows.map((product) => [product.id, Math.max(1, Math.floor(Number(body.quantities?.[product.id] ?? 1)))]));
    const totalCents = productRows.reduce((sum, product) => sum + product.priceCents * quantities[product.id], 0);
    const lastNumber = await db.select({ value: max(orders.orderNumber) }).from(orders);
    const orderNumber = (lastNumber[0]?.value ?? 1258) + 1;
    const deliveryDate = body.delivery ? new Date(`${body.delivery}T12:00:00`) : null;
    if (deliveryDate && Number.isNaN(deliveryDate.getTime())) return NextResponse.json({ error: "A data de entrega não é válida." }, { status: 400 });
    const inserted = await db.insert(orders).values({ orderNumber, customerId: body.customerId, payment: body.payment === "paid" ? "paid" : "pending", deliveryDate, notes: body.notes?.trim() || null, totalCents }).returning({ id: orders.id, orderNumber: orders.orderNumber });
    const order = inserted[0];
    await db.insert(orderItems).values(productRows.map((product) => ({ orderId: order.id, productId: product.id, productName: product.name, unitPriceCents: product.priceCents, quantity: quantities[product.id], totalCents: product.priceCents * quantities[product.id] })));
    return NextResponse.json({ order: { id: String(order.orderNumber) } }, { status: 201 });
  } catch (error) {
    console.error("Erro ao guardar encomenda", error);
    return NextResponse.json({ error: "Não foi possível guardar a encomenda na base de dados." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { orderNumber?: string; customerId?: string; productIds?: string[]; quantities?: Record<string, number>; delivery?: string; notes?: string };
    const productIds = [...new Set(body.productIds ?? [])];
    if (!body.orderNumber || !body.customerId || !productIds.length) return NextResponse.json({ error: "Seleciona um cliente e pelo menos um produto." }, { status: 400 });
    const productRows = await db.select().from(products).where(inArray(products.id, productIds));
    if (productRows.length !== productIds.length) return NextResponse.json({ error: "Um dos produtos selecionados não existe." }, { status: 400 });
    const quantities = Object.fromEntries(productRows.map((product) => [product.id, Math.max(1, Math.floor(Number(body.quantities?.[product.id] ?? 1)))]));
    const totalCents = productRows.reduce((sum, product) => sum + product.priceCents * quantities[product.id], 0);
    const deliveryDate = body.delivery ? new Date(`${body.delivery}T12:00:00`) : null;
    const updated = await db.update(orders).set({ customerId: body.customerId, deliveryDate, notes: body.notes?.trim() || null, totalCents, updatedAt: new Date() }).where(eq(orders.orderNumber, Number(body.orderNumber))).returning({ id: orders.id });
    if (!updated[0]) return NextResponse.json({ error: "Encomenda não encontrada." }, { status: 404 });
    await db.delete(orderItems).where(eq(orderItems.orderId, updated[0].id));
    await db.insert(orderItems).values(productRows.map((product) => ({ orderId: updated[0].id, productId: product.id, productName: product.name, unitPriceCents: product.priceCents, quantity: quantities[product.id], totalCents: product.priceCents * quantities[product.id] })));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao atualizar encomenda", error);
    return NextResponse.json({ error: "Não foi possível guardar as alterações da encomenda." }, { status: 500 });
  }
}
