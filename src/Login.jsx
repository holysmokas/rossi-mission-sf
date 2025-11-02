import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "https://script.google.com/macros/s/AKfycbxX2isFuOJKt1cfjN7VGMU1BcZAqroPLhK2wLCy52wPR_T3Z4jbdH9A48NXMmG7zKUoPQ/exec";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/admin");
      } else {
        setError(data.error || "Invalid login");
      }
    } catch {
      setError("Network error");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🔐 Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
