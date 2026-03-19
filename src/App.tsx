import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./features/auth/pages/login";
import AdminDashboard from "./features/dashboard/pages/admin_dashboard";
import AssociateDashboard from "./features/dashboard/pages/associate_dashboard";
import ViewDocuments from "./features/view_document/pages/view_document";
import Invoices from "./features/view_document/pages/invoices";
import PurchaseOrders from "./features/view_document/pages/purchase_orders";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/associate-dashboard" element={<AssociateDashboard />} />
        <Route path="/documents" element={<ViewDocuments />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;