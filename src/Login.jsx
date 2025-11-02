import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      // Use GET request with query parameters
      const params = new URLSearchParams({
        action: "login",
        email,
        password
      });

      const res = await fetch(`${API_URL}?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/admin");
      } else {
        setError(data.error || "Invalid login");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "400px", margin: "50px auto" }}>
      <h1>🔐 Admin Login</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "0.5rem" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "0.5rem" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "0.75rem", backgroundColor: "#2196F3", color: "white", border: "none", cursor: "pointer" }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f0f0f0", borderRadius: "4px" }}>
        <p><strong>Demo Credentials:</strong></p>
        <p>Email: admin@rossimissionsf.com</p>
        <p>Password: admin123</p>
      </div>
    </div>
  );
}