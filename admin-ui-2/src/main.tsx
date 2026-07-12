import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { AdminPage } from "./admin.page.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Theme appearance="light" accentColor="sky" grayColor="slate" radius="medium">
      <AdminPage />
    </Theme>
  </StrictMode>,
);
