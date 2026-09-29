import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useParams } from "react-router-dom";
import PlannerPage from "./pages/PlannerPage";
import GuestListPage from "./pages/GuestListPage";
import GuestInviteView from "./pages/GuestInviteView";
import InspirationPage from "./pages/InspirationPage";
import BudgetPage from "./pages/BudgetPage";
import VendorsPage from "./pages/VendorsPage";
import SignupPage from "./pages/SignupPage";
import SettingsPage from "./pages/SettingsPage";
import OverviewPage from "./pages/OverviewPage";
import HomePage from "./home/HomePage";
import { TermsPage, PrivacyPage } from "./home/LegalPage";
import AuthGate, { LoginPage } from "./components/AuthGate";
import UserMenu from "./components/UserMenu";
import { IconCalendar, IconUsers, IconWallet, IconStore, IconImage, IconHome } from "./components/Icons";
import { AuthProvider, useAuth } from "./auth";
import * as api from "./api";
import { daysUntil, formatDateShort } from "./dateUtils";
import { coupleTitle } from "./textUtils";
import "./App.css";

function WeddingCountdown({ date }: { date: string | null }) {
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
  // lives here (not in the countdown) so saving it on the settings page
  // updates the header straight away
  const [weddingDate, setWeddingDate] = useState<string | null>(null);

  useEffect(() => {
    api.getWeddingDate().then((d) => setWeddingDate(d.date)).catch(() => {});
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title-block">
          <h1>{coupleTitle(accounts.map((a) => a.name))}</h1>
          <WeddingCountdown date={weddingDate} />
        </div>
        <nav className="app-nav">
          <NavLink to={base} end className={({ isActive }) => (isActive ? "active" : "")}>
            <IconHome className="app-nav-icon" />
            Overview
          </NavLink>
          <NavLink to={`${base}/planner`} className={({ isActive }) => (isActive ? "active" : "")}>
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
          {user && <UserMenu user={user} settingsPath={`${base}/settings`} onLogout={logout} />}
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<OverviewPage weddingDate={weddingDate} />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/guest-list" element={<GuestListPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/inspiration" element={<InspirationPage />} />
          <Route
            path="/settings"
            element={<SettingsPage weddingDate={weddingDate} onWeddingDateChange={setWeddingDate} />}
          />
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

function App() {
  return (
    <Routes>
      <Route path="/guests/:ownerId" element={<GuestInviteView />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/:coupleId/*" element={<Workspace />} />
    </Routes>
  );
}

export default App;
