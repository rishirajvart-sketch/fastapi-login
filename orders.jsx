import "./orders.css";
import { useEffect, useState } from "react";
import Navbar from "./navbar.jsx";

const CartPage = () => {
  const [cart, setCart] = useState([]);
  const [stockByProductId, setStockByProductId] = useState({});
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const mapCartItems = (items, inventory = stockByProductId) =>
    (items || []).map((item) => {
      const id = String(item.item_id ?? item.id);
      const stock = Number(item.stock ?? item.available_stock ?? inventory[id]);
      return {
        id,
        name: item.name,
        price: Number(item.price || 0),
        image: item.image || "",
        quantity_to_buy: Number(item.quantity),
        description: item.description,
        stock: Number.isFinite(stock) ? stock : undefined,
        available: item.available,
      };
    });

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setResponseMsg("Please sign in to view your cart.");
      return;
    }

    fetch("http://127.0.0.1:8000/cart", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Could not load your cart.");
        }
        setCart(mapCartItems(data.items));
      })
      .catch((error) => {
        setResponseMsg(error instanceof Error ? error.message : "Could not load your cart.");
      });
  }, []);

  useEffect(() => {
    setCart((currentCart) => {
      let changed = false;
      const updatedCart = currentCart.map((item) => {
        const stock = stockByProductId[item.id];
        if (!Number.isFinite(stock) || item.stock === stock) return item;
        changed = true;
        return { ...item, stock };
      });
      return changed ? updatedCart : currentCart;
    });
  }, [cart, stockByProductId]);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/view");
        const products = await response.json();
        if (!response.ok || !Array.isArray(products)) {
          throw new Error(products.detail || "Could not load product stock.");
        }

        const inventory = Object.fromEntries(products.map((product) => {
          const id = product.id ?? product._id ?? product.item_id ?? product.serial_no;
          return [String(id), Number(product.stock ?? product.quantity ?? 0)];
        }));
        setStockByProductId(inventory);
      } catch (error) {
        console.error("Failed to load product stock:", error);
        setResponseMsg(error instanceof Error ? error.message : "Could not load product stock.");
      }
    };

    fetchStock();
  }, []);

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity_to_buy,
    0
  );

  const discount = subtotal * 0.20;
  const deliveryFee = cart.length > 0 ? 15 : 0;
  const grandTotal = subtotal - discount + deliveryFee;

  const removeFromCart = async (itemId) => {
    const token = sessionStorage.getItem("accessToken");
    try {
      const response = await fetch(`http://127.0.0.1:8000/cart/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not remove item.");
      setCart(mapCartItems(data.items));
    } catch (error) {
      setResponseMsg(error instanceof Error ? error.message : "Could not remove item.");
    }
  };

  const updateQuantity = async (itemId, delta) => {
    const item = cart.find((cartItem) => cartItem.id === itemId);
    if (!item) return;
    const quantity = item.quantity_to_buy + delta;
    if (
      quantity < 1 ||
      (delta > 0 && (item.stock === undefined || quantity > item.stock))
    ) return;
    const token = sessionStorage.getItem("accessToken");
    setUpdatingItemId(itemId);
    try {
      const response = await fetch(`http://127.0.0.1:8000/cart/items/${encodeURIComponent(itemId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not update item quantity.");
      setCart(mapCartItems(data.items));
    } catch (error) {
      setResponseMsg(error instanceof Error ? error.message : "Could not update item quantity.");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleBulkCheckout = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    setResponseMsg(null);


    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch("http://127.0.0.1:8000/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setOrderSuccess(true);
        setCart([]);
      } else {
        setResponseMsg(`Error: ${data.detail || "Checkout failed"}`);
      }
    } catch (err) {
      setResponseMsg(err instanceof Error ? err.message : "Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <main style={{ padding: "20px" }} className="cart-container">
        {/* <p className="breadcrumb">Home &gt; <span className="current">Cart</span></p> */}
        <h1 className="cart-title" style={{ color: "grey" }}>YOUR CART</h1>

        {cart.length === 0 ? (
          <div className="empty-cart-box">
            <h2>ORDERS</h2>
      
          </div>
        ) : (
          <div className="cart-layout">
            {/* Left Side: Product Item Cards */}
            <div className="cart-items-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-item-card">
                  {item.image ? (
                    <img className="item-image" src={item.image} alt={item.name} />
                  ) : (
                    <div className="item-img-placeholder"></div>
                  )}

                  <div className="item-details">
                    <div className="item-header-row">
                      <h3>{item.name}</h3>
                      <h4>{item.description}</h4>
                      <button
                        className="trash-btn"
                        onClick={() => removeFromCart(item.id)}
                        title="Remove item" style={{ backgroundColor: "red", border: "none", cursor: "pointer", color: "white" }}
                      >
                        🗑️
                      </button>
                    </div>
                    <p className="item-meta"></p>
                    {item.size && <p className="item-meta">Size: <span>{item.size}</span></p>}
                    {item.color && <p className="item-meta">Color: <span>{item.color}</span></p>}
                    {item.stock !== undefined && (
                      <p className="item-meta">Stock: <span>{item.stock}</span></p>
                    )}

                    <div className="item-footer-row">
                      <span className="item-price" style={{ fontWeight: "bold", color: "orange" }}>
                       {`₹${item.price.toFixed(2)}`}
                      </span>
                    
                      
                      {/* Quantity Stepper Controls */}
                      <div>
                        <span className="qty-price">₹{(item.price * item.quantity_to_buy).toFixed(2)}</span>
                        <div className="quantity-stepper">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={updatingItemId === item.id || item.quantity_to_buy <= 1}
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          -
                        </button>
                        <span>{item.quantity_to_buy}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={
                            updatingItemId === item.id ||
                            item.stock === undefined ||
                            item.quantity_to_buy >= item.stock
                          }
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                      </div>
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Side: Order Summary Card */}
            <div className="order-summary-box">
              <h2>Orders Product</h2>

              {/* <div className="summary-row">
                <span>Total</span>
                <span className="summary-value">${subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-row discount">
                <span>Discount (-20%)</span>
                <span className="summary-value">-${discount.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span>Delivery Fee</span>
                <span className="summary-value">${deliveryFee.toFixed(2)}</span>
              </div>

              <div className="summary-row total">
                <span>Total</span>
                <span className="summary-value">${grandTotal.toFixed(2)}</span>
              </div> */}

              <table className="order-summary-table">
                <thead>
                  <tr>
                    <th>S.no</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Amount</th> 
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.name}</td>
                      <td>₹{item.price.toFixed(2)}</td>
                      <td>{item.quantity_to_buy}</td>
                      <td>₹{(item.price * item.quantity_to_buy).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th colSpan="4">Total</th>
                    <th>₹{grandTotal.toFixed(2)}</th>
                  </tr>
                </tbody>
                </table>
              <button
                className="checkout-btn"
                onClick={handleBulkCheckout}
                disabled={loading}>
                {loading ? "Processing..." : "PayNow →"}
              </button>
            </div>
          </div>
        )}

        {responseMsg && (
          <p className="response-message">{responseMsg}</p>
        )}
      </main>
      {orderSuccess && (
        <div className="order-success-overlay">
          <section
            className="order-success-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-success-title"
          >
            <h2 id="order-success-title">Order completed</h2>
            <p>Your order done successfully!</p>
            <button onClick={() => setOrderSuccess(false)}>Continue</button>
          </section>
        </div>
      )}
    </div>
  );
};

export default CartPage;