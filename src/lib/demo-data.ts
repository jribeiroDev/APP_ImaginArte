export type OrderStatus = "new" | "production" | "ready" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";

export type Product = { id: string; name: string; price: number; category: string; color: string; active: boolean; stock: number };
export type Customer = { id: string; name: string; phone: string; email: string; city: string; address?: string; postalCode?: string };
export type Order = { id: string; customerId: string; productIds: string[]; quantities?: Record<string, number>; date: string; delivery: string; status: OrderStatus; payment: PaymentStatus; total: number; notes?: string };

export const products: Product[] = [
  { id: "p1", name: "Caneca personalizada", price: 12, category: "Canecas", color: "#eaded3", active: true, stock: 0 },
  { id: "p2", name: "Caixa de madeira personalizada", price: 15, category: "Caixas", color: "#d9b48d", active: true, stock: 0 },
  { id: "p3", name: "Puzzle personalizado", price: 18, category: "Presentes", color: "#e4c2a7", active: true, stock: 0 },
  { id: "p4", name: "Placa de casamento", price: 22, category: "Decoração", color: "#e9d2b7", active: true, stock: 0 },
  { id: "p5", name: "Porta-chaves", price: 9, category: "Presentes", color: "#c9a879", active: true, stock: 0 },
];

export const customers: Customer[] = [
  { id: "c1", name: "Marta Silva", phone: "912 345 678", email: "marta@email.pt", city: "Braga", address: "Rua das Flores, nº 12", postalCode: "4700-123" },
  { id: "c2", name: "Joana Costa", phone: "913 456 789", email: "joana.costa@email.com", city: "Braga", address: "Avenida Central, nº 8", postalCode: "4700-001" },
  { id: "c3", name: "Pedro Alves", phone: "914 567 890", email: "pedro.alves@email.com", city: "Guimarães", address: "Rua de São Bento, nº 4", postalCode: "4800-123" },
  { id: "c4", name: "Ana Ribeiro", phone: "915 678 901", email: "ana@email.com", city: "Porto", address: "Rua de Cedofeita, nº 21", postalCode: "4050-174" },
  { id: "c5", name: "Tiago Mendes", phone: "916 789 012", email: "tiago@email.com", city: "Braga", address: "Largo do Paço, nº 3", postalCode: "4700-320" },
];

export const orders: Order[] = [
  { id: "6", customerId: "c1", productIds: ["p1"], date: "01 Out", delivery: "25 Out", status: "new", payment: "pending", total: 12 },
  { id: "5", customerId: "c2", productIds: ["p2"], date: "01 Out", delivery: "18 Out", status: "production", payment: "paid", total: 15 },
  { id: "4", customerId: "c3", productIds: ["p2"], date: "01 Out", delivery: "12 Out", status: "ready", payment: "paid", total: 15 },
  { id: "3", customerId: "c4", productIds: ["p4"], date: "30 Set", delivery: "30 Set", status: "shipped", payment: "paid", total: 22 },
  { id: "2", customerId: "c5", productIds: ["p3"], date: "30 Set", delivery: "22 Out", status: "delivered", payment: "paid", total: 18 },
  { id: "1", customerId: "c4", productIds: ["p5"], date: "29 Set", delivery: "29 Set", status: "cancelled", payment: "refunded", total: 9 },
];

export const statusMeta: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  new: { label: "Nova encomenda", color: "coral", icon: "🛒" },
  production: { label: "Em produção", color: "gold", icon: "⚙" },
  ready: { label: "Pronta para envio", color: "green", icon: "▰" },
  shipped: { label: "Enviada", color: "blue", icon: "▣" },
  delivered: { label: "Entregue", color: "green", icon: "✓" },
  cancelled: { label: "Cancelada", color: "gray", icon: "×" },
};
