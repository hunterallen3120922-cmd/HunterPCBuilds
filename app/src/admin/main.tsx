import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import AdminApp from "./AdminApp";
import { listenForInstall } from "./install";
import { applyTheme } from "../content/theme";
import "../fonts.css";
import "../index.css";

/**
 * Entry for admin.html: the admin portal on its own page so it can be installed as an app
 * (its own icon, opens in its own window) without the public site becoming an app too.
 */
applyTheme();
listenForInstall();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./admin-sw.js", { scope: "./admin.html" }).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AdminApp />
    </HashRouter>
  </StrictMode>,
);
