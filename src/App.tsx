import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./features/auth/pages/login";
import Dashboard from "./features/dashboard/pages/dashboard";
import ViewDocuments from "./features/view_document/pages/view_document";

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/documents" element={<ViewDocuments />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;