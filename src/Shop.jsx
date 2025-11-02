// Shop.jsx
import React, { useEffect, useState } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbzFl4SMpg8AfKohs11AWlfzJqThp6qDFS0FvcDz5taXFi8QWLw-S5yAM2eNQTbPeouO-w/exec";

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}?action=getProducts`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setProducts(data);
            }
        } catch (err) {
            console.error("Error fetching products:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p style={{ textAlign: "center" }}>Loading products...</p>;

    return (
        <div style={{ padding: "2rem" }}>
            <h1 style={{ textAlign: "center" }}>🛍️ Shop</h1>
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "2rem",
                marginTop: "2rem"
            }}>
                {products.map((p) => (
                    <div key={p.id} style={{
                        background: "white",
                        borderRadius: "1rem",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        padding: "1rem",
                        textAlign: "center"
                    }}>
                        <img src={p.image} alt={p.name} style={{ width: "100%", borderRadius: "0.5rem" }} />
                        <h3>{p.name}</h3>
                        <p>${p.price}</p>
                        {p.soldOut ? (
                            <p style={{ color: "red" }}>Sold Out</p>
                        ) : (
                            <a href={p.paymentLink || p.stripeLink} target="_blank" rel="noopener noreferrer">
                                <button style={{ padding: "0.5rem 1rem", background: "#4CAF50", color: "white", border: "none", borderRadius: "0.5rem" }}>
                                    Buy Now
                                </button>
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
