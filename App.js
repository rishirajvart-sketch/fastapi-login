import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({ baseURL: "http://localhost:8000" });
const emptyProduct = { name: "", description: "", price: "", quantity: "", image: "" };

function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token") || "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    password: "",
    phone_number: "",
    age: "",
    email: "",
    Gender: "",
  });
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [orders, setOrders] = useState([]);
  const [activePage, setActivePage] = useState("shop");
  const [search, setSearch] = useState("");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  const loadProducts = async () => {
    const response = await api.get("/view");
    setProducts(response.data);
  };

  const loadCustomerData = async () => {
    const [cartResponse, orderResponse] = await Promise.all([
      api.get("/cart"),
      api.get("/orders"),
    ]);
    setCart(cartResponse.data);
    setOrders(orderResponse.data);
  };

  const refreshData = async (customer = user) => {
    setLoading(true);
    setError("");
    try {
      await loadProducts();
      if (customer?.role !== "admin") {
        await loadCustomerData();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not load your store data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    api.get("/me")
      .then((response) => setUser(response.data))
      .catch(() => {
        localStorage.removeItem("access_token");
        delete api.defaults.headers.common.Authorization;
        setToken("");
        setUser(null);
      });
  }, [token]);

  useEffect(() => {
    if (user) refreshData(user);
  }, [user]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) =>
      !query ||
      product.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    );
  }, [products, search]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (authMode === "signup") {
        await api.post("/signup/", {
          ...authForm,
          age: Number(authForm.age),
        });
      }
      const response = await api.post("/login", {
        username: authForm.username,
        password: authForm.password,
      });
      localStorage.setItem("access_token", response.data.access_token);
      api.defaults.headers.common.Authorization = `Bearer ${response.data.access_token}`;
      setToken(response.data.access_token);
      setUser(response.data.user);
      setActivePage("shop");
      setMessage(`Welcome, ${response.data.user.username}!`);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    delete api.defaults.headers.common.Authorization;
    setToken("");
    setUser(null);
    setCart({ items: [], total: 0 });
    setOrders([]);
    setProducts([]);
    setActivePage("shop");
    setMessage("");
    setError("");
  };

  const addToCart = async (productId) => {
    setError("");
    try {
      const response = await api.post("/cart/items", { item_id: productId, quantity: 1 });
      setCart(response.data);
      setMessage("Added to your cart.");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not add that item.");
    }
  };

  const updateCartQuantity = async (itemId, quantity) => {
    if (quantity < 1) return;
    setError("");
    try {
      const response = await api.put(`/cart/items/${itemId}`, { quantity });
      setCart(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not update your cart.");
    }
  };

  const removeFromCart = async (itemId) => {
    setError("");
    try {
      const response = await api.delete(`/cart/items/${itemId}`);
      setCart(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not remove that item.");
    }
  };

  const checkout = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/checkout");
      setMessage(`Order placed successfully. Order #${response.data.order.id.slice(-6)}.`);
      await loadCustomerData();
      setActivePage("orders");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      quantity: Number(productForm.quantity),
    };
    try {
      if (editingId) {
        await api.put(`/update/${editingId}`, payload);
        setMessage("Product updated.");
      } else {
        await api.post("/create_item", payload);
        setMessage("Product added.");
      }
      setProductForm(emptyProduct);
      setEditingId(null);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not save the product.");
    } finally {
      setLoading(false);
    }
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      quantity: product.quantity ?? "",
      image: product.image || "",
    });
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    setError("");
    try {
      await api.delete(`/delete/${productId}`);
      setMessage("Product deleted.");
      await loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not delete the product.");
    }
  };

  const currency = (amount) => `$${Number(amount || 0).toFixed(2)}`;

  if (!user) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={handleAuth}>
          <div className="store-logo">S</div>
          <p className="eyebrow">YOUR EVERYDAY MARKET</p>
          <h1>{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">Sign in to see your own cart, orders, and shopping home.</p>
          {authMode === "signup" && (
            <>
              <label>Phone number<input required value={authForm.phone_number} onChange={(e) => setAuthForm({ ...authForm, phone_number: e.target.value })} /></label>
              <label>Age<input required type="number" min="1" value={authForm.age} onChange={(e) => setAuthForm({ ...authForm, age: e.target.value })} /></label>
              <label>Email<input required type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></label>
              <label>Gender<input required value={authForm.Gender} onChange={(e) => setAuthForm({ ...authForm, Gender: e.target.value })} /></label>
            </>
          )}
          <label>Username<input required autoComplete="username" value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} /></label>
          <label>Password<input required type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></label>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn auth-submit" disabled={loading}>{loading ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button>
          <p className="auth-switch">
            {authMode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setError(""); }}>
              {authMode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </main>
    );
  }

  return (
    <div className="store-app">
      <header className="store-header">
        <a className="store-brand" href="#shop" onClick={() => setActivePage("shop")}>
          <span className="store-logo">S</span><span>Shoply<span className="brand-dot">.</span></span>
        </a>
        <nav className="store-nav">
          {isAdmin ? (
            <button className="nav-link active">Inventory</button>
          ) : (
            <>
              <button className={`nav-link ${activePage === "shop" ? "active" : ""}`} onClick={() => setActivePage("shop")}>Shop</button>
              <button className={`nav-link ${activePage === "orders" ? "active" : ""}`} onClick={() => setActivePage("orders")}>My orders</button>
            </>
          )}
        </nav>
        <div className="header-account">
          <span className="welcome-user">Hi, {user.username}</span>
          {!isAdmin && (
            <button className="cart-button" onClick={() => setActivePage("cart")}>
              Cart <span>{cart.items.length}</span>
            </button>
          )}
          <button className="logout-button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="store-main">
        {message && <div className="success-msg">{message}<button onClick={() => setMessage("")}>×</button></div>}
        {error && <div className="error-msg">{error}<button onClick={() => setError("")}>×</button></div>}

        {isAdmin ? (
          <>
            <section className="page-heading">
              <p className="eyebrow">STORE MANAGEMENT</p>
              <h1>Inventory</h1>
              <p>Manage products shown in every customer’s shared catalog.</p>
            </section>
            <section className="admin-layout">
              <form className="panel product-editor" onSubmit={submitProduct}>
                <h2>{editingId ? "Edit product" : "Add a product"}</h2>
                <label>Product name<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
                <label>Description<textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
                <div className="field-row">
                  <label>Price<input required type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label>
                  <label>Stock<input required type="number" min="0" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })} /></label>
                </div>
                <label>Image URL<input value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} /></label>
                <button className="btn" disabled={loading}>{editingId ? "Save changes" : "Add product"}</button>
                {editingId && <button className="text-button" type="button" onClick={() => { setEditingId(null); setProductForm(emptyProduct); }}>Cancel edit</button>}
              </form>
              <section className="panel inventory-panel">
                <h2>Products <span className="subtle-count">{products.length}</span></h2>
                {loading ? <p className="muted">Loading products…</p> : products.map((product) => (
                  <article className="inventory-row" key={product.id}>
                    <div className="product-thumb">{product.image ? <img src={product.image} alt="" /> : "✦"}</div>
                    <div className="inventory-info"><strong>{product.name}</strong><span>{product.quantity} in stock · {currency(product.price)}</span></div>
                    <button className="text-button" onClick={() => editProduct(product)}>Edit</button>
                    <button className="text-button danger-text" onClick={() => deleteProduct(product.id)}>Delete</button>
                  </article>
                ))}
                {!products.length && <p className="muted">No products yet.</p>}
              </section>
            </section>
          </>
        ) : (
          <>
            {activePage === "shop" && (
              <>
                <section className="hero">
                  <div><p className="eyebrow">A LITTLE GOODNESS, EVERY DAY</p><h1>Find your next<br />favorite thing.</h1><p>Browse the store, add what you love, and we’ll keep your cart just for you.</p></div>
                  <div className="hero-art" aria-hidden="true"><span>✦</span><div>GOOD<br />THINGS<br /><b>INSIDE</b></div></div>
                </section>
                <section className="catalog-section">
                  <div className="section-heading"><div><p className="eyebrow">MADE FOR YOU</p><h2>Explore products</h2></div><input className="search-input" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  {loading && !products.length ? <p className="muted">Loading products…</p> : (
                    <div className="product-grid">
                      {filteredProducts.map((product) => (
                        <article className="product-card" key={product.id}>
                          <div className="product-image">{product.image ? <img src={product.image} alt={product.name} /> : <span>✦</span>}</div>
                          <div className="product-details"><div className="product-title-row"><h3>{product.name}</h3><strong>{currency(product.price)}</strong></div><p>{product.description || "A great addition to your day."}</p><div className="product-buy-row"><span>{product.quantity > 0 ? `${product.quantity} available` : "Sold out"}</span><button className="btn" disabled={product.quantity < 1} onClick={() => addToCart(product.id)}>Add to cart</button></div></div>
                        </article>
                      ))}
                    </div>
                  )}
                  {!loading && !filteredProducts.length && <p className="empty-state">No products match your search.</p>}
                </section>
              </>
            )}

            {activePage === "cart" && (
              <section className="page-content">
                <div className="page-heading"><p className="eyebrow">YOUR SELECTION</p><h1>Your cart</h1><p>Only you can see the items in this cart.</p></div>
                <div className="panel cart-panel">
                  {!cart.items.length ? <div className="empty-state">Your cart is empty. <button className="text-button" onClick={() => setActivePage("shop")}>Browse products</button></div> : (
                    <>
                      {cart.items.map((item) => (
                        <article className="cart-row" key={item.item_id}>
                          <div className="product-thumb">{item.image ? <img src={item.image} alt="" /> : "✦"}</div>
                          <div className="cart-item-info"><strong>{item.name}</strong><span>{item.available ? currency(item.price) : "No longer available"}</span></div>
                          {item.available && <div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => updateCartQuantity(item.item_id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={() => updateCartQuantity(item.item_id, item.quantity + 1)}>+</button></div>}
                          <strong className="line-total">{currency(item.line_total)}</strong>
                          <button className="remove-button" onClick={() => removeFromCart(item.item_id)}>Remove</button>
                        </article>
                      ))}
                      <div className="cart-summary"><span>Subtotal</span><strong>{currency(cart.total)}</strong></div>
                      <button className="btn checkout-button" disabled={loading || cart.items.some((item) => !item.available)} onClick={checkout}>{loading ? "Processing…" : "Place order"}</button>
                    </>
                  )}
                </div>
              </section>
            )}

            {activePage === "orders" && (
              <section className="page-content">
                <div className="page-heading"><p className="eyebrow">YOUR SHOPPING HISTORY</p><h1>My orders</h1><p>These purchases belong to your account.</p></div>
                {!orders.length ? <div className="panel empty-state">No orders yet. <button className="text-button" onClick={() => setActivePage("shop")}>Start shopping</button></div> : (
                  <div className="orders-list">
                    {orders.map((order) => (
                      <article className="panel order-card" key={order.id}>
                        <div className="order-heading"><div><span className="eyebrow">ORDER #{order.id.slice(-6)}</span><p>{new Date(order.created_at).toLocaleString()}</p></div><strong>{currency(order.total)}</strong></div>
                        <div className="order-items">{order.items.map((item) => <div className="order-item" key={item.item_id}><span>{item.name} × {item.quantity}</span><strong>{currency(item.line_total)}</strong></div>)}</div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <footer className="store-footer">Your account, your cart, your good things.</footer>
    </div>
  );
}

export default App;
