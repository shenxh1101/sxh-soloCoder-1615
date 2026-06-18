import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import RepairList from "@/pages/RepairList";
import NewRepair from "@/pages/NewRepair";
import RepairDetail from "@/pages/RepairDetail";
import Inventory from "@/pages/Inventory";
import NewPart from "@/pages/NewPart";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Suppliers from "@/pages/Suppliers";
import Statistics from "@/pages/Statistics";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/repairs" element={<RepairList />} />
          <Route path="/repairs/new" element={<NewRepair />} />
          <Route path="/repairs/:id" element={<RepairDetail />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/new" element={<NewPart />} />
          <Route path="/purchases" element={<PurchaseOrders />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/statistics" element={<Statistics />} />
        </Route>
      </Routes>
    </Router>
  );
}
