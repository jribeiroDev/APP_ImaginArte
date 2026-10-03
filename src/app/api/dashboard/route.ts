import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, orderItems, orders, products } from "@/lib/db/schema";
import { customers as demoCustomers, orders as demoOrders, products as demoProducts } from "@/lib/demo-data";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const formatDate = (value: Date | null, fallback = "") => value ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(value).replace(" de ", " ") : fallback;

export async function GET() {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ source: "demo", customers: demoCustomers, products: demoProducts, orders: demoOrders });
    }
    return NextResponse.json({ error: "DATABASE_URL não está configurada na Vercel." }, { status: 500 });
  }

  try {
    const [customerRows, productRows, orderRows, itemRows] = await Promise.all([
      db.select().from(customers).orderBy(asc(customers.name)),
      db.select().from(products).orderBy(asc(products.name)),
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(orderItems),
    ]);

    return NextResponse.json({
      source: "database",
      customers: customerRows.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "", city: customer.city ?? "", address: customer.address ?? undefined, postalCode: customer.postalCode ?? undefined })),
      products: productRows.map((product) => ({ id: product.id, name: product.name, price: product.priceCents / 100, category: product.description ?? "Produto", color: "#eaded3", active: product.active === 1, stock: product.stock })),
      orders: orderRows.map((order) => ({
        id: String(order.orderNumber),
        databaseId: order.id,
        customerId: order.customerId,
        productIds: itemRows.filter((item) => item.orderId === order.id).map((item) => item.productId),
        quantities: Object.fromEntries(itemRows.filter((item) => item.orderId === order.id).map((item) => [item.productId, item.quantity])),
        date: formatDate(order.orderDate, "Hoje"),
        delivery: formatDate(order.deliveryDate),
        status: order.status,
        payment: order.payment,
        total: order.totalCents / 100,
        notes: order.notes ?? undefined,
      })),
    });
  } catch (error) {
    console.error("Erro ao carregar dados do Neon", error);
    return NextResponse.json({ error: "Não foi possível ligar à base de dados Neon." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "DATABASE_URL não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { orderNumber?: string; status?: "new" | "production" | "ready" | "shipped" | "delivered" | "cancelled" };
    if (!body.orderNumber || !body.status) return NextResponse.json({ error: "orderNumber e status são obrigatórios." }, { status: 400 });
    await db.update(orders).set({ status: body.status, updatedAt: new Date() }).where(eq(orders.orderNumber, Number(body.orderNumber)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao atualizar encomenda", error);
    return NextResponse.json({ error: "Não foi possível atualizar a encomenda." }, { status: 500 });
  }
}
