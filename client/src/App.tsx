import { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import PlannerPage from "./pages/PlannerPage";
import GuestListPage from "./pages/GuestListPage";
import GuestInviteView from "./pages/GuestInviteView";
import InspirationPage from "./pages/InspirationPage";
import BudgetPage from "./pages/BudgetPage";
import VendorsPage from "./pages/VendorsPage";
import * as api from "./api";
import { daysUntil, formatDateShort } from "./dateUtils";
import "./App.css";

function WeddingCountdown() {
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    api.getWeddingDate().then((d) => setDate(d.date)).catch(() => {});
  }, []);

  if (!date) return null;

  const days = daysUntil(date);
  const label =
    days > 0
      ? `${days} day${days === 1 ? "" : "s"} till the big day!`
      : days === 0
      ? "Today's the day!"
      : `Married since ${formatDateShort(date)}`;

  return <p className="wedding-countdown">{label}</p>;
}

function AppShell() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title-block">
          <h1>Our Wedding Planner</h1>
          <WeddingCountdown />
        </div>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Planner
          </NavLink>
          <NavLink to="/guests" className={({ isActive }) => (isActive ? "active" : "")}>
            Guest List
          </NavLink>
          <NavLink to="/budget" className={({ isActive }) => (isActive ? "active" : "")}>
            Budget
          </NavLink>
          <NavLink to="/vendors" className={({ isActive }) => (isActive ? "active" : "")}>
            Vendors
          </NavLink>
          <NavLink to="/inspiration" className={({ isActive }) => (isActive ? "active" : "")}>
            Inspiration
          </NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PlannerPage />} />
          <Route path="/guests" element={<GuestListPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/inspiration" element={<InspirationPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/guests/:ownerId" element={<GuestInviteView />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}

export default App;
