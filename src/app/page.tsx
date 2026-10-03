"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Home,
  Mail,
  Menu,
  Moon,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
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
  type Product,
} from "@/lib/demo-data";

type Tab = "home" | "orders" | "products" | "more" | "customers";
const money = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(
    value,
  );
const flow: OrderStatus[] = [
  "new",
  "production",
  "ready",
  "shipped",
  "delivered",
];

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
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          customers?: Customer[];
          products?: Product[];
          orders?: Order[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error ?? "Não foi possível carregar os dados.");
        if (!active) return;
        setCustomerList(data.customers ?? []);
        setProductList(data.products ?? []);
        setOrders(data.orders ?? []);
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
        return matches && (filter === "all" || order.status === filter);
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

  const saveOrder = (data: {
    customerId: string;
    productIds: string[];
    delivery: string;
    notes: string;
  }) => {
    const total = data.productIds.reduce(
      (sum, id) =>
        sum + (productList.find((product) => product.id === id)?.price ?? 0),
      0,
    );
    if (editingOrder) {
      const updated = { ...editingOrder, ...data, total };
      setOrders((current) =>
        current.map((order) =>
          order.id === editingOrder.id ? updated : order,
        ),
      );
      setSelectedOrder(updated);
    } else {
      const newOrder: Order = {
        id: String(1259 + orders.length),
        ...data,
        date: "Hoje",
        status: "new",
        payment: "pending",
        total,
      };
      setOrders((current) => [newOrder, ...current]);
      setTab("orders");
    }
    setEditingOrder(null);
    setShowNew(false);
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
          if (!response.ok) return data.error ?? "Não foi possível iniciar sessão.";
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
          />
        ) : (
          <>
            {tab === "home" && (
              <Dashboard
                counts={counts}
                orders={orders}
                customers={customerList}
                onOpenOrders={(status) => {
                  setFilter(status);
                  setTab("orders");
                }}
                onOpenOrder={setSelectedOrder}
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
                onNew={() => {
                  setEditingOrder(null);
                  setShowNew(true);
                }}
              />
            )}
            {tab === "products" && (
              <ProductsView
                products={productList}
                setProducts={setProductList}
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
          onAddCustomer={(customer) =>
            setCustomerList((current) => [...current, customer])
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
  onOpenOrders,
  onOpenOrder,
}: {
  counts: Record<string, number>;
  orders: Order[];
  customers: Customer[];
  onOpenOrders: (status: OrderStatus | "all") => void;
  onOpenOrder: (order: Order) => void;
}) {
  return (
    <>
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
          />
        ))}
      </div>
    </>
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
  onNew: () => void;
}) {
  const count = (status: OrderStatus | "all") =>
    status === "all"
      ? allOrders.length
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
  setProducts,
}: {
  products: Product[];
  setProducts: (products: Product[]) => void;
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
              <span>{product.category}</span>
            </div>
            <strong>{money(product.price)}</strong>
            <button
              className="icon-btn"
              aria-label={`Editar ${product.name}`}
              onClick={() => setDialog(product)}
            >
              <Pencil size={17} />
            </button>
          </div>
        ))}
      </div>
      {dialog && (
        <ProductDialog
          product={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
          onSave={(product) => {
            setProducts(
              products.some((item) => item.id === product.id)
                ? products.map((item) =>
                    item.id === product.id ? product : item,
                  )
                : [...products, product],
            );
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
}: {
  customers: Customer[];
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
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
        <button className="round-primary">
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
            <ChevronRight size={18} />
          </div>
        ))}
      </div>
    </>
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
    delivery: string;
    notes: string;
  }) => void;
  onAddCustomer: (customer: Customer) => void;
}) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState(
    order?.customerId ?? customers[0]?.id,
  );
  const [productIds, setProductIds] = useState<string[]>(
    order?.productIds ?? [],
  );
  const [showProductPicker, setShowProductPicker] = useState(!order);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [delivery, setDelivery] = useState(order?.delivery ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const filtered = customers.filter((customer) =>
    `${customer.name} ${customer.email} ${customer.phone}`
      .toLowerCase()
      .includes(customerSearch.toLowerCase()),
  );
  const toggleProduct = (id: string) =>
    setProductIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const createCustomer = () => {
    if (!newCustomerName.trim()) return;
    const customer = {
      id: `c-${Date.now()}`,
      name: newCustomerName.trim(),
      phone: "",
      email: "",
      city: "",
    };
    onAddCustomer(customer);
    setCustomerId(customer.id);
    setShowNewCustomer(false);
    setNewCustomerName("");
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
                placeholder="Pesquisar por nome, telefone ou email..."
              />
            </div>
            <div className="selection-list">
              {filtered.map((customer) => (
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
                    <small>{customer.email || "Novo cliente"}</small>
                  </span>
                  {customer.id === customerId && <Check size={17} />}
                </button>
              ))}
            </div>
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
                >
                  Adicionar
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
                      <small>{money(product.price)}</small>
                    </span>
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
          <button
            type="button"
            className="soft-action add-product-button"
            onClick={() => setShowProductPicker(!showProductPicker)}
          >
            <Plus size={17} /> Adicionar produto
          </button>
          {showProductPicker && (
            <div className="selection-list product-selection">
              {products.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className={
                    productIds.includes(product.id)
                      ? "selection-row selected"
                      : "selection-row"
                  }
                  onClick={() => toggleProduct(product.id)}
                >
                  <ProductThumb productId={product.id} catalog={products} />
                  <span>
                    <strong>{product.name}</strong>
                    <small>{money(product.price)}</small>
                  </span>
                  {productIds.includes(product.id) && <Check size={17} />}
                </button>
              ))}
            </div>
          )}
        </FormSection>
        {!order && (
          <div className="form-grid">
            <label>
              Entrega
              <input
                type="date"
                className="input"
                value={delivery}
                onChange={(event) => setDelivery(event.target.value)}
              />
              <small className="field-hint">
                <CalendarDays size={14} /> Escolhe a data prevista
              </small>
            </label>
            <label>
              Pagamento
              <select className="input">
                <option>Pendente</option>
                <option>Pago</option>
              </select>
            </label>
          </div>
        )}
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
        <button
          className="btn-primary submit"
          disabled={!productIds.length}
          onClick={() => onSave({ customerId, productIds, delivery, notes })}
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
  onSave: (product: Product) => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [category, setCategory] = useState(product?.category ?? "Presentes");
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
        <button
          className="btn-primary submit"
          onClick={() =>
            onSave({
              id: product?.id ?? `p-${Date.now()}`,
              name: name || "Novo produto",
              price: Number(price) || 0,
              category,
              color: product?.color ?? "#dcebdc",
              active: true,
            })
          }
        >
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
}: {
  order: Order;
  catalog: Product[];
  customers: Customer[];
  onClose: () => void;
  onEdit: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
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
          <p className="eyebrow">Detalhes da encomenda</p>
          <h1>Encomenda #{order.id}</h1>
        </div>
        <button
          className="icon-btn"
          aria-label="Editar encomenda"
          onClick={onEdit}
        >
          <Pencil size={19} />
        </button>
      </div>
      <div className="progress-line">
        {flow.map((step, index) => (
          <div
            className={
              step === order.status || index <= flow.indexOf(order.status)
                ? "progress-step done"
                : "progress-step"
            }
            key={step}
          >
            <span>
              <StatusIcon status={step} />
            </span>
            <small>
              {step === "new"
                ? "Recebida"
                : step === "production"
                  ? "Produção"
                  : step === "ready"
                    ? "Pronta"
                    : step === "shipped"
                      ? "Enviada"
                      : "Entregue"}
            </small>
          </div>
        ))}
      </div>
      <section className="detail-block">
        <h3>
          <UserRound size={18} /> Informações do cliente
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
            <span className="pin-icon">⌖</span> Morada de entrega
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
      <section className="detail-block">
        <div className="block-heading">
          <h3>
            <Package size={18} /> Produtos ({order.productIds.length})
          </h3>
          <button className="btn-ghost edit-products" onClick={onEdit}>
            <Pencil size={14} /> Editar
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
                <small>1 un.</small>
              </span>
              <strong>{money(product.price)}</strong>
            </div>
          );
        })}
        <div className="detail-total">
          <strong>Total</strong>
          <strong>{money(order.total)}</strong>
        </div>
      </section>
      <section className="status-update prominent">
        <div>
          <span className="eyebrow">Estado atual</span>
          <strong>
            <StatusIcon status={order.status} />{" "}
            {statusMeta[order.status].label}
          </strong>
        </div>
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
}: {
  order: Order;
  customers: Customer[];
  onClick: () => void;
}) {
  const customer =
    customers.find((item) => item.id === order.customerId) ?? customers[0];
  return (
    <button className="order-row" onClick={onClick}>
      <ProductThumb productId={order.productIds[0]} />
      <div className="order-number">
        <strong>#{order.id}</strong>
        <small>{order.date}</small>
      </div>
      <div className="order-customer">
        <strong>{customer.name}</strong>
        <StatusBadge status={order.status} />
      </div>
      <span className="order-total">{money(order.total)}</span>
      <ChevronRight className="row-chevron" size={18} />
    </button>
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
