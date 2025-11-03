import React from "react";
import Header from "./Header";
import "./index.css";

export default function About() {
    return (
        <div className="page">
            <Header />
            <main className="main">
                <h1 className="page-title">About Us</h1>
                <p>
                    Rossi Mission SF is a movement born from art, emotion, and purpose.
                    Every line, every piece, every collaboration carries the weight of the
                    city that shaped us. We pour our stories, our pain, our hope — so that
                    those who see it feel something real.
                </p>
                <p>
                    We believe art should connect people — it should make you stop, think,
                    and sometimes even cry a river. Because when something moves you that
                    deeply, it means it’s true.
                </p>
            </main>
            <footer className="footer">© 2025 Rossi Mission SF. All rights reserved.</footer>
        </div>
    );
}
