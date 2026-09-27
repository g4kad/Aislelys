import { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate, useParams } from "react-router-dom";
import PlannerPage from "./pages/PlannerPage";
import GuestListPage from "./pages/GuestListPage";
import GuestInviteView from "./pages/GuestInviteView";
import InspirationPage from "./pages/InspirationPage";
import BudgetPage from "./pages/BudgetPage";
import VendorsPage from "./pages/VendorsPage";
import SignupPage from "./pages/SignupPage";
import AuthGate, { LoginPage } from "./components/AuthGate";
import UserMenu from "./components/UserMenu";
import { IconCalendar, IconUsers, IconWallet, IconStore, IconImage } from "./components/Icons";
import { AuthProvider, useAuth } from "./auth";
import * as api from "./api";
import { daysUntil, formatDateShort } from "./dateUtils";
import { coupleTitle } from "./textUtils";
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
  const { user, logout, accounts } = useAuth();
  const { coupleId } = useParams<{ coupleId: string }>();
  const base = `/${coupleId}`;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title-block">
          <h1>{coupleTitle(accounts.map((a) => a.name))}</h1>
          <WeddingCountdown />
        </div>
        <nav className="app-nav">
          <NavLink to={base} end className={({ isActive }) => (isActive ? "active" : "")}>
            <IconCalendar className="app-nav-icon" />
            Planner
          </NavLink>
          <NavLink to={`${base}/guest-list`} className={({ isActive }) => (isActive ? "active" : "")}>
            <IconUsers className="app-nav-icon" />
            Guest List
          </NavLink>
          <NavLink to={`${base}/budget`} className={({ isActive }) => (isActive ? "active" : "")}>
            <IconWallet className="app-nav-icon" />
            Budget
          </NavLink>
          <NavLink to={`${base}/vendors`} className={({ isActive }) => (isActive ? "active" : "")}>
            <IconStore className="app-nav-icon" />
            Vendors
          </NavLink>
          <NavLink to={`${base}/inspiration`} className={({ isActive }) => (isActive ? "active" : "")}>
            <IconImage className="app-nav-icon" />
            Inspiration
          </NavLink>
        </nav>
        <div className="app-header-actions">
          {user && <UserMenu user={user} onLogout={logout} />}
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PlannerPage />} />
          <Route path="/guest-list" element={<GuestListPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/inspiration" element={<InspirationPage />} />
        </Routes>
      </main>
    </div>
  );
}

function Workspace() {
  const { coupleId } = useParams<{ coupleId: string }>();
  if (!coupleId) return null;
  return (
    <AuthProvider coupleId={coupleId}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <AuthGate>
              <AppShell />
            </AuthGate>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

function RootRedirect() {
  const [target, setTarget] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .getDefaultCouple()
      .then((r) => setTarget(`/${r.coupleId}`))
      .catch(() => setNotFound(true));
  }, []);

  if (notFound) return <Navigate to="/signup" replace />;
  if (!target) return <p className="empty-hint">Loading…</p>;
  return <Navigate to={target} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/guests/:ownerId" element={<GuestInviteView />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route path="/:coupleId/*" element={<Workspace />} />
    </Routes>
  );
}

export default App;
