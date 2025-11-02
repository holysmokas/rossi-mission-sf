import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(to bottom right, #f9fafb, #f3f4f6)",
            }}
        >
            {/* Header */}
            <header
                style={{
                    background: "white",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                    position: "sticky",
                    top: 0,
                    zIndex: 50,
                }}
            >
                <div
                    style={{
                        maxWidth: "1280px",
                        margin: "0 auto",
                        padding: "0 1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: "4rem",
                    }}
                >
                    <div>
                        <Link
                            to="/"
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                background: "linear-gradient(to right, #f43f5e, #ec4899)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                textDecoration: "none",
                            }}
                        >
                            Rossi Mission SF
                        </Link>
                    </div>
                    <nav style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                        <Link
                            to="/"
                            style={{
                                color: "#f43f5e",
                                fontWeight: "600",
                                textDecoration: "none",
                            }}
                        >
                            Shop
                        </Link>
                        <Link
                            to="/about"
                            style={{
                                color: "#374151",
                                fontWeight: "500",
                                textDecoration: "none",
                            }}
                        >
                            About
                        </Link>
                        <Link
                            to="/login"
                            style={{
                                padding: "0.5rem 1rem",
                                background: "#f43f5e",
                                color: "white",
                                borderRadius: "0.5rem",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: "500",
                                textDecoration: "none",
                            }}
                        >
                            Sign In
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section
                style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    padding: "4rem 1rem",
                    textAlign: "center",
                }}
            >
                <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
                    <h1
                        style={{
                            fontSize: "3rem",
                            fontWeight: "bold",
                            marginBottom: "1rem",
                            textShadow: "0 2px 10px rgba(0,0,0,0.2)",
                        }}
                    >
                        Shop Our Collection
                    </h1>
                    <p
                        style={{
                            fontSize: "1.25rem",
                            maxWidth: "40rem",
                            margin: "0 auto",
                            opacity: 0.95,
                        }}
                    >
                        Explore one-of-a-kind graffiti-inspired art pieces and exclusive
                        fashion collaborations.
                    </p>
                </div>
            </section>

            {/* Product Grid */}
            <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "4rem 1rem" }}>
                {loading ? (
                    <p style={{ textAlign: "center" }}>Loading products...</p>
                ) : products.length === 0 ? (
                    <p style={{ textAlign: "center" }}>No products found.</p>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "2rem",
                        }}
                    >
                        {products.map((p) => (
                            <div
                                key={p.id}
                                style={{
                                    background: "white",
                                    borderRadius: "1rem",
                                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                    padding: "1.5rem",
                                    textAlign: "center",
                                }}
                            >
                                {p.image && (
                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        style={{
                                            width: "100%",
                                            height: "250px",
                                            objectFit: "cover",
                                            borderRadius: "0.75rem",
                                            marginBottom: "1rem",
                                        }}
                                    />
                                )}
                                <h3
                                    style={{
                                        fontSize: "1.25rem",
                                        fontWeight: "bold",
                                        color: "#111827",
                                    }}
                                >
                                    {p.name}
                                </h3>
                                <p style={{ color: "#6b7280", margin: "0.5rem 0" }}>{p.description}</p>
                                <p style={{ fontWeight: "bold", fontSize: "1.1rem" }}>${p.price}</p>
                                {p.soldOut ? (
                                    <p style={{ color: "red", marginTop: "1rem" }}>❌ Sold Out</p>
                                ) : (
                                    <a
                                        href={p.paymentLink || p.stripeLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: "none" }}
                                    >
                                        <button
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "#4CAF50",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "0.5rem",
                                                marginTop: "1rem",
                                                cursor: "pointer",
                                                fontWeight: "500",
                                            }}
                                        >
                                            Buy Now
                                        </button>
                                    </a>
                                )}
                                {p.isNew && (
                                    <div
                                        style={{
                                            marginTop: "0.5rem",
                                            color: "#16a34a",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        🆕 New Arrival
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer
                style={{
                    background: "#111827",
                    color: "white",
                    padding: "2rem",
                    textAlign: "center",
                }}
            >
                <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
                    <p style={{ color: "#9ca3af" }}>© 2025 Rossi Mission SF. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
