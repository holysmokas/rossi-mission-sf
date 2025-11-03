import React from "react";
import Header from "./Header";
import "./index.css";

export default function Events() {
    return (
        <div className="page">
            <Header />
            <main className="main">
                <h1 className="page-title">Events – Past & Upcoming</h1>
                <p>Stay tuned for upcoming exhibitions and community events by Rossi Mission SF.</p>
            </main>
            <footer className="footer">© 2025 Rossi Mission SF. All rights reserved.</footer>
        </div>
    );
}
