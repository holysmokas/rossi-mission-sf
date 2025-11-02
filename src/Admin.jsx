import React, { useEffect, useState } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbzFl4SMpg8AfKohs11AWlfzJqThp6qDFS0FvcDz5taXFi8QWLw-S5yAM2eNQTbPeouO-w/exec";

export default function Admin() {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        id: "",
        name: "",
        description: "",
        price: "",
        image: "",
        stripeLink: "",
        paymentLink: "",
        soldOut: false,
        isNew: false,
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Use GET request with query parameter
            const res = await fetch(`${API_URL}?action=getProducts`);
            const data = await res.json();
            console.log("Fetched products:", data);
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching products:", err);
            setMessage("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({
            ...form,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const action = form.id ? "updateProduct" : "createProduct";

            // Build query string
            const params = new URLSearchParams({
                action,
                ...form,
                price: form.price.toString(),
                soldOut: form.soldOut.toString(),
                isNew: form.isNew.toString()
            });

            const res = await fetch(`${API_URL}?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                setMessage(data.message || "Saved successfully!");
                setForm({
                    id: "",
                    name: "",
                    description: "",
                    price: "",
                    image: "",
                    stripeLink: "",
                    paymentLink: "",
                    soldOut: false,
                    isNew: false,
                });
                fetchProducts();
            } else {
                setMessage("Error: " + data.error);
            }
        } catch (err) {
            console.error("Save error:", err);
            setMessage("Request failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product) => {
        setForm(product);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this product?")) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}?action=deleteProduct&id=${id}`);
            const data = await res.json();
            if (data.success) {
                setMessage(data.message);
                fetchProducts();
            } else {
                setMessage(data.error);
            }
        } catch (err) {
            setMessage("Error deleting product");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
            <h1>🛠️ Admin Dashboard</h1>

            <form onSubmit={handleSubmit} style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <input
                    name="name"
                    placeholder="Name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    style={{ padding: "0.5rem" }}
                />
                <input
                    name="description"
                    placeholder="Description"
                    value={form.description}
                    onChange={handleChange}
                    required
                    style={{ padding: "0.5rem" }}
                />
                <input
                    name="price"
                    placeholder="Price"
                    type="number"
                    value={form.price}
                    onChange={handleChange}
                    required
                    style={{ padding: "0.5rem" }}
                />
                <input
                    name="image"
                    placeholder="Image URL"
                    value={form.image}
                    onChange={handleChange}
                    style={{ padding: "0.5rem" }}
                />
                <input
                    name="stripeLink"
                    placeholder="Stripe Link"
                    value={form.stripeLink}
                    onChange={handleChange}
                    style={{ padding: "0.5rem" }}
                />
                <input
                    name="paymentLink"
                    placeholder="Payment Link"
                    value={form.paymentLink}
                    onChange={handleChange}
                    style={{ padding: "0.5rem" }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                        type="checkbox"
                        name="soldOut"
                        checked={form.soldOut}
                        onChange={handleChange}
                    />
                    Sold Out
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                        type="checkbox"
                        name="isNew"
                        checked={form.isNew}
                        onChange={handleChange}
                    />
                    New Product
                </label>
                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: "0.75rem", backgroundColor: "#4CAF50", color: "white", border: "none", cursor: "pointer" }}
                >
                    {form.id ? "Update" : "Create"} Product
                </button>
            </form>

            {message && <p style={{ padding: "1rem", backgroundColor: "#f0f0f0", borderRadius: "4px" }}>{message}</p>}

            <h2>All Products ({products.length})</h2>
            {loading ? (
                <p>Loading...</p>
            ) : products.length === 0 ? (
                <p>No products found. Create your first product!</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {products.map((p) => (
                        <li key={p.id} style={{ padding: "1rem", marginBottom: "0.5rem", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
                            <strong>{p.name}</strong> - ${p.price}
                            {p.isNew && <span style={{ marginLeft: "0.5rem", color: "green" }}>🆕 NEW</span>}
                            {p.soldOut && <span style={{ marginLeft: "0.5rem", color: "red" }}>❌ SOLD OUT</span>}
                            <div style={{ marginTop: "0.5rem" }}>
                                <button onClick={() => handleEdit(p)} style={{ marginRight: "0.5rem", padding: "0.25rem 0.5rem" }}>Edit</button>
                                <button onClick={() => handleDelete(p.id)} style={{ padding: "0.25rem 0.5rem", backgroundColor: "#f44336", color: "white", border: "none", cursor: "pointer" }}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}