import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: "A base de dados não está configurada." }, { status: 500 });
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) return NextResponse.json({ error: "Introduz o email e a palavra-passe." }, { status: 400 });

    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = result[0];
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!valid) return NextResponse.json({ error: "Email ou palavra-passe inválidos." }, { status: 401 });

    const sessionId = randomBytes(32).toString("hex");
    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    response.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Erro no login", error);
    return NextResponse.json({ error: "Não foi possível iniciar sessão." }, { status: 500 });
  }
}
