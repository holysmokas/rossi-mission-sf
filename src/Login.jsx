import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import "./index.css";

const API_URL = "https://script.google.com/macros/s/AKfycbzFl4SMpg8AfKohs11AWlfzJqThp6qDFS0FvcDz5taXFi8QWLw-S5yAM2eNQTbPeouO-w/exec";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "login", email, password });
      const res = await fetch(`${API_URL}?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/admin");
      } else {
        setError(data.error || "Invalid login");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Header />
      <main className="main">
        <h1 className="page-title">Admin Login</h1>
        <form onSubmit={handleSubmit} className="contact-form">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} className="btn">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </main>
      <footer className="footer">© 2025 Rossi Mission SF. All rights reserved.</footer>
    </div>
  );
}
