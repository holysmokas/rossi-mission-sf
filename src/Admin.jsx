import React, { useEffect, useState } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbwl2szhF32egWYfi6zYJGhXYOyqB7GwY5rzXqsD8iKlqtL3AlXGRBEjQqAjOT2YBmUk7A/exec";

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

    // Fetch all products
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "getProducts" }),
            });
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            console.error("Error fetching products:", err);
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
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...form }),
            });
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
            setMessage("Request failed");
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
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "deleteProduct", id }),
            });
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
        <div style={{ padding: "2rem" }}>
            <h1>🛠️ Admin Dashboard</h1>
            <form onSubmit={handleSubmit}>
                <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
                <input name="description" placeholder="Description" value={form.description} onChange={handleChange} required />
                <input name="price" placeholder="Price" type="number" value={form.price} onChange={handleChange} required />
                <input name="image" placeholder="Image URL" value={form.image} onChange={handleChange} />
                <input name="stripeLink" placeholder="Stripe Link" value={form.stripeLink} onChange={handleChange} />
                <input name="paymentLink" placeholder="Payment Link" value={form.paymentLink} onChange={handleChange} />
                <label>
                    Sold Out
                    <input type="checkbox" name="soldOut" checked={form.soldOut} onChange={handleChange} />
                </label>
                <label>
                    New Product
                    <input type="checkbox" name="isNew" checked={form.isNew} onChange={handleChange} />
                </label>
                <button type="submit" disabled={loading}>{form.id ? "Update" : "Create"} Product</button>
            </form>

            {message && <p>{message}</p>}

            <h2>All Products</h2>
            {loading ? <p>Loading...</p> : (
                <ul>
                    {products.map((p) => (
                        <li key={p.id}>
                            <strong>{p.name}</strong> - ${p.price}{" "}
                            <button onClick={() => handleEdit(p)}>Edit</button>
                            <button onClick={() => handleDelete(p.id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
