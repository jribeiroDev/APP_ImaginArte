import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type ProductBody = { id?: string; name?: string; price?: number; category?: string; active?: boolean };

function responseProduct(product: typeof products.$inferSelect) {
  return { id: product.id, name: product.name, price: product.priceCents / 100, category: product.description ?? "Produto", color: "#eaded3", active: product.active === 1 };
}

export async function POST(request: Request) {
  return saveProduct(request, false);
}

export async function PATCH(request: Request) {
  return saveProduct(request, true);
}

export async function DELETE(request: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { id?: string };
    if (!body.id) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
    await db.delete(products).where(eq(products.id, body.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao remover produto", error);
    return NextResponse.json({ error: "Não é possível remover este produto porque já está associado a uma encomenda." }, { status: 409 });
  }
}

async function saveProduct(request: Request, editing: boolean) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as ProductBody;
    const name = body.name?.trim();
    const price = Number(body.price);
    if ((editing && !body.id) || !name || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Indica um nome e um preço válido." }, { status: 400 });
    const values = { name, description: body.category?.trim() || "Produto", priceCents: Math.round(price * 100), active: body.active === false ? 0 : 1 };
    const result = editing
      ? await db.update(products).set(values).where(eq(products.id, body.id as string)).returning()
      : await db.insert(products).values(values).returning();
    if (!result[0]) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    return NextResponse.json({ product: responseProduct(result[0]) }, { status: editing ? 200 : 201 });
  } catch (error) {
    console.error("Erro ao guardar produto", error);
    return NextResponse.json({ error: "Não foi possível guardar o produto." }, { status: 500 });
  }
}
