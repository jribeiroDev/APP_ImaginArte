import type { PaymentStatus } from "./demo-data";

export function paidCentsFor(
  payment: PaymentStatus,
  totalCents: number,
  paidAmount?: number,
): number | null {
  if (payment !== "notpaidyet") return payment === "paid" ? totalCents : 0;
  if (typeof paidAmount !== "number" || !Number.isFinite(paidAmount))
    return null;
  const paidCents = Math.round(paidAmount * 100);
  return paidCents > 0 && paidCents < totalCents ? paidCents : null;
}
