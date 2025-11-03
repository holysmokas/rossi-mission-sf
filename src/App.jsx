import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Shop from "./Shop";
import Gallery from "./Gallery";
import Events from "./Events";
import About from "./About";
import Contact from "./Contact";
import Login from "./Login";
import "./index.css";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Shop />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/events" element={<Events />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </HashRouter>
  );
}
