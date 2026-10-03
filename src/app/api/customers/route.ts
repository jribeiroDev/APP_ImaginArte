import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { name?: string; email?: string; phone?: string; city?: string; address?: string; postalCode?: string };
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "O nome do cliente é obrigatório." }, { status: 400 });
    const result = await db.insert(customers).values({ name, email: body.email?.trim() || null, phone: body.phone?.trim() || null, city: body.city?.trim() || null, address: body.address?.trim() || null, postalCode: body.postalCode?.trim() || null }).returning();
    const customer = result[0];
    return NextResponse.json({ customer: { id: customer.id, name: customer.name, email: customer.email ?? "", phone: customer.phone ?? "", city: customer.city ?? "", address: customer.address ?? undefined, postalCode: customer.postalCode ?? undefined } }, { status: 201 });
  } catch (error) {
    console.error("Erro ao registar cliente", error);
    return NextResponse.json({ error: "Não foi possível registar o cliente." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { id?: string; name?: string; email?: string; phone?: string; city?: string; address?: string; postalCode?: string };
    const name = body.name?.trim();
    if (!body.id || !name) return NextResponse.json({ error: "O id e o nome do cliente são obrigatórios." }, { status: 400 });
    const result = await db.update(customers).set({ name, email: body.email?.trim() || null, phone: body.phone?.trim() || null, city: body.city?.trim() || null, address: body.address?.trim() || null, postalCode: body.postalCode?.trim() || null }).where(eq(customers.id, body.id)).returning();
    const customer = result[0];
    if (!customer) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    return NextResponse.json({ customer: { id: customer.id, name: customer.name, email: customer.email ?? "", phone: customer.phone ?? "", city: customer.city ?? "", address: customer.address ?? undefined, postalCode: customer.postalCode ?? undefined } });
  } catch (error) {
    console.error("Erro ao atualizar cliente", error);
    return NextResponse.json({ error: "Não foi possível atualizar o cliente." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { id?: string };
    if (!body.id) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    await db.delete(customers).where(eq(customers.id, body.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao remover cliente", error);
    return NextResponse.json({ error: "Não é possível remover este cliente porque já tem encomendas associadas." }, { status: 409 });
  }
}
