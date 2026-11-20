import "./Homescreen.css";
import Navbar from "./navbar.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const defaultCarouselImages = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvX1H970_s6E0WhRSRwWj6pg9z1OEX6C4y-wa52f8Zrg&s=10",
  "https://static.vecteezy.com/system/resources/thumbnails/063/464/163/small/white-shirt-and-tan-pants-on-a-white-background-photo.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgsK_ZTMMMitnDsIrOmwIVGZKBdGh-ejZ-li4fmdw2hg&s=10",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyIIwJs-eilqgxJNSp0OWxHgLnfLIrtMg1ao_-YQneZQ&s=10",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYt5oSQsAjcdZwJdxKuvawaVOqxLpDchavURT_wL_Ecw&s=10",
];

const highlightMatches = (text, query) => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const highlightedParts = [];
  let currentIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, currentIndex);

  while (matchIndex !== -1) {
    if (matchIndex > currentIndex) {
      highlightedParts.push(text.slice(currentIndex, matchIndex));
    }

    const matchEnd = matchIndex + normalizedQuery.length;
    highlightedParts.push(
      <mark className="search-match" key={matchIndex}>
        {text.slice(matchIndex, matchEnd)}
      </mark>
    );
    currentIndex = matchEnd;
    matchIndex = lowerText.indexOf(lowerQuery, currentIndex);
  }

  if (currentIndex < text.length) {
    highlightedParts.push(text.slice(currentIndex));
  }

  return highlightedParts;
};



