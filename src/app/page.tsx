"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Home,
  Mail,
  MapPin,
  Menu,
  Moon,
  Package,
  PenLine,
  Phone,
  Plus,
  Search,
  Save,
  Settings2,
  ShoppingBag,
  Trash2,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  products as initialProducts,
  statusMeta,
  type Customer,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type Product,
} from "@/lib/demo-data";

type Tab = "home" | "orders" | "products" | "more" | "customers";
type FinanceSummary = {
  bank: number;
  home: number;
  ordersTotal: number;
  total: number;
  missing: number;
};
const money = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(
    value,
  );

function StatusIcon({ status }: { status: OrderStatus }) {
  const props = { size: 16, strokeWidth: 2.2 };
  if (status === "new") return <ShoppingBag {...props} />;
  if (status === "production") return <Settings2 {...props} />;
  if (status === "ready") return <Package {...props} />;
  if (status === "shipped") return <Truck {...props} />;
  return status === "delivered" ? <Check {...props} /> : <X {...props} />;
}
function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={`status-badge status-${meta.color}`}>
      <StatusIcon status={status} />
      {meta.label}
    </span>
  );
}
function ProductThumb({
  productId,
  catalog = initialProducts,
}: {
  productId: string;
  catalog?: Product[];
}) {
  const product =
    catalog.find((item) => item.id === productId) ?? initialProducts[0];
  return (
    <div className="product-thumb" style={{ background: product.color }}>
      <Package size={21} strokeWidth={1.6} />
    </div>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [finance, setFinance] = useState<FinanceSummary>({
    bank: 0,
    home: 0,
    ordersTotal: 0,
    total: 0,
    missing: 0,
  });
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [dark, setDark] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const themeReady = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("imaginarte-theme");
    const initialDark = stored ? stored === "dark" : true;
    queueMicrotask(() => {
      themeReady.current = true;
      setDark(initialDark);
    });
  }, []);
  useEffect(() => {
    if (!themeReady.current) return;
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("imaginarte-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => setAuthenticated(response.ok))
      .catch(() => setAuthenticated(false));
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    Promise.all([
      fetch("/api/dashboard", { cache: "no-store" }),
      fetch("/api/finance", { cache: "no-store" }),
    ])
      .then(async ([dashboardResponse, financeResponse]) => {
        const data = (await dashboardResponse.json()) as {
          customers?: Customer[];
          products?: Product[];
          orders?: Order[];
          error?: string;
        };
        const financeData = (await financeResponse.json()) as FinanceSummary & {
          error?: string;
        };
        if (!dashboardResponse.ok)
          throw new Error(data.error ?? "Não foi possível carregar os dados.");
        if (!financeResponse.ok)
          throw new Error(
            financeData.error ?? "Não foi possível carregar as finanças.",
          );
        if (!active) return;
        setCustomerList(data.customers ?? []);
        setProductList(data.products ?? []);
        setOrders(data.orders ?? []);
        setFinance(financeData);
        setDataReady(true);
      })
      .catch((error: unknown) => {
        if (active) {
          setDataError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os dados.",
          );
          setDataReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [authenticated]);

  const updateFinance = async (values: { bank: number; home: number }) => {
    const response = await fetch("/api/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok)
      throw new Error(result.error ?? "Não foi possível guardar as finanças.");
    const refreshed = await fetch("/api/finance", { cache: "no-store" });
    setFinance((await refreshed.json()) as FinanceSummary);
  };

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const customer = customerList.find(
          (item) => item.id === order.customerId,
        );
        const product = productList.find((item) =>
          order.productIds.includes(item.id),
        );
        const matches =
          `${order.id} ${customer?.name ?? ""} ${product?.name ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return (
          matches &&
          (filter === "all"
            ? order.status !== "delivered"
            : order.status === filter)
        );
      }),
    [orders, customerList, productList, search, filter],
  );
  const counts = useMemo(
    () => ({
      new: orders.filter((o) => o.status === "new").length,
      production: orders.filter((o) => o.status === "production").length,
      ready: orders.filter((o) => o.status === "ready").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    }),
    [orders],
  );

  const saveOrder = async (data: {
    customerId: string;
    productIds: string[];
    quantities: Record<string, number>;
    delivery: string;
    notes: string;
    payment: PaymentStatus;
  }) => {
    const total = data.productIds.reduce(
      (sum, id) =>
        sum +
        (productList.find((product) => product.id === id)?.price ?? 0) *
          (data.quantities[id] ?? 1),
      0,
    );
    if (editingOrder) {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, orderNumber: editingOrder.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível guardar as alterações.",
        );
      const updated = { ...editingOrder, ...data, total };
      const refreshed = await fetch("/api/dashboard", { cache: "no-store" });
      const dashboard = (await refreshed.json()) as {
        customers?: Customer[];
        products?: Product[];
        orders?: Order[];
        error?: string;
      };
      if (!refreshed.ok)
        throw new Error(
          dashboard.error ?? "Não foi possível atualizar os dados.",
        );
      setCustomerList(dashboard.customers ?? []);
      setProductList(dashboard.products ?? []);
      setOrders(dashboard.orders ?? [updated]);
      setSelectedOrder(null);
      setTab("orders");
    } else {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível guardar a encomenda.",
        );
      const refreshed = await fetch("/api/dashboard", { cache: "no-store" });
      const dashboard = (await refreshed.json()) as {
        customers?: Customer[];
        products?: Product[];
        orders?: Order[];
      };
      setCustomerList(dashboard.customers ?? []);
      setProductList(dashboard.products ?? []);
      setOrders(dashboard.orders ?? []);
      setTab("orders");
    }
    setEditingOrder(null);
    setShowNew(false);
  };
  const updatePayment = async (order: Order, payment: PaymentStatus) => {
    const previous = order.payment;
    setOrders((current) =>
      current.map((item) =>
        item.id === order.id ? { ...item, payment } : item,
      ),
    );
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: order.id, payment }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível atualizar o pagamento.",
        );
      const [dashboardResponse, financeResponse] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/finance", { cache: "no-store" }),
      ]);
      const dashboard = (await dashboardResponse.json()) as {
        customers?: Customer[];
        products?: Product[];
        orders?: Order[];
        error?: string;
      };
      const financeData = (await financeResponse.json()) as FinanceSummary & {
        error?: string;
      };
      if (!dashboardResponse.ok || !financeResponse.ok)
        throw new Error(
          dashboard.error ??
            financeData.error ??
            "Não foi possível atualizar os valores financeiros.",
        );
      setCustomerList(dashboard.customers ?? []);
      setProductList(dashboard.products ?? []);
      setOrders(dashboard.orders ?? []);
      setFinance(financeData);
    } catch (reason) {
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, payment: previous } : item,
        ),
      );
      throw reason;
    }
  };
  const updateStatus = (status: OrderStatus) => {
    if (!selectedOrder) return;
    const updated = { ...selectedOrder, status };
    setOrders((current) =>
      current.map((order) => (order.id === updated.id ? updated : order)),
    );
    setSelectedOrder(updated);
    void fetch("/api/dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: selectedOrder.id, status }),
    });
  };
  const registerCustomer = async (
    data: Omit<Customer, "id">,
  ): Promise<Customer> => {
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = (await response.json()) as {
      customer?: Customer;
      error?: string;
    };
    if (!response.ok || !result.customer)
      throw new Error(result.error ?? "Não foi possível registar o cliente.");
    setCustomerList((current) => [...current, result.customer as Customer]);
    return result.customer as Customer;
  };
  const updateCustomer = async (customer: Customer) => {
    const response = await fetch("/api/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });
    const result = (await response.json()) as {
      customer?: Customer;
      error?: string;
    };
    if (!response.ok || !result.customer)
      throw new Error(result.error ?? "Não foi possível atualizar o cliente.");
    setCustomerList((current) =>
      current.map((item) =>
        item.id === customer.id ? (result.customer as Customer) : item,
      ),
    );
  };
  const saveProduct = async (product: Product, isNew: boolean) => {
    const response = await fetch("/api/products", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    const result = (await response.json()) as {
      product?: Product;
      error?: string;
    };
    if (!response.ok || !result.product)
      throw new Error(result.error ?? "Não foi possível guardar o produto.");
    setProductList((current) =>
      isNew
        ? [...current, result.product as Product]
        : current.map((item) =>
            item.id === product.id ? (result.product as Product) : item,
          ),
    );
  };
  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Remover o produto "${product.name}"?`)) return;
    const response = await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok)
      throw new Error(result.error ?? "Não foi possível remover o produto.");
    setProductList((current) =>
      current.filter((item) => item.id !== product.id),
    );
  };
  const deleteCustomer = async (customer: Customer) => {
    if (!window.confirm(`Remover o cliente "${customer.name}"?`)) return;
    const response = await fetch("/api/customers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: customer.id }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok)
      throw new Error(result.error ?? "Não foi possível remover o cliente.");
    setCustomerList((current) =>
      current.filter((item) => item.id !== customer.id),
    );
  };
  const deleteOrder = async (order: Order) => {
    if (
      !window.confirm(
        `Eliminar a encomenda #${order.id}? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    const response = await fetch("/api/orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: order.id }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok)
      throw new Error(result.error ?? "Não foi possível remover a encomenda.");
    setOrders((current) => current.filter((item) => item.id !== order.id));
    setSelectedOrder(null);
    setTab("orders");
  };

  if (authenticated === null) return <div className="app-shell auth-loading" />;
  if (!authenticated)
    return (
      <LoginScreen
        dark={dark}
        onLogin={async (email, password) => {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = (await response.json()) as { error?: string };
          if (!response.ok)
            return data.error ?? "Não foi possível iniciar sessão.";
          setDataReady(false);
          setDataError("");
          setAuthenticated(true);
          return null;
        }}
      />
    );
  if (!dataReady)
    return (
      <div className="app-shell auth-loading">
        <p>A carregar dados de produção…</p>
      </div>
    );
  if (dataError)
    return (
      <div className="app-shell auth-loading">
        <p>{dataError}</p>
        <button
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </button>
      </div>
    );

  return (
    <div className={dark ? "app-shell dark" : "app-shell"}>
      {tab === "home" && (
        <header className="topbar">
          <div className="content-wrap topbar-inner">
            <div className="brand">
              <Image
                className="brand-logo"
                src="/logo.png"
                alt="Imaginarte"
                width={166}
                height={42}
                priority
              />
            </div>
            <button className="icon-btn" aria-label="Alertas">
              <Bell size={20} />
            </button>
          </div>
        </header>
      )}
      <main className="content-wrap main-content">
        {selectedOrder ? (
          <OrderDetail
            order={selectedOrder}
            catalog={productList}
            customers={customerList}
            onClose={() => setSelectedOrder(null)}
            onEdit={() => {
              setEditingOrder(selectedOrder);
              setShowNew(true);
            }}
            onUpdateStatus={updateStatus}
            onDelete={() =>
              deleteOrder(selectedOrder).catch((reason: unknown) =>
                window.alert(
                  reason instanceof Error
                    ? reason.message
                    : "Não foi possível remover a encomenda.",
                ),
              )
            }
          />
        ) : (
          <>
            {tab === "home" && (
              <Dashboard
                counts={counts}
                orders={orders}
                customers={customerList}
                finance={finance}
                onUpdateFinance={updateFinance}
                onOpenOrders={(status) => {
                  setFilter(status);
                  setTab("orders");
                }}
                onOpenOrder={setSelectedOrder}
                onUpdatePayment={updatePayment}
              />
            )}
            {tab === "orders" && (
              <OrdersView
                orders={visibleOrders}
                allOrders={orders}
                customers={customerList}
                search={search}
                setSearch={setSearch}
                filter={filter}
                setFilter={setFilter}
                onOpenOrder={setSelectedOrder}
                onUpdatePayment={updatePayment}
                onNew={() => {
                  setEditingOrder(null);
                  setShowNew(true);
                }}
              />
            )}
            {tab === "products" && (
              <ProductsView
                products={productList}
                onSaveProduct={saveProduct}
                onDeleteProduct={deleteProduct}
              />
            )}
            {tab === "more" && (
              <MoreView
                dark={dark}
                setDark={setDark}
                customerCount={customerList.length}
                onOpenCustomers={() => setTab("customers")}
                onLogout={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  setDataReady(false);
                  setDataError("");
                  setAuthenticated(false);
                }}
              />
            )}
            {tab === "customers" && (
              <CustomersView
                customers={customerList}
                onBack={() => setTab("more")}
                onAddCustomer={registerCustomer}
                onUpdateCustomer={updateCustomer}
                onDeleteCustomer={deleteCustomer}
              />
            )}
          </>
        )}
      </main>
      {!selectedOrder && (
        <nav className="bottom-nav">
          <NavItem
            icon={<Home />}
            label="Início"
            active={tab === "home"}
            onClick={() => setTab("home")}
          />
          <NavItem
            icon={<ShoppingBag />}
            label="Encomendas"
            active={tab === "orders"}
            onClick={() => setTab("orders")}
          />
          <NavItem
            icon={<Package />}
            label="Produtos"
            active={tab === "products"}
            onClick={() => setTab("products")}
          />
          <NavItem
            icon={<Menu />}
            label="Configurações"
            active={tab === "more"}
            onClick={() => setTab("more")}
          />
        </nav>
      )}
      {showNew && (
        <NewOrderDialog
          order={editingOrder}
          customers={customerList}
          products={productList}
          onClose={() => {
            setShowNew(false);
            setEditingOrder(null);
          }}
          onSave={saveOrder}
          onAddCustomer={async (customer) =>
            registerCustomer({
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              city: customer.city,
              address: customer.address,
              postalCode: customer.postalCode,
            })
          }
        />
      )}
    </div>
  );
}

function Dashboard({
  counts,
  orders,
  customers,
  finance,
  onUpdateFinance,
  onOpenOrders,
  onOpenOrder,
  onUpdatePayment,
}: {
  counts: Record<string, number>;
  orders: Order[];
  customers: Customer[];
  finance: FinanceSummary;
  onUpdateFinance: (values: { bank: number; home: number }) => Promise<void>;
  onOpenOrders: (status: OrderStatus | "all") => void;
  onOpenOrder: (order: Order) => void;
  onUpdatePayment: (order: Order, payment: PaymentStatus) => Promise<void>;
}) {
  return (
    <>
      <FinanceSummary
        key={`${finance.bank}-${finance.home}`}
        finance={finance}
        onUpdateFinance={onUpdateFinance}
      />
      <section className="stats-grid">
        <StatCard
          value={counts.new}
          label="Novas"
          icon={<ShoppingBag />}
          tone="peach"
          onClick={() => onOpenOrders("new")}
        />
        <StatCard
          value={counts.production}
          label="Em produção"
          icon={<Settings2 />}
          tone="yellow"
          onClick={() => onOpenOrders("production")}
        />
        <StatCard
          value={counts.ready}
          label="Prontas"
          icon={<Truck />}
          tone="green"
          onClick={() => onOpenOrders("ready")}
        />
        <StatCard
          value={counts.delivered}
          label="Entregues"
          icon={<Check />}
          tone="mint"
          onClick={() => onOpenOrders("delivered")}
        />
      </section>
      <section className="section-heading">
        <div>
          <h2>Encomendas</h2>
        </div>
        <button className="link-button" onClick={() => onOpenOrders("all")}>
          Ver todas <ChevronRight size={17} />
        </button>
      </section>
      <div className="card order-list">
        {orders.slice(0, 4).map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            customers={customers}
            onClick={() => onOpenOrder(order)}
            onUpdatePayment={onUpdatePayment}
          />
        ))}
      </div>
    </>
  );
}

function FinanceSummary({
  finance,
  onUpdateFinance,
}: {
  finance: FinanceSummary;
  onUpdateFinance: (values: { bank: number; home: number }) => Promise<void>;
}) {
  const [bank, setBank] = useState(String(finance.bank));
  const [home, setHome] = useState(String(finance.home));
  const [editingBank, setEditingBank] = useState(false);
  const [editingHome, setEditingHome] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (field: "bank" | "home") => {
    setSaving(true);
    setError("");
    try {
      await onUpdateFinance({ bank: Number(bank), home: Number(home) });
      if (field === "bank") setEditingBank(false);
      else setEditingHome(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível guardar os valores.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="finance-section">
      <div className="section-heading">
        <div>
          <h2>Resumo financeiro</h2>
        </div>
      </div>
      <div className="finance-grid">
        <div className="finance-card finance-bank">
          <span>Banco</span>
          {editingBank ? (
            <>
              <input
                className="finance-input"
                type="number"
                min="0"
                step="0.01"
                value={bank}
                onChange={(event) => setBank(event.target.value)}
                aria-label="Valor no banco"
              />
              <button
                className="finance-edit-button"
                aria-label="Guardar valor do banco"
                onClick={() => save("bank")}
                disabled={saving}
              >
                <Save size={15} />
              </button>
            </>
          ) : (
            <>
              <strong>{money(finance.bank)}</strong>
              <button
                className="finance-edit-button"
                onClick={() => setEditingBank(true)}
              >
                <PenLine size={15} />{" "}
              </button>
            </>
          )}
        </div>
        <div className="finance-card finance-home">
          <span>Casa</span>
          {editingHome ? (
            <>
              <input
                className="finance-input"
                type="number"
                min="0"
                step="0.01"
                value={home}
                onChange={(event) => setHome(event.target.value)}
                aria-label="Valor em casa"
              />
              <button
                className="finance-edit-button"
                aria-label="Guardar valor de casa"
                onClick={() => save("home")}
                disabled={saving}
              >
                <Save size={15} />
              </button>
            </>
          ) : (
            <>
              <strong>{money(finance.home)}</strong>
              <button
                className="finance-edit-button"
                onClick={() => setEditingHome(true)}
              >
                <PenLine size={15} />
              </button>
            </>
          )}
        </div>
        <div className="finance-card finance-missing">
          <span>Pendente</span>
          <strong>{money(finance.missing)}</strong>
        </div>
        <div className="finance-card finance-total">
          <span>Total</span>
          <strong>{money(finance.total)}</strong>
        </div>
      </div>
      {error && (
        <div className="finance-actions">
          <span className="finance-error">{error}</span>
        </div>
      )}
    </section>
  );
}
function OrdersView({
  orders,
  allOrders,
  customers,
  search,
  setSearch,
  filter,
  setFilter,
  onOpenOrder,
  onUpdatePayment,
  onNew,
}: {
  orders: Order[];
  allOrders: Order[];
  customers: Customer[];
  search: string;
  setSearch: (value: string) => void;
  filter: OrderStatus | "all";
  setFilter: (value: OrderStatus | "all") => void;
  onOpenOrder: (order: Order) => void;
  onUpdatePayment: (order: Order, payment: PaymentStatus) => Promise<void>;
  onNew: () => void;
}) {
  const count = (status: OrderStatus | "all") =>
    status === "all"
      ? allOrders.filter((order) => order.status !== "delivered").length
      : allOrders.filter((order) => order.status === status).length;
  return (
    <>
      <section className="page-title">
        <div>
          <h1>Encomendas</h1>
        </div>
        <button className="round-primary" onClick={onNew}>
          <Plus size={25} />
        </button>
      </section>
      <div className="status-tabs scrollbar-none">
        {(
          ["all", "new", "production", "ready", "shipped", "delivered"] as const
        ).map((item) => (
          <button
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            {item === "all"
              ? "Todas"
              : statusMeta[item].label
                  .replace("Nova encomenda", "Novas")
                  .replace("Pronta para envio", "Prontas")}{" "}
            <b>{count(item)}</b>
          </button>
        ))}
      </div>
      <div className="search-row">
        <div className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por nº, nome ou produto..."
          />
        </div>
      </div>
      <div className="card order-list large-list">
        {orders.length ? (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              customers={customers}
              onClick={() => onOpenOrder(order)}
              onUpdatePayment={onUpdatePayment}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  );
}
function ProductsView({
  products,
  onSaveProduct,
  onDeleteProduct,
}: {
  products: Product[];
  onSaveProduct: (product: Product, isNew: boolean) => Promise<void>;
  onDeleteProduct: (product: Product) => Promise<void>;
}) {
  const [dialog, setDialog] = useState<Product | "new" | null>(null);
  return (
    <>
      <section className="page-title">
        <div>
          <h1>Produtos</h1>
        </div>
        <button className="round-primary" onClick={() => setDialog("new")}>
          <Plus size={25} />
        </button>
      </section>
      <div className="card product-listbox">
        {products.map((product) => (
          <div className="product-list-row" key={product.id}>
            <div
              className="product-image-small"
              style={{ background: product.color }}
            >
              <Package size={24} />
            </div>
            <div className="product-list-info">
              <strong>{product.name}</strong>
              <span>
                {product.category} · Stock: {product.stock}
              </span>
            </div>
            <strong>{money(product.price)}</strong>
            <button
              className="icon-btn action-icon-button edit-button"
              aria-label={`Editar ${product.name}`}
              onClick={() => setDialog(product)}
            >
              <PenLine size={17} />
            </button>
            <button
              className="icon-btn action-icon-button delete-button"
              aria-label={`Remover ${product.name}`}
              onClick={() =>
                onDeleteProduct(product).catch((reason: unknown) =>
                  window.alert(
                    reason instanceof Error
                      ? reason.message
                      : "Não foi possível remover o produto.",
                  ),
                )
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      {dialog && (
        <ProductDialog
          product={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
          onSave={async (product, isNew) => {
            await onSaveProduct(product, isNew);
            setDialog(null);
          }}
        />
      )}
    </>
  );
}
function MoreView({
  dark,
  setDark,
  customerCount,
  onOpenCustomers,
  onLogout,
}: {
  dark: boolean;
  setDark: (value: boolean) => void;
  customerCount: number;
  onOpenCustomers: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <section className="page-title">
        <div>
          <h1>Configurações</h1>
        </div>
      </section>
      <div className="card settings-list">
        <div className="setting-item">
          <div className="setting-icon">
            <Moon size={19} />
          </div>
          <div>
            <strong>Modo escuro</strong>
            <p className="muted">Altera o aspeto da aplicação</p>
          </div>
          <button
            className={dark ? "toggle on" : "toggle"}
            onClick={() => setDark(!dark)}
          >
            <span />
          </button>
        </div>
        <button
          className="setting-item setting-button"
          onClick={onOpenCustomers}
        >
          <div className="setting-icon">
            <Users size={19} />
          </div>
          <div>
            <strong>Clientes</strong>
            <p className="muted">{customerCount} clientes registados</p>
          </div>
          <ChevronRight size={18} />
        </button>
        <button className="logout-button" onClick={onLogout}>
          Terminar sessão
        </button>
      </div>
    </>
  );
}

function LoginScreen({
  dark,
  onLogin,
}: {
  dark: boolean;
  onLogin: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes("@")) return setError("Introduz um email válido.");
    if (password.length < 6)
      return setError("A palavra-passe deve ter pelo menos 6 caracteres.");
    setError("");
    try {
      const loginError = await onLogin(email, password);
      if (loginError) setError(loginError);
    } catch {
      setError("Não foi possível ligar ao servidor. Tenta novamente.");
    }
  };
  return (
    <div className={dark ? "login-screen dark" : "login-screen"}>
      <div className="login-card">
        <Image
          className="login-logo"
          src="/logo.png"
          alt="Imaginarte"
          width={210}
          height={54}
          priority
        />
        {/* <div className="login-heading">
          <h1>Bem-vindo de volta</h1>
          <p>Entra para gerir as tuas encomendas.</p>
        </div> */}
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nome@exemplo.pt"
              autoComplete="email"
            />
          </label>
          <label>
            Palavra-passe
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="btn-primary submit" type="submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

function CustomersView({
  customers,
  onBack,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}: {
  customers: Customer[];
  onBack: () => void;
  onAddCustomer: (customer: Omit<Customer, "id">) => Promise<Customer>;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onDeleteCustomer: (customer: Customer) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const visible = customers.filter((customer) =>
    `${customer.name} ${customer.email} ${customer.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="page-title">
        <div>
          <button className="back-link" onClick={onBack}>
            <ChevronLeft size={17} /> Configurações
          </button>
          <h1>Clientes</h1>
        </div>
        <button
          className="round-primary"
          aria-label="Registar cliente"
          onClick={() => setShowDialog(true)}
        >
          <Plus size={25} />
        </button>
      </section>
      <div className="search-row">
        <div className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar cliente..."
          />
        </div>
      </div>
      <div className="card customer-list">
        {visible.map((customer) => (
          <div className="customer-row" key={customer.id}>
            <div className="customer-avatar">{customer.name.charAt(0)}</div>
            <div>
              <strong>{customer.name}</strong>
              <span>{customer.email || "Sem email"}</span>
              <span>{customer.phone || "Sem telefone"}</span>
            </div>
            <button
              className="customer-edit-button action-icon-button edit-button"
              aria-label={`Editar ${customer.name}`}
              onClick={() => setEditingCustomer(customer)}
            >
              <PenLine size={16} />
            </button>
            <button
              className="customer-edit-button action-icon-button delete-button"
              aria-label={`Remover ${customer.name}`}
              onClick={() =>
                onDeleteCustomer(customer).catch((reason: unknown) =>
                  window.alert(
                    reason instanceof Error
                      ? reason.message
                      : "Não foi possível remover o cliente.",
                  ),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {showDialog && (
        <CustomerDialog
          key="new"
          onClose={() => setShowDialog(false)}
          onSave={async (customer) => {
            const newCustomer = Object.fromEntries(
              Object.entries(customer).filter(([key]) => key !== "id"),
            ) as Omit<Customer, "id">;
            await onAddCustomer(newCustomer);
            setShowDialog(false);
          }}
        />
      )}
      {editingCustomer && (
        <CustomerDialog
          key={editingCustomer.id}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={async (customer) => {
            await onUpdateCustomer(customer as Customer);
            setEditingCustomer(null);
          }}
        />
      )}
    </>
  );
}

function CustomerDialog({
  customer,
  onClose,
  onSave,
}: {
  customer?: Customer;
  onClose: () => void;
  onSave: (customer: Omit<Customer, "id"> | Customer) => Promise<void>;
}) {
  const [form, setForm] = useState<Omit<Customer, "id">>({
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    city: customer?.city ?? "",
    address: customer?.address ?? "",
    postalCode: customer?.postalCode ?? "",
  });
  const [error, setError] = useState("");
  const update = (field: keyof Omit<Customer, "id">, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Introduz o nome do cliente.");
      return;
    }
    try {
      await onSave(customer ? { ...form, id: customer.id } : form);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível guardar o cliente.",
      );
    }
  };
  return (
    <Modal
      title={customer ? "Editar cliente" : "Registar cliente"}
      onClose={onClose}
    >
      <form className="order-form" onSubmit={submit}>
        <label>
          Nome
          <input
            className="input"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Nome completo"
            autoFocus
          />
        </label>
        <div className="form-grid">
          <label>
            Email
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="cliente@email.com"
            />
          </label>
          <label>
            Telefone
            <input
              className="input"
              type="tel"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="912 345 678"
            />
          </label>
        </div>
        <label>
          Morada
          <input
            className="input"
            value={form.address}
            onChange={(event) => update("address", event.target.value)}
            placeholder="Rua, número e andar"
          />
        </label>
        <div className="form-grid">
          <label>
            Código postal
            <input
              className="input"
              value={form.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
              placeholder="4700-123"
            />
          </label>
          <label>
            Cidade
            <input
              className="input"
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
              placeholder="Braga"
            />
          </label>
        </div>
        {error && <p className="login-error">{error}</p>}
        <button className="btn-primary submit" type="submit">
          <Check size={18} />{" "}
          {customer ? "Guardar alterações" : "Registar cliente"}
        </button>
      </form>
    </Modal>
  );
}

function NewOrderDialog({
  order,
  customers,
  products,
  onClose,
  onSave,
  onAddCustomer,
}: {
  order: Order | null;
  customers: Customer[];
  products: Product[];
  onClose: () => void;
  onSave: (data: {
    customerId: string;
    productIds: string[];
    quantities: Record<string, number>;
    delivery: string;
    notes: string;
    payment: PaymentStatus;
  }) => void | Promise<void>;
  onAddCustomer: (customer: Customer) => Promise<Customer>;
}) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState(order?.customerId ?? "");
  const [productIds, setProductIds] = useState<string[]>(
    order?.productIds ?? [],
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    order?.quantities ??
      Object.fromEntries((order?.productIds ?? []).map((id) => [id, 1])),
  );
  const showProductPicker = true;
  const [productSearch, setProductSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [saveError, setSaveError] = useState("");
  const [delivery, setDelivery] = useState(order?.delivery ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [payment, setPayment] = useState<PaymentStatus>(
    order?.payment ?? "pending",
  );
  const filtered = customers.filter((customer) =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()),
  );
  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );
  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category}`
      .toLowerCase()
      .includes(productSearch.toLowerCase()),
  );
  const toggleProduct = (id: string) =>
    setProductIds((current) => {
      if (current.includes(id)) {
        setQuantities((values) => {
          const next = { ...values };
          delete next[id];
          return next;
        });
        return current.filter((item) => item !== id);
      }
      setQuantities((values) => ({ ...values, [id]: 1 }));
      return [...current, id];
    });
  const changeQuantity = (id: string, delta: number) =>
    setQuantities((values) => ({
      ...values,
      [id]: Math.max(1, (values[id] ?? 1) + delta),
    }));
  const createCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      const customer = await onAddCustomer({
        id: `c-${Date.now()}`,
        name: newCustomerName.trim(),
        phone: "",
        email: "",
        city: "",
      });
      setCustomerId(customer.id);
      setShowNewCustomer(false);
      setNewCustomerName("");
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível registar o cliente.",
      );
    }
  };
  return (
    <Modal
      title={order ? "Editar encomenda" : "Nova encomenda"}
      onClose={onClose}
    >
      <div className="order-form">
        {!order && (
          <FormSection icon={<UserRound size={19} />} title="Cliente">
            <div className="search-box">
              <Search size={17} />
              <input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Pesquisar cliente por nome..."
              />
            </div>
            {customerSearch.trim() && filtered[0] && (
              <div className="selection-list customer-search-result">
                {[filtered[0]].map((customer) => (
                  <button
                    type="button"
                    key={customer.id}
                    className={
                      customer.id === customerId
                        ? "selection-row selected"
                        : "selection-row"
                    }
                    onClick={() => setCustomerId(customer.id)}
                  >
                    <span>
                      <strong>{customer.name}</strong>
                      {/* <small>{customer.email || "Novo cliente"}</small> */}
                    </span>
                    {customer.id === customerId}
                  </button>
                ))}
              </div>
            )}
            {!customerSearch.trim() && selectedCustomer && (
              <div className="selection-row selected selected-customer-row">
                <button
                  type="button"
                  className="selected-customer-main"
                  onClick={() => setCustomerId(selectedCustomer.id)}
                >
                  <span>
                    <strong>{selectedCustomer.name}</strong>
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-btn action-icon-button delete-button"
                  onClick={() => setCustomerId("")}
                  aria-label="Remover cliente selecionado"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {showNewCustomer ? (
              <div className="inline-create">
                <input
                  className="input"
                  value={newCustomerName}
                  onChange={(event) => setNewCustomerName(event.target.value)}
                  placeholder="Nome do novo cliente"
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={createCustomer}
                  aria-label="Guardar novo cliente"
                >
                  <Save size={17} />
                </button>
                <button
                  type="button"
                  className="btn-primary delete-button"
                  onClick={() => {
                    setShowNewCustomer(false);
                    setNewCustomerName("");
                    setSaveError("");
                  }}
                  aria-label="Cancelar novo cliente"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="soft-action"
                onClick={() => setShowNewCustomer(true)}
              >
                <Plus size={17} /> Adicionar novo cliente
              </button>
            )}
            {saveError && <p className="login-error">{saveError}</p>}
          </FormSection>
        )}
        <FormSection
          icon={<Package size={19} />}
          title={`Produtos (${productIds.length})`}
        >
          <div className="selected-products">
            {productIds.length ? (
              productIds.map((id) => {
                const product = products.find((item) => item.id === id);
                return product ? (
                  <div className="selected-product-chip" key={id}>
                    <ProductThumb productId={id} catalog={products} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {money(product.price)} · {quantities[id] ?? 1} un.
                      </small>
                    </span>
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => changeQuantity(id, -1)}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <input
                        className="quantity-input"
                        type="number"
                        min={1}
                        step={1}
                        value={quantities[id] ?? 1}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (Number.isInteger(value) && value >= 1) {
                            setQuantities((current) => ({
                              ...current,
                              [id]: value,
                            }));
                          }
                        }}
                        aria-label={`Quantidade de ${product.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => changeQuantity(id, 1)}
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${product.name}`}
                      onClick={() => toggleProduct(id)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : null;
              })
            ) : (
              <p className="muted empty-products">
                Ainda não adicionaste produtos.
              </p>
            )}
          </div>
          {/* <button
            type="button"
            className="soft-action add-product-button"
            onClick={() => setShowProductPicker(!showProductPicker)}
          >
            <Plus size={17} /> Adicionar produto
          </button> */}
          {showProductPicker && (
            <div className="product-picker">
              <div className="search-box product-search-box">
                <Search size={17} />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Pesquisar produto por nome..."
                />
              </div>
              <div className="selection-list product-selection">
                {filteredProducts.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    className={
                      productIds.includes(product.id)
                        ? "selection-row selected"
                        : "selection-row"
                    }
                    disabled={
                      product.stock <= 0 && !productIds.includes(product.id)
                    }
                    onClick={() => toggleProduct(product.id)}
                  >
                    <ProductThumb productId={product.id} catalog={products} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {money(product.price)} · {product.stock} em stock
                      </small>
                    </span>
                    {productIds.includes(product.id) && <Check size={17} />}
                  </button>
                ))}
                {!filteredProducts.length && (
                  <p className="muted empty-products">
                    Não encontrámos produtos.
                  </p>
                )}
              </div>
            </div>
          )}
        </FormSection>
        <div className="form-grid">
          <label>
            Entrega
            <input
              type="date"
              className="input"
              value={delivery}
              onChange={(event) => setDelivery(event.target.value)}
            />
          </label>
          <label>
            Pagamento
            <select
              className="input"
              value={payment}
              onChange={(event) =>
                setPayment(event.target.value as PaymentStatus)
              }
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </label>
        </div>
        <label>
          Notas
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Detalhes da personalização..."
          />
        </label>
        {saveError && <p className="login-error">{saveError}</p>}
        <button
          className="btn-primary submit"
          disabled={!productIds.length || !customerId}
          onClick={async () => {
            try {
              await onSave({
                customerId,
                productIds,
                quantities,
                delivery,
                notes,
                payment,
              });
            } catch (reason) {
              setSaveError(
                reason instanceof Error
                  ? reason.message
                  : "Não foi possível guardar a encomenda.",
              );
            }
          }}
        >
          <Check size={19} />{" "}
          {order ? "Guardar alterações" : "Guardar encomenda"}
        </button>
      </div>
    </Modal>
  );
}
function ProductDialog({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product, isNew: boolean) => Promise<void>;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [category, setCategory] = useState(product?.category ?? "Presentes");
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [error, setError] = useState("");
  const save = async () => {
    try {
      await onSave(
        {
          id: product?.id ?? "",
          name: name || "Novo produto",
          price: Number(price) || 0,
          category,
          color: product?.color ?? "#dcebdc",
          active: true,
          stock: Number(stock) || 0,
        },
        !product,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível guardar o produto.",
      );
    }
  };
  return (
    <Modal
      title={product ? "Editar produto" : "Novo produto"}
      onClose={onClose}
    >
      <div className="order-form">
        <label>
          Nome do produto
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Caneca personalizada"
          />
        </label>
        <div className="form-grid">
          <label>
            Preço
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label>
            Categoria
            <input
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </label>
        </div>
        <label>
          Quantidade em stock
          <input
            type="number"
            min="0"
            step="1"
            className="input"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            placeholder="0"
          />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button className="btn-primary submit" onClick={save}>
          <Check size={19} /> Guardar produto
        </button>
      </div>
    </Modal>
  );
}
function OrderDetail({
  order,
  catalog,
  customers,
  onClose,
  onEdit,
  onUpdateStatus,
  onDelete,
}: {
  order: Order;
  catalog: Product[];
  customers: Customer[];
  onClose: () => void;
  onEdit: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
  onDelete: () => void;
}) {
  const customer =
    customers.find((item) => item.id === order.customerId) ?? customers[0];
  const [copied, setCopied] = useState(false);
  const copyAddress = async () => {
    await navigator.clipboard?.writeText(
      `${customer.name}\n${customer.address ?? "Rua das Flores, nº 12"}\n${customer.postalCode ?? "4700-123"} ${customer.city || "Braga"}, Portugal`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="detail-page">
      <div className="detail-heading">
        <button className="icon-btn" onClick={onClose}>
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1>Encomenda #{order.id}</h1>
        </div>
        <button
          className="icon-btn action-icon-button delete-button"
          aria-label="Eliminar encomenda"
          onClick={onDelete}
        >
          <Trash2 size={18} />
        </button>
      </div>
      <section className="status-update prominent detail-status-card">
        <span className="eyebrow">Estado atual</span>
        <select
          className="input"
          value={order.status}
          onChange={(event) =>
            onUpdateStatus(event.target.value as OrderStatus)
          }
        >
          {Object.entries(statusMeta).map(([key, meta]) => (
            <option value={key} key={key}>
              {meta.label}
            </option>
          ))}
        </select>
      </section>
      <div className="detail-info-grid">
        <section className="detail-block">
          <h3>
            <UserRound size={18} /> Cliente
          </h3>
          <p>
            <UserRound size={15} /> <strong>{customer.name}</strong>
          </p>
          <p>
            <Phone size={15} /> {customer.phone || "912 345 678"}
          </p>
          <p>
            <Mail size={15} /> {customer.email || "cliente@email.com"}
          </p>
        </section>
        <section className="detail-block address-block">
          <div className="block-heading">
            <h3>
              <MapPin size={18} /> Morada
            </h3>
            <button
              className={copied ? "icon-btn copied" : "icon-btn"}
              aria-label="Copiar morada"
              onClick={copyAddress}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
          <p>{customer.address || "Rua das Flores, nº 12"}</p>
          <p>
            {customer.postalCode || "4700-123"} {customer.city || "Braga"},
            Portugal
          </p>
        </section>
      </div>
      <section className="detail-block">
        <div className="block-heading">
          <h3>
            <Package size={18} /> Produtos ({order.productIds.length})
          </h3>
          <button className="btn-ghost edit-products" onClick={onEdit}>
            <PenLine size={14} /> Editar
          </button>
        </div>
        {order.productIds.map((id) => {
          const product =
            catalog.find((item) => item.id === id) ?? initialProducts[0];
          return (
            <div className="detail-product" key={id}>
              <ProductThumb productId={id} catalog={catalog} />
              <span>
                <strong>{product.name}</strong>
                <small>{order.quantities?.[id] ?? 1} un.</small>
              </span>
              <strong>
                {money(product.price * (order.quantities?.[id] ?? 1))}
              </strong>
            </div>
          );
        })}
        <div className="detail-total">
          <strong>Total</strong>
          <strong>{money(order.total)}</strong>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  value,
  label,
  icon,
  tone,
  onClick,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`stat-card ${tone}`}
      onClick={onClick}
      aria-label={`Ver encomendas: ${label}`}
    >
      <div className="stat-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}
function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "nav-item active" : "nav-item"}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
function OrderRow({
  order,
  customers,
  onClick,
  onUpdatePayment,
}: {
  order: Order;
  customers: Customer[];
  onClick: () => void;
  onUpdatePayment: (order: Order, payment: PaymentStatus) => Promise<void>;
}) {
  const customer =
    customers.find((item) => item.id === order.customerId) ?? customers[0];
  return (
    <div
      className="order-row"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
    >
      <ProductThumb productId={order.productIds[0]} />
      <div className="order-number">
        <strong>#{order.id}</strong>
        <small>{order.date}</small>
      </div>
      <div className="order-customer">
        <strong>{customer.name}</strong>
        <small className="mobile-order-price">{money(order.total)}</small>
      </div>
      <div className="order-status">
        <StatusBadge status={order.status} />
      </div>
      <select
        className={`payment-select payment-${order.payment}`}
        value={order.payment}
        aria-label={`Pagamento da encomenda ${order.id}`}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();
          void onUpdatePayment(
            order,
            event.target.value as PaymentStatus,
          ).catch((reason: unknown) =>
            window.alert(
              reason instanceof Error
                ? reason.message
                : "Não foi possível atualizar o pagamento.",
            ),
          );
        }}
      >
        <option value="pending">Pendente</option>
        <option value="paid">Pago</option>
        <option value="refunded">Reembolsado</option>
      </select>
      <span className="order-total">{money(order.total)}</span>
      <ChevronRight className="row-chevron" size={18} />
    </div>
  );
}
function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section">
      <h3>
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal-card">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function EmptyState() {
  return (
    <div className="empty-state">
      <Search size={28} />
      <strong>Não encontrámos encomendas</strong>
      <span>Tenta alterar a pesquisa ou os filtros.</span>
    </div>
  );
}
