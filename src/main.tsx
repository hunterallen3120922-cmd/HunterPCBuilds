import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { applyTheme } from "./content/theme";
import "./index.css";

applyTheme();

// HashRouter keeps deep links working on GitHub Pages (URLs look like /#/pc-builds)
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
