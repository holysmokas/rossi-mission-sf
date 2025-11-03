import React, { useState } from "react";
import Header from "./Header";
import "./index.css";

export default function Contact() {
    const [form, setForm] = useState({ name: "", email: "", message: "" });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Message sent. Thank you for reaching out!");
        setForm({ name: "", email: "", message: "" });
    };

    return (
        <div className="page">
            <Header />
            <main className="main">
                <h1 className="page-title">Contact Us</h1>
                <form className="contact-form" onSubmit={handleSubmit}>
                    <input name="name" placeholder="Your Name" value={form.name} onChange={handleChange} required />
                    <input name="email" type="email" placeholder="Your Email" value={form.email} onChange={handleChange} required />
                    <textarea name="message" placeholder="Your Message" rows="5" value={form.message} onChange={handleChange} required />
                    <button type="submit" className="btn">Send Message</button>
                </form>
            </main>
            <footer className="footer">© 2025 Rossi Mission SF. All rights reserved.</footer>
        </div>
    );
}
