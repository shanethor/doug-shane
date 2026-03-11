import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore dark mode preference before first paint
if (localStorage.getItem("aura-dark-mode") === "true") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
