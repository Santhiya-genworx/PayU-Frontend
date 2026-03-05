import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./features/auth/pages/login";
import Dashboard from "./features/dashboard/pages/dashboard";

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;