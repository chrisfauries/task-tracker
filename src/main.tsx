import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import EventBoundary from "./EventBoundary.tsx";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EventBoundary>
      <App />
    </EventBoundary>
  </StrictMode>
);
