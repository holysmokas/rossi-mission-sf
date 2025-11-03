import React, { useEffect, useState } from "react";
import Header from "./Header";
import "./index.css";

const API_URL =
    "https://script.google.com/macros/s/AKfycbzFl4SMpg8AfKohs11AWlfzJqThp6qDFS0FvcDz5taXFi8QWLw-S5yAM2eNQTbPeouO-w/exec";

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
            if (Array.isArray(data)) setProducts(data);
        } catch (err) {
            console.error("Error fetching products:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <Header />
            <main className="main">
                <h1 className="page-title">Shop Merchandise</h1>
                {loading ? (
                    <p>Loading products...</p>
                ) : (
                    <div className="product-grid">
                        {products.map((p) => (
                            <div key={p.id} className="product-card">
                                {p.image && <img src={p.image} alt={p.name} className="product-img" />}
                                <h3>{p.name}</h3>
                                <p className="product-desc">{p.description}</p>
                                <p className="product-price">${p.price}</p>
                                {p.soldOut ? (
                                    <p className="sold-out">Sold Out</p>
                                ) : (
                                    <a href={p.paymentLink || p.stripeLink} target="_blank" rel="noopener noreferrer">
                                        <button className="btn">Buy Now</button>
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <footer className="footer">
                © 2025 Rossi Mission SF. All rights reserved.
            </footer>
        </div>
    );
}
