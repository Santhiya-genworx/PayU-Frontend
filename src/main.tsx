import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { setupInterceptors } from "./lib/axios";
import Toast from "./components/common/toast";
import type { ToastState } from "./types/toast";
import App from "./App";
import "./index.css";

function AppWithInterceptors() {
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "info" });

  setupInterceptors(
    (message, type) => setToast({ visible: true, message, type })
  );

  return (
    <>
      <App />
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ visible: false, message: "", type: "info" })}
        />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <AppWithInterceptors />
    </Provider>
  </StrictMode>
);