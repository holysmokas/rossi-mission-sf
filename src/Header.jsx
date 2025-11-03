import React from "react";
import { Link } from "react-router-dom";
import "./index.css";

export default function Header() {
    return (
        <header className="header">
            <div className="header-container">
                <Link to="/" className="logo-area">
                    <img
                        src="/rossi-mission-sf/Rossi-Mission-SF-Logo.jpeg"
                        alt="Rossi Mission SF Logo"
                        className="logo"
                    />
                </Link>
                <nav className="nav">
                    <Link to="/" className="nav-link">Shop</Link>
                    <Link to="/gallery" className="nav-link">Gallery</Link>
                    <Link to="/events" className="nav-link">Events</Link>
                    <Link to="/about" className="nav-link">About Us</Link>
                    <Link to="/contact" className="nav-link">Contact Us</Link>
                </nav>
            </div>
        </header>
    );
}
