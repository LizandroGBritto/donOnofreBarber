import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App.jsx";
import { attachSessionExpiredHandler } from "./utils/sessionInterceptor";
import "./index.css";

// Cubre las llamadas que usan `axios` directo (no la instancia de
// useApi.js) — ver src/utils/sessionInterceptor.js.
attachSessionExpiredHandler(axios);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
