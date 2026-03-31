import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Default to dark mode unless user has explicitly chosen light
if (localStorage.getItem("aura-dark-mode") === null || localStorage.getItem("aura-dark-mode") === "true") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