const Homescreen=()=>{
  const navigate = useNavigate();
  const location = useLocation();
  const [loginMessage, setLoginMessage] = useState(location.state?.successMessage ?? "");
  const [carouselImages, setCarouselImages] = useState(defaultCarouselImages);
  const [carouselDraftImages, setCarouselDraftImages] = useState([]);
  const [isEditingCarousel, setIsEditingCarousel] = useState(false);
  const [savingCarousel, setSavingCarousel] = useState(false);
  const [carouselMessage, setCarouselMessage] = useState("");
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const carouselRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockMessage, setStockMessage] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", quantity: "", image: "" });
  const [savingProduct, setSavingProduct] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [addProductForm, setAddProductForm] = useState({
    name: "",
    price: "",
    quantity: "",
    description: "",
    image: "",
  });
  const [savingNewProduct, setSavingNewProduct] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({
    username: "",
    password: "",
    email: "",
    phone_number: "",
    age: "",
    Gender: "",
  });
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const isAdmin = sessionStorage.getItem("loggedInRole") === "admin";
  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

  useEffect(() => {
    if (!loginMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setLoginMessage(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [loginMessage]);

  useEffect(() => {
    let cancelled = false;

    const loadCarouselImages = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/carousel-images");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Could not load carousel images.");
        }
        if (!cancelled && Array.isArray(data.images) && data.images.length > 0) {
          setCarouselImages(data.images);
        }
      } catch (error) {
        console.error("Failed to load carousel images:", error);
        if (!cancelled) {
          setCarouselMessage(error instanceof Error ? error.message : "Could not load carousel images.");
        }
      }
    };

    loadCarouselImages();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || isCarouselPaused) return undefined;

    const intervalId = window.setInterval(() => {
      const nextIndex = (currentCarouselIndex + 1) % carousel.children.length;
      const nextSlide = carousel.children[nextIndex];
      if (!nextSlide) return;

      carousel.scrollTo({
        left: nextSlide.offsetLeft - carousel.offsetLeft,
        behavior: "smooth",
      });
      setCurrentCarouselIndex(nextIndex);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [currentCarouselIndex, isCarouselPaused]);

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setLoadingCart(false);
      navigate("/login");
      return;
    }

    const fetchCart = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(`Failed to load your cart (${response.status})`);
        }
        const data = await response.json();
        setCartItems((data.items || []).map((item) => ({
          id: item.item_id,
          name: item.name,
          price: Number(item.price || 0),
          image: item.image || "",
          quantity_to_buy: item.quantity,
          available: item.available,
        })));
      } catch (error) {
        console.error("Failed to load the signed-in user's cart:", error);
        setProductError(error instanceof Error ? error.message : "Failed to load your cart.");
      } finally {
        setLoadingCart(false);
      }
    };

    fetchCart();
  }, [navigate]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/view");
        if (!response.ok) {
          throw new Error(`Failed to load products (${response.status})`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("The product API returned an invalid response.");
        }

        const loadedProducts = data.map((item) => {
          const id = item.id ?? item._id ?? item.item_id ?? item.serial_no;
          if (id === undefined || id === null) {
            throw new Error("A product returned by the API is missing its ID.");
          }

          const stock = Number(item.stock ?? item.quantity ?? 0);
          return {
            ...item,
            id: String(id),
            name: String(item.name ?? item.item_name ?? "Unnamed product"),
            price: Number(item.price ?? 0),
            stock,
            available: item.available ?? item.in_stock ?? item.Instock ?? stock > 0,
            image: item.image ?? item.image_url ?? "",
          };
        });

        setProducts(loadedProducts);
        setQuantities(Object.fromEntries(loadedProducts.map((item) => [item.id, 1])));
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setProductError(error instanceof Error ? error.message : "Failed to load products.");
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const startEditing = (product) => {
    setEditingProductId(product.id);
    setEditForm({
      name: product.name,
      price: String(product.price),
      quantity: String(product.stock),
      image: product.image,
    });
    setUpdateMessage("");
  };

  const handleUpdateProduct = async (event, product) => {
    event.preventDefault();
    const token = sessionStorage.getItem("accessToken");
    const quantity = Number(editForm.quantity);
    const price = Number(editForm.price);

    if (!token) {
      setUpdateMessage("Please log in again to update products.");
      return;
    }
    if (!editForm.name.trim() || !Number.isFinite(price) || price < 0 ||
        !Number.isInteger(quantity) || quantity < 0) {
      setUpdateMessage("Enter a product name, a valid price, and a whole-number quantity.");
      return;
    }

    setSavingProduct(true);
    setUpdateMessage("");
    try {
      const response = await fetch(`http://127.0.0.1:8000/update/${encodeURIComponent(product.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          price,
          quantity,
          image: editForm.image.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((error) => error.msg).join("; ")
          : data.detail;
        throw new Error(detail || `Product update failed (${response.status}).`);
      }

      setProducts((currentProducts) => currentProducts.map((item) =>
        item.id === product.id
          ? {
              ...item,
              name: editForm.name.trim(),
              price,
              stock: quantity,
              available: quantity > 0,
              image: editForm.image.trim(),
              quantity,
            }
          : item
      ));
      setEditingProductId(null);
      
    } catch (error) {
      console.error("Failed to update product:", error);
      setUpdateMessage(error instanceof Error ? error.message : "Product update failed.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) {
      return;
    }

    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setUpdateMessage("Please log in again to delete products.");
      return;
    }

    setDeletingProductId(product.id);
    setUpdateMessage("");
    try {
      const response = await fetch(`http://127.0.0.1:8000/delete/${encodeURIComponent(product.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Product deletion failed (${response.status}).`);
      }

      setProducts((currentProducts) => currentProducts.filter((item) => item.id !== product.id));
      setQuantities((currentQuantities) => {
        const nextQuantities = { ...currentQuantities };
        delete nextQuantities[product.id];
        return nextQuantities;
      });
      setEditingProductId((currentId) => currentId === product.id ? null : currentId);
      setUpdateMessage("");
    } catch (error) {
      console.error("Failed to delete product:", error);
      setUpdateMessage(error instanceof Error ? error.message : "Product deletion failed.");
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    const token = sessionStorage.getItem("accessToken");
    const price = Number(addProductForm.price);
    const quantity = Number(addProductForm.quantity);
    if (!token) {
      setUpdateMessage("Please log in again to add products.");
      return;
    }
    if (!addProductForm.name.trim() || !Number.isFinite(price) || price < 0 ||
        !Number.isInteger(quantity) || quantity < 0) {
      setUpdateMessage("Enter a product name, a valid price, and a whole-number quantity.");
      return;
    }

    setSavingNewProduct(true);
    setUpdateMessage("");
    try {
      const response = await fetch("http://127.0.0.1:8000/create_item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: addProductForm.name.trim(),
          price,
          quantity,
          description: addProductForm.description.trim() || null,
          image: addProductForm.image.trim() || null,
          Instock: quantity > 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((error) => error.msg).join("; ")
          : data.detail;
        throw new Error(detail || `Product creation failed (${response.status}).`);
      }

      const newProduct = {
        ...data,
        id: String(data.id ?? data._id),
        name: String(data.name ?? addProductForm.name.trim()),
        price: Number(data.price ?? price),
        stock: Number(data.stock ?? data.quantity ?? quantity),
        available: data.available ?? data.in_stock ?? data.Instock ?? quantity > 0,
        image: data.image ?? addProductForm.image.trim(),
      };
      setProducts((currentProducts) => [...currentProducts, newProduct]);
      setQuantities((currentQuantities) => ({ ...currentQuantities, [newProduct.id]: 1 }));
      setAddProductForm({
        name: "",
        price: "",
        quantity: "",
        description: "",
        image: "",
      });
      setShowAddProductForm(false);
    } catch (error) {
      console.error("Failed to create product:", error);
      setUpdateMessage(error instanceof Error ? error.message : "Product creation failed.");
    } finally {
      setSavingNewProduct(false);
    }
  };

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setAdminMessage("Please log in again to create an admin.");
      return;
    }

    setSavingAdmin(true);
    setAdminMessage("");
    try {
      const response = await fetch("http://127.0.0.1:8000/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...adminForm,
          age: Number(adminForm.age),
          role: "admin",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((error) => error.msg).join("; ")
          : data.detail;
        throw new Error(detail || `Admin creation failed (${response.status}).`);
      }

      setAdminMessage("Admin account created successfully.");
      setAdminForm({
        username: "",
        password: "",
        email: "",
        phone_number: "",
        age: "",
        Gender: "",
      });
    } catch (error) {
      console.error("Failed to create admin:", error);
      setAdminMessage(error instanceof Error ? error.message : "Admin creation failed.");
    } finally {
      setSavingAdmin(false);
    }
  };

  const getCartQuantity = (productId) =>
    cartItems.find((item) => item.id === productId)?.quantity_to_buy ?? 0;
  const getAvailableStock = (product) =>
    Math.max(0, Math.floor(Number(product.stock)) - getCartQuantity(product.id));
  const getSelectedQuantity = (product) =>
    Math.min(
      Math.max(0, quantities[product.id] ?? 1),
      getAvailableStock(product)
    );

  const addToCart = async (product, quantity) => {
    const availableStock = getAvailableStock(product);
    if (!product.available || !Number.isInteger(quantity) || quantity < 1 || quantity > availableStock) {
      setStockMessage({
        productId: product.id,
        message: availableStock > 0
          ? `Only ${availableStock} more available in stock.`
          : "Out of Stock",
      });
      return;
    }

    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const response = await fetch("http://127.0.0.1:8000/cart/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id: product.id, quantity }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not add this item to your cart.");
      }
      setCartItems((data.items || []).map((item) => ({
        id: item.item_id,
        name: item.name,
        price: Number(item.price || 0),
        image: item.image || "",
        quantity_to_buy: item.quantity,
        available: item.available,
      })));
      setStockMessage(null);
    } catch (error) {
      setStockMessage({
        productId: product.id,
        message: error instanceof Error ? error.message : "Could not add this item to your cart.",
      });
    }
  };

  const cartItemCount = cartItems.reduce(
    (total, item) => total + Number(item.quantity_to_buy || 0),
    0
  );

  const handleSaveCarouselImages = async (event) => {
    event.preventDefault();
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setCarouselMessage("Please log in again to update carousel images.");
      return;
    }

    setSavingCarousel(true);
    setCarouselMessage("");
    try {
      const response = await fetch("http://127.0.0.1:8000/carousel-images", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ images: carouselDraftImages }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not save carousel images.");
      }

      setCarouselImages(data.images);
      setCurrentCarouselIndex(0);
      setIsEditingCarousel(false);
      setCarouselMessage("Carousel images saved.");
    } catch (error) {
      setCarouselMessage(error instanceof Error ? error.message : "Could not save carousel images.");
    } finally {
      setSavingCarousel(false);
    }
  };

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let closestIndex = 0;
    let closestDistance = Infinity;
    Array.from(carousel.children).forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - carousel.offsetLeft - carousel.scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setCurrentCarouselIndex(closestIndex);
  };

  const scrollToCarouselSlide = (index) => {
    const carousel = carouselRef.current;
    const slide = carousel?.children[index];
    if (!carousel || !slide) return;

    carousel.scrollTo({
      left: slide.offsetLeft - carousel.offsetLeft,
      behavior: "smooth",
    });
    setCurrentCarouselIndex(index);
  };

  return (
    <div className="home-screen">
      {loginMessage && <div className="home-success-message" role="status">{loginMessage}</div>}
      <Navbar
        className="navbar"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => setSearchQuery((query) => query.trim())}
      />
      <div
        className="tab"
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        onMouseEnter={() => setIsCarouselPaused(true)}
        onMouseLeave={() => setIsCarouselPaused(false)}
      >
        {carouselImages.map((image, index) => (
          <div className="cart-tab" key={image}>
            <img src={image} alt={`Featured product ${index + 1}`} />
          </div>
        ))}
      </div>
      <div className="carousel-dots" aria-label="Featured products">
        {carouselImages.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={index === currentCarouselIndex ? "active" : ""}
            aria-label={`Go to slide ${index + 1}`}
            aria-pressed={index === currentCarouselIndex}
            onClick={() => scrollToCarouselSlide(index)}
          />
        ))}
      </div>
      {isAdmin && (
        <section className="carousel-admin-panel">
          {isEditingCarousel ? (
            <form onSubmit={handleSaveCarouselImages}>
              <h2>Manage carousel image URLs</h2>
              {carouselDraftImages.map((image, index) => (
                <div className="carousel-image-editor-row" key={index}>
                  <label htmlFor={`carousel-image-url-${index}`}>Image URL {index + 1}</label>
                  <input
                    id={`carousel-image-url-${index}`}
                    type="url"
                    value={image}
                    onChange={(event) => {
                      const updatedImages = [...carouselDraftImages];
                      updatedImages[index] = event.target.value;
                      setCarouselDraftImages(updatedImages);
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setCarouselDraftImages(
                      carouselDraftImages.filter((_, imageIndex) => imageIndex !== index)
                    )}
                    disabled={carouselDraftImages.length === 1}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="carousel-image-editor-actions">
                <button
                  type="button"
                  onClick={() => setCarouselDraftImages([...carouselDraftImages, ""])}
                  disabled={carouselDraftImages.length >= 20}
                >
                  Add image
                </button>
                <button className="saving-btn" type="submit" disabled={savingCarousel}>
                  {savingCarousel ? "Saving..." : "Save images"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCarousel(false);
                    setCarouselMessage("");
                  }}
                  disabled={savingCarousel}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCarouselDraftImages([...carouselImages]);
                setCarouselMessage("");
                setIsEditingCarousel(true);
              }}
            >
              Manage carousel images
            </button>
          )}
          {carouselMessage && <p role="status">{carouselMessage}</p>}
        </section>
      )}
      {isAdmin && (
        <div className="admin-controls">
        <section className="admin-creation">
          <button
            className="add-admin-button"
            type="button"
            onClick={() => {
              setShowAddProductForm(true);
              setUpdateMessage("");
            }}
          >
            Add New Product
          </button>
          {showAddProductForm && (
            <div
              className="admin-product-modal-backdrop"
              onClick={() => setShowAddProductForm(false)}
            >
              <section
                className="admin-product-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-product-title"
                onClick={(event) => event.stopPropagation()}
              >
                <form className="admin-creation-form" onSubmit={handleCreateProduct}>
                  <div className="admin-product-modal-heading">
                    <h2 id="add-product-title">Add New Product</h2>
                    <button
                      className="cart-popup-close"
                      type="button"
                      aria-label="Close add product form"
                      onClick={() => setShowAddProductForm(false)}
                    >
                      &times;
                    </button>
                  </div>
              <label>
                Product name
                <input
                  value={addProductForm.name} placeholder="Enter Product Name"
                  onChange={(event) => setAddProductForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addProductForm.price}  placeholder="Enter Price"
                  onChange={(event) => setAddProductForm((current) => ({ ...current, price: event.target.value }))}
                  required
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addProductForm.quantity} placeholder="Add Quantity"
                  onChange={(event) => setAddProductForm((current) => ({ ...current, quantity: event.target.value }))}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={addProductForm.description} placeholder="Description here"
                  onChange={(event) => setAddProductForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <label>
                Image URL
                <input
                  type="url"
                  value={addProductForm.image} placeholder="Add Image url here"
                  onChange={(event) => setAddProductForm((current) => ({ ...current, image: event.target.value }))}
                />
              </label>
              <div className="admin-creation-actions">
                {/* <button
                  type="button"
                  className="admin-product-cancel"
                  onClick={() => setShowAddProductForm(false)}
                  disabled={savingNewProduct}
                >
                  Cancel
                </button> */}
                <button type="submit" disabled={savingNewProduct}>
                  {savingNewProduct ? "Adding..." : "Add Product"}
                </button>
              </div>
                </form>
              </section>
            </div>
          )}
        </section>
        <section className="admin-creation">
          <button
            className="add-admin-button"
            type="button"
            onClick={() => {
              setShowAdminForm(true);
              setAdminMessage("");
            }}
          >
            Add Admin
          </button>
          {showAdminForm && (
            <div
              className="admin-product-modal-backdrop"
              onClick={() => setShowAdminForm(false)}
            >
              <section
                className="admin-product-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-admin-title"
                onClick={(event) => event.stopPropagation()}
              >
                <form className="admin-creation-form" onSubmit={handleCreateAdmin}>
                  <div className="admin-product-modal-heading">
                    <h2 id="add-admin-title">Add Admin</h2>
                    <button
                      className="cart-popup-close"
                      type="button"
                      aria-label="Close add admin form"
                      onClick={() => setShowAdminForm(false)}
                    >
                      &times;
                    </button>
                  </div>
              <label>
                Username
                <input
                  value={adminForm.username} placeholder="Enter Your Usernme"
                  onChange={(event) => setAdminForm((current) => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={adminForm.password} placeholder="Enter Password"
                  onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={adminForm.email} placeholder="Enter Your Email"
                  onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Phone number
                <input
                  type="tel"
                  value={adminForm.phone_number} placeholder="Enter mobile Number"
                  onChange={(event) => setAdminForm((current) => ({
                    ...current,
                    phone_number: event.target.value.replace(/\D/g, "").slice(0, 10),
                  }))}
                  required
                />
              </label>
              <label>
                Age
                <input
                  type="number"
                  min="1"
                  value={adminForm.age} placeholder="Enter Age"
                  onChange={(event) => setAdminForm((current) => 
                   ({ ...current, age: event.target.value.slice(0,2)}))}
                  required
                />
              </label>
              <label>
                Gender
                <select
                  value={adminForm.Gender}
                  onChange={(event) => setAdminForm((current) => ({ ...current, Gender: event.target.value }))}
                  required>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <div className="admin-creation-actions">
                {/* <button
                  type="button"
                  className="admin-product-cancel"
                  onClick={() => setShowAdminForm(false)}
                  disabled={savingAdmin}
                >
                  Cancel
                </button> */}
                <button type="submit" disabled={savingAdmin}>
                  {savingAdmin ? "Creating..." : "Create Admin"}
                </button>
              </div>
                </form>
                {adminMessage && <p role="status">{adminMessage}</p>}
              </section>
            </div>
          )}
        </section>
        </div>
      )}
      <div className="product-list">
        {loadingProducts && <p role="status">Loading products...</p>}
        {productError && <p role="alert">{productError}</p>}
        {!loadingProducts && !productError && filteredProducts.length === 0 && (
          <p>No products found.</p>
        )}
        {filteredProducts.map((product) => (
          <div className="cart" key={product.id}>

            {product.image
              ? <img src={product.image} alt={product.name} />
              : <div className="product-image-placeholder" role="img" aria-label={`${product.name} image unavailable`} />}

            <div className="cart-details">

              {editingProductId === product.id ? (
                <form className="product-edit-form" onSubmit={(event) => handleUpdateProduct(event, product)}>
                  <label>
                    Name
                    <input
                      value={editForm.name} placeholder="Enter product name"
                      onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                      required/>
                  </label>
                  <label>
                    Price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}  placeholder="Add product price"
                      onChange={(event) => setEditForm((current) => ({ ...current, price: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.quantity} placeholder="add total quantity"
                      onChange={(event) => setEditForm((current) => ({ ...current, quantity: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Image URL
                    <input
                      type="url"
                      value={editForm.image} placeholder="place image url here"
                      onChange={(event) => setEditForm((current) => ({ ...current, image: event.target.value }))}
                    />
                  </label>
                  <button className="buy-now" type="submit" disabled={savingProduct}>
                    {savingProduct ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="buy-now"
                    type="button"
                    onClick={() => setEditingProductId(null)}
                    disabled={savingProduct}
                  >
                    Cancel
                  </button>
                  
                </form>
              ) : (
                <>
                  <h3>{highlightMatches(product.name, searchQuery)}</h3>

                  <p style={product.available && getAvailableStock(product) > 0 ? { color: "green", fontSize: "10px", margin: "0px 0" } : { color: "red", fontSize: "10px", margin: "0px 0" }}>
                    {product.available && getAvailableStock(product) > 0 ? "Available" : "Out of Stock"} Stock: {product.stock}
                  </p>

                  <p className="product-price">₹{product.price.toFixed(2)}</p> 

                  <div className="quantity-control" aria-label="Select quantity">

                    <span style={{ fontSize: "15px" }}>Qty</span>

                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQuantities((current) => ({
                        ...current,
                        [product.id]: Math.max(0, getSelectedQuantity(product) - 1)
                      }))}
                      disabled={getSelectedQuantity(product) <= 1}
                    >
                      -
                    </button>

                    <span className="quantity-value" aria-live="polite">
                      {getSelectedQuantity(product)}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQuantities((current) => ({
                        ...current,
                        [product.id]: Math.min(
                          getSelectedQuantity(product) + 1,
                          getAvailableStock(product)
                        )
                      }))}
                      disabled={
                        !product.available ||
                        getSelectedQuantity(product) >= getAvailableStock(product)
                      }
                    >
                      +
                    </button>

                  </div>
                  {stockMessage?.productId === product.id && (
                    <p className="stock-message" role="alert">{stockMessage.message}</p>
                  )}
                  {/* {(!product.available || getAvailableStock(product) === 0) && (
                    <p className="stock-message" role="status">Out of Stock</p>
                  )} */}
                  <button
                    className={`buy-now add-to-cart-button${getCartQuantity(product.id) > 0 ? " is-added" : ""}`}
                    type="button"
                    disabled={!product.available || getSelectedQuantity(product) < 1}
                    onClick={() => addToCart(product, getSelectedQuantity(product))}
                  >
                    Add to cart
                  </button>
                  {isAdmin && (
                    <>
                      <button className="buy-now" type="button" onClick={() => startEditing(product)}>
                        Edit
                      </button>
                      <button
                        className="delete-product-button"
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        disabled={deletingProductId === product.id}
                      >
                        {deletingProductId === product.id ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {updateMessage && <p className="product-update-message" role="status">{updateMessage}</p>}
      {!loadingCart && cartItemCount > 0 && (
        <button
          className="home-cart-count"
          type="button"
          aria-label={`Open cart, ${cartItemCount} ${cartItemCount === 1 ? "item" : "items"}`}
          onClick={() => navigate("/details")}
        >
          <span aria-hidden="true">CART:</span>
          <div>BuyNow</div>
          <span className="home-cart-count-badge" aria-hidden="true">{cartItemCount}</span>
          
        </button>
      )}
    </div>
  );
};

export default Homescreen