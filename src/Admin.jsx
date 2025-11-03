import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";

const API_URL =
    "https://script.google.com/macros/s/AKfycbzkkqF31wniNERaPh161216ZU1miYe7n_WfKXGWRUILXwhiddIaL8oFYiyNo9r6BFIf5g/exec";

export default function Admin() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [message, setMessage] = useState("");
    const [form, setForm] = useState({
        name: "",
        description: "",
        price: "",
        stripeLink: "",
        paymentLink: "",
        soldOut: false,
        isNew: false,
        image: "",
    });
    const [uploading, setUploading] = useState(false);

    // Load products
    useEffect(() => {
        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "getProducts" }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) setProducts(data);
            })
            .catch((err) => console.error("Failed to load products", err));
    }, []);

    // Upload image to Google Drive
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        setMessage("Uploading image...");

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result.split(",")[1];
            const payload = {
                action: "uploadFile",
                file: base64,
                filename: file.name,
            };

            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();

                if (data.success && data.fileUrl) {
                    setForm((prev) => ({ ...prev, image: data.fileUrl }));
                    setMessage("✅ Image uploaded successfully!");
                } else {
                    setMessage("❌ Upload failed: " + (data.error || "Unknown error"));
                }
            } catch (error) {
                console.error("Upload error:", error);
                setMessage("❌ Upload failed: Network or server error");
            }
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    // Create product
    const handleCreateProduct = async (e) => {
        e.preventDefault();
        setMessage("Creating product...");

        try {
            const payload = { action: "createProduct", ...form };
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                setMessage("✅ Product created successfully!");
                setProducts([...products, { ...form, id: data.id }]);
                setForm({
                    name: "",
                    description: "",
                    price: "",
                    stripeLink: "",
                    paymentLink: "",
                    soldOut: false,
                    isNew: false,
                    image: "",
                });
            } else {
                setMessage("❌ Failed to create product: " + data.error);
            }
        } catch (error) {
            console.error("Create product error:", error);
            setMessage("❌ Network or server error");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    const handleGoBack = () => navigate(-1);

    return (
        <>
            {/* Site Header */}
            <header className="header">
                <div className="header-container">
                    <img src="Rossi-Mission-SF-Logo.jpeg" alt="Logo" className="logo" />
                    <nav className="nav">
                        <button onClick={handleGoBack} className="nav-logout-btn">
                            ← Go Back
                        </button>
                        <button onClick={handleLogout} className="nav-logout-btn">
                            Logout
                        </button>
                    </nav>
                </div>
            </header>

            <main className="main">
                <h1 className="page-title">Admin Dashboard</h1>

                <form onSubmit={handleCreateProduct} className="contact-form">
                    <input
                        type="text"
                        placeholder="Product Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <textarea
                        placeholder="Product Description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Price"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        required
                    />

                    {/* Image Upload */}
                    <div>
                        <label>Product Image</label>
                        <input type="file" accept="image/*" onChange={handleFileUpload} />
                        {uploading && <p>⏳ Uploading...</p>}
                        {form.image && (
                            <img
                                src={form.image}
                                alt="Preview"
                                className="product-img"
                                style={{
                                    width: "150px",
                                    marginTop: "1rem",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                }}
                            />
                        )}
                    </div>

                    <input
                        type="text"
                        placeholder="Stripe Link"
                        value={form.stripeLink}
                        onChange={(e) => setForm({ ...form, stripeLink: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Payment Link"
                        value={form.paymentLink}
                        onChange={(e) => setForm({ ...form, paymentLink: e.target.value })}
                    />

                    <label>
                        <input
                            type="checkbox"
                            checked={form.soldOut}
                            onChange={(e) => setForm({ ...form, soldOut: e.target.checked })}
                        />{" "}
                        Sold Out
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={form.isNew}
                            onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                        />{" "}
                        New Product
                    </label>

                    <button type="submit" className="btn">
                        Create Product
                    </button>
                </form>

                {message && <p className="error-text">{message}</p>}

                <h2 className="page-title">All Products ({products.length})</h2>
                <div className="product-grid">
                    {products.length > 0 ? (
                        products.map((p) => (
                            <div key={p.id} className="product-card">
                                <img src={p.image} alt={p.name} className="product-img" />
                                <h4>{p.name}</h4>
                                <p>${p.price}</p>
                            </div>
                        ))
                    ) : (
                        <p>No products found.</p>
                    )}
                </div>
            </main>

            <footer className="footer">
                <p>© {new Date().getFullYear()} Rossi Mission SF. All rights reserved.</p>
            </footer>
        </>
    );
}
