import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Shop from "./Shop";
import About from "./About";
import Login from "./Login";
import Admin from "./Admin";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Shop />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </HashRouter>
  );
}
