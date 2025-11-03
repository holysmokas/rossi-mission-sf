import React from "react";
import Header from "./Header";
import "./index.css";

export default function Gallery() {
    return (
        <div className="page">
            <Header />
            <main className="main">
                <h1 className="page-title">Gallery – Art for Sale</h1>
                <p>Coming soon: a curated collection of Rossi Mission SF’s art pieces available for purchase.</p>
            </main>
            <footer className="footer">© 2025 Rossi Mission SF. All rights reserved.</footer>
        </div>
    );
}
