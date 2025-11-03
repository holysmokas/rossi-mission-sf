import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./index.css";

export default function Header() {
    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const menuRef = useRef(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));

        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);


    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
        setMenuOpen(false);
        navigate("/");
    };

    const toggleMenu = () => setMenuOpen((prev) => !prev);
    const closeMenu = () => setMenuOpen(false);

    // 🔲 Detect clicks outside the menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    return (
        <header className={`header ${scrolled ? "scrolled" : ""}`}>
            <div className="header-container">
                <Link to="/" className="logo-area" onClick={closeMenu}>
                    <img
                        src="/rossi-mission-sf/Rossi-Mission-SF-Logo.jpeg"
                        alt="Rossi Mission SF Logo"
                        className="logo"
                    />
                </Link>

                {/* Hamburger icon */}
                <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
                    ☰
                </button>

                <nav ref={menuRef} className={`nav ${menuOpen ? "open" : ""}`}>
                    <Link to="/" className="nav-link" onClick={closeMenu}>Shop</Link>
                    <Link to="/gallery" className="nav-link" onClick={closeMenu}>Gallery</Link>
                    <Link to="/events" className="nav-link" onClick={closeMenu}>Events</Link>
                    <Link to="/about" className="nav-link" onClick={closeMenu}>About Us</Link>
                    <Link to="/contact" className="nav-link" onClick={closeMenu}>Contact Us</Link>

                    {!user ? (
                        <Link to="/login" className="btn nav-login-btn" onClick={closeMenu}>Login</Link>
                    ) : (
                        <>
                            <Link to="/admin" className="btn nav-login-btn" onClick={closeMenu}>Admin</Link>
                            <button onClick={handleLogout} className="btn nav-logout-btn">Logout</button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
