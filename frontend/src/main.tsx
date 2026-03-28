
  import React from "react";
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { UserProfileProvider } from "./app/context/UserProfileContext.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <UserProfileProvider>
      <App />
    </UserProfileProvider>,
  );
  