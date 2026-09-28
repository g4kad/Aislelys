import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../api";
import "./home.css";

// Public marketing page at the site root. Kept separate from the app: its own
// folder and stylesheet (every class is prefixed "hp-"), and it only reaches
// into the app through /signup and a couple's own planner address.

const PILLARS = [
  { num: "01", name: "Planner", line: "Shared to-dos you can assign to each other.", href: "#planner" },
  { num: "02", name: "Guest list", line: "Lists for each side — and a link your family can add to.", href: "#guests" },
  { num: "03", name: "Budget", line: "What's left, live — with every vendor linked in.", href: "#budget" },
  { num: "04", name: "Inspiration", line: "One board for every idea. Heart the ones you both love.", href: "#inspiration" },
];

const HERO_CARDS = [
  { title: "Shortlist three florists", cat: "Décor", color: "#B99767", meta: "Due Fri", who: "T", ink: true },
  { title: "Send final numbers to caterer", cat: "Food", color: "#7C9885", meta: "Assigned by Theo", who: "M" },
  { title: "Book the hair & makeup trial", cat: "Beauty", color: "#C98E77", meta: "Due 12 Oct", who: "M" },
];

const PLANNER_POINTS = [
  "Both of you add and edit plans",
  "Assign tasks to each other",
  "Your own categories, sorted into wedding cards",
];

const PLAN_CARDS = [
  { cat: "Venue", due: "This week", title: "Second visit to the garden venue", who: "M", by: "Mira · added it herself" },
  { cat: "Décor", due: "Fri", title: "Shortlist three florists", who: "T", by: "Theo · assigned by Mira", ink: true },
  { cat: "Attire", due: "20 Oct", title: "First suit fitting", who: "T", by: "Theo · added it himself", ink: true },
  { cat: "Music", due: "Nov", title: "Pick the first-dance song", who: "M", by: "Mira · assigned by Theo" },
];

const GUEST_TABS = ["Family", "School mates", "Work mates"];

const GUESTS = [
  { init: "GL", name: "Grandma Lina", vip: true, group: "Family", src: "Added by Mum" },
  { init: "RS", name: "Rafi Santos", vip: true, group: "School mates", src: "Added by Theo" },
  { init: "AC", name: "Aunt Carmen", vip: false, group: "Family", src: "Added by Dad" },
  { init: "JT", name: "Jess Tan", vip: false, group: "Work mates", src: "Added by Mira" },
  { init: "UB", name: "Uncle Ben", vip: false, group: "Family", src: "Added by Mum" },
];

const CONTRIBUTORS = [
  { init: "M", name: "Mum's list", status: "Added 3 today", count: 14 },
  { init: "D", name: "Dad's list", status: "Last added last week", count: 9 },
  { init: "L", name: "Theo's parents", status: "Link sent", count: 0 },
];

const VENDORS = [
  { name: "Garden venue", cat: "Venue", amount: "$14,000", status: "Paid", tone: "paid" },
  { name: "Photographer", cat: "Photo & film", amount: "$4,200", status: "Booked", tone: "booked" },
  { name: "Caterer", cat: "Food", amount: "$9,320", status: "Downpayment", tone: "downpayment" },
  { name: "Florist", cat: "Décor", amount: "$2,800", status: "Inquired", tone: "inquired" },
];

const BUDGET_POINTS = [
  "Total budget, savings and remaining — always live",
  "Book a vendor and it lands on your budget",
  "A calculator to compare quotes before you commit",
];

const INSPO = [
  { cat: "Tables", caption: "Candlelit long tables", tone: "#E6D6C3", h: 320, loved: true, by: "Saved by Mira" },
  { cat: "Florals", caption: "Dried flower arch", tone: "#D9CDB8", h: 240, loved: false, by: "Saved by Theo" },
  { cat: "Palette", caption: "Gold & sage", tone: "#C9CAB0", h: 360, loved: true, by: "Uploaded by Theo" },
  { cat: "Send-off", caption: "Sparkler exit", tone: "#E9DFCF", h: 280, loved: false, by: "Saved by Mira" },
];

const STEPS = [
  { n: "1", title: "Create your wedding", body: "Add both your names and your date — your countdown starts straight away." },
  { n: "2", title: "Plan side by side", body: "Each of you signs in with your own name to add plans, assign tasks and heart ideas." },
  { n: "3", title: "Bring in the family", body: "Send a guest-list link to your parents so they can add their people." },
];

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`hp-wordmark ${light ? "light" : ""}`}>
      <img src="/favicon.png" alt="" width={34} height={34} />
      <span>
        Aisle<span className="hp-wordmark-accent">lys</span>
      </span>
    </span>
  );
}

// "Sign in": the app has no single login page — each couple's planner lives at
// its own address — so ask for that address and take them there.
function SignInDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // accept "sara-kris", "/sara-kris" or a pasted full link
    const slug = value.trim().replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, "").split(/[/?#]/)[0].toLowerCase();
    if (!slug) return;
    setChecking(true);
    setError(null);
    try {
      await api.getCoupleAuthStatus(slug);
      navigate(`/${slug}`);
    } catch {
      setError("We couldn't find that planner — check the address and try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="hp-dialog-backdrop" onClick={onClose}>
      <div className="hp-dialog" role="dialog" aria-modal="true" aria-labelledby="hp-signin-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="hp-signin-title">Sign in to your planner</h2>
        <p>Enter your planner's address — it's the part after the domain, like the names you signed up with.</p>
        <form onSubmit={submit}>
          <label htmlFor="hp-signin-slug" className="hp-dialog-label">
            Planner address
          </label>
          <div className="hp-dialog-field">
            <span>{window.location.host}/</span>
            <input
              id="hp-signin-slug"
              autoFocus
              placeholder="alex-sam"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
            />
          </div>
          {error && <p className="hp-dialog-error">{error}</p>}
          <div className="hp-dialog-actions">
            <button type="submit" className="hp-btn hp-btn-primary" disabled={checking || !value.trim()}>
              {checking ? "Checking…" : "Continue"}
            </button>
            <button type="button" className="hp-btn hp-btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
        <p className="hp-dialog-foot">
          New here? <Link to="/signup">Start planning together</Link>
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = "Aislelys — the wedding planner for two";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="hp">
      <header className="hp-nav">
        <a href="#top" className="hp-brand" aria-label="Aislelys home">
          <Wordmark />
        </a>
        <nav aria-label="Main" className="hp-nav-links">
          <a href="#planner">Planner</a>
          <a href="#guests">Guest list</a>
          <a href="#budget">Budget</a>
          <a href="#inspiration">Inspiration</a>
        </nav>
        <div className="hp-nav-actions">
          <button type="button" className="hp-link-btn" onClick={() => setSignInOpen(true)}>
            Sign in
          </button>
          <Link to="/signup" className="hp-btn hp-btn-primary hp-btn-small">
            Start planning
          </Link>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hp-hero hp-wrap">
          <div className="hp-hero-copy">
            <p className="hp-eyebrow hp-eyebrow-rule">The wedding planner for two</p>
            <h1 className="hp-display">
              Plan the big day <em>together.</em>
            </h1>
            <p className="hp-lede">
              Your to-dos, guest list, budget and inspiration in one shared space — so you both plan, decide and stay on
              the same page, all the way down the aisle.
            </p>
            <div className="hp-cta-row">
              <Link to="/signup" className="hp-btn hp-btn-primary">
                Start planning together
              </Link>
              <a href="#how" className="hp-btn hp-btn-ghost">
                See how it works
              </a>
            </div>
          </div>

          <div className="hp-hero-visual" aria-hidden="true">
            <div className="hp-hero-backdrop" />
            <div className="hp-hero-panel">
              <div className="hp-hero-panel-head">
                <span className="hp-hero-panel-title">Wedding cards</span>
                <span className="hp-avatars">
                  <span className="hp-avatar hp-avatar-gold">M</span>
                  <span className="hp-avatar hp-avatar-ink">T</span>
                </span>
              </div>
              {HERO_CARDS.map((c) => (
                <div className="hp-task" key={c.title} style={{ borderLeftColor: c.color }}>
                  <span className="hp-task-box" />
                  <span className="hp-task-body">
                    <span className="hp-task-title">{c.title}</span>
                    <span className="hp-task-meta">
                      <span className="hp-chip">{c.cat}</span>
                      {c.meta}
                    </span>
                  </span>
                  <span className={`hp-avatar ${c.ink ? "hp-avatar-ink" : "hp-avatar-gold"}`}>{c.who}</span>
                </div>
              ))}
            </div>
            <div className="hp-hero-budget">
              <span className="hp-hero-budget-label">Budget remaining</span>
              <span className="hp-hero-budget-value">$12,480</span>
              <span className="hp-meter">
                <span style={{ width: "69%" }} />
              </span>
              <span className="hp-hero-budget-foot">of $40,000 · updated just now</span>
            </div>
            <div className="hp-hero-toast">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6M22 11h-6" />
              </svg>
              <span>
                <strong>Mum</strong> added 14 guests to her list
              </span>
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section className="hp-wrap">
          <div className="hp-pillars">
            {PILLARS.map((p) => (
              <a href={p.href} className="hp-pillar" key={p.num}>
                <span className="hp-pillar-num">{p.num}</span>
                <span className="hp-pillar-name">{p.name}</span>
                <span className="hp-pillar-line">{p.line}</span>
              </a>
            ))}
          </div>
        </section>

        {/* PLANNER */}
        <section id="planner" className="hp-wrap hp-split">
          <div className="hp-split-copy">
            <p className="hp-eyebrow">Day-to-day planner</p>
            <h2 className="hp-h2">Every task has an owner.</h2>
            <p className="hp-body">
              Add your own plans, give them a category and hand tasks to each other. Everything lands in your wedding
              cards — one clear view of who's doing what, and when. No more “I thought you were handling that.”
            </p>
            <ul className="hp-points">
              {PLANNER_POINTS.map((pt) => (
                <li key={pt}>
                  <Check />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
          <div className="hp-plan-grid" aria-hidden="true">
            {PLAN_CARDS.map((c) => (
              <div className="hp-plan-card" key={c.title}>
                <div className="hp-plan-card-top">
                  <span className="hp-plan-card-cat">{c.cat}</span>
                  <span>{c.due}</span>
                </div>
                <div className="hp-plan-card-title">{c.title}</div>
                <div className="hp-plan-card-foot">
                  <span className={`hp-avatar ${c.ink ? "hp-avatar-ink" : "hp-avatar-gold"}`}>{c.who}</span>
                  <span>{c.by}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* GUESTS */}
        <section id="guests" className="hp-guests">
          <div className="hp-guests-head">
            <div>
              <p className="hp-eyebrow hp-eyebrow-light">Guest list</p>
              <h2 className="hp-h2 hp-h2-light">
                Everyone who matters. <em>Even Mum's list.</em>
              </h2>
            </div>
            <p className="hp-body hp-body-light">
              Add friends and family, mark your VIPs and sort everyone into lists. Then send a link to your parents —
              they add their own guests, and it all lands in one place. No more chasing names across group chats.
            </p>
          </div>
          <div className="hp-guests-grid" aria-hidden="true">
            <div className="hp-guest-panel">
              <div className="hp-tabs">
                <span className="hp-tab active">All guests</span>
                {GUEST_TABS.map((t) => (
                  <span className="hp-tab" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <div>
                {GUESTS.map((g) => (
                  <div className="hp-guest-row" key={g.name}>
                    <span className="hp-guest-init">{g.init}</span>
                    <span className="hp-guest-name">{g.name}</span>
                    {g.vip && (
                      <span className="hp-vip">
                        <Heart filled />
                        VIP
                      </span>
                    )}
                    <span className="hp-guest-group">{g.group}</span>
                    <span className="hp-guest-src">{g.src}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hp-share">
              <div className="hp-share-card">
                <div className="hp-share-title">Invite family to add guests</div>
                <p>Share a private link. They add names straight into their own list.</p>
                <div className="hp-share-link">
                  <span>{window.location.host}/guests/…</span>
                  <span className="hp-share-copy">Copy link</span>
                </div>
              </div>
              {CONTRIBUTORS.map((k) => (
                <div className="hp-contributor" key={k.name}>
                  <span className="hp-contributor-init">{k.init}</span>
                  <span className="hp-contributor-body">
                    <span className="hp-contributor-name">{k.name}</span>
                    <span className="hp-contributor-status">{k.status}</span>
                  </span>
                  <span className="hp-contributor-count">{k.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BUDGET */}
        <section id="budget" className="hp-wrap hp-split hp-split-reverse">
          <div className="hp-budget-card" aria-hidden="true">
            <div className="hp-budget-stats">
              <div className="hp-stat">
                <span>Total budget</span>
                <strong>$40,000</strong>
              </div>
              <div className="hp-stat">
                <span>Savings so far</span>
                <strong>$28,500</strong>
              </div>
              <div className="hp-stat hp-stat-ink">
                <span>Remaining</span>
                <strong>$12,480</strong>
              </div>
            </div>
            <div>
              <div className="hp-bar">
                <span className="hp-bar-paid" style={{ width: "46%" }} />
                <span className="hp-bar-committed" style={{ width: "23%" }} />
              </div>
              <div className="hp-legend">
                <span>
                  <i className="hp-bar-paid" />
                  Paid
                </span>
                <span>
                  <i className="hp-bar-committed" />
                  Committed
                </span>
                <span>
                  <i className="hp-bar-left" />
                  Remaining
                </span>
              </div>
            </div>
            <div>
              {VENDORS.map((v) => (
                <div className="hp-vendor" key={v.name}>
                  <span className="hp-vendor-body">
                    <span className="hp-vendor-name">{v.name}</span>
                    <span className="hp-vendor-cat">{v.cat}</span>
                  </span>
                  <span className="hp-vendor-amount">{v.amount}</span>
                  <span className={`hp-status hp-status-${v.tone}`}>{v.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hp-split-copy">
            <p className="hp-eyebrow">Budget &amp; vendors</p>
            <h2 className="hp-h2">Know what's left before you say yes.</h2>
            <p className="hp-body">
              Set your total budget and savings, and see what's remaining in real time. Track every vendor from first
              inquiry to downpayment to paid in full — and the moment one's booked, it's on your budget.
            </p>
            <ul className="hp-points">
              {BUDGET_POINTS.map((pt) => (
                <li key={pt}>
                  <Check />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* INSPIRATION */}
        <section id="inspiration" className="hp-wrap hp-inspo">
          <div className="hp-section-head">
            <div>
              <p className="hp-eyebrow">Inspiration board</p>
              <h2 className="hp-h2">
                Keep every spark. <em>Agree on the vibe.</em>
              </h2>
            </div>
            <p className="hp-body">
              Save a link or upload your own photos, sort them into categories and add captions. Heart the ideas you
              both love — so you always know what's in.
            </p>
          </div>
          <div className="hp-inspo-grid" aria-hidden="true">
            {INSPO.map((i) => (
              <div className="hp-inspo-item" key={i.caption}>
                <div className="hp-inspo-tile" style={{ background: i.tone, height: i.h }}>
                  <span className="hp-inspo-cat">{i.cat}</span>
                  <span className={`hp-inspo-heart ${i.loved ? "loved" : ""}`}>
                    <Heart filled={i.loved} />
                  </span>
                </div>
                <span className="hp-inspo-caption">{i.caption}</span>
                <span className="hp-inspo-by">{i.by}</span>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="hp-how">
          <h2 className="hp-h2">Set up in minutes. Plan side by side.</h2>
          <div className="hp-steps">
            {STEPS.map((s) => (
              <div className="hp-step" key={s.n}>
                <span className="hp-step-n">{s.n}</span>
                <span className="hp-step-title">{s.title}</span>
                <span className="hp-step-body">{s.body}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="hp-wrap hp-final">
          <h2 className="hp-display hp-final-title">
            One wedding. <em>One shared plan.</em>
          </h2>
          <p className="hp-lede">
            Bring your partner, your parents and every idea into one place — and enjoy the planning as much as the day.
          </p>
          <div className="hp-cta-row hp-cta-center">
            <Link to="/signup" className="hp-btn hp-btn-primary">
              Start planning together
            </Link>
            <button type="button" className="hp-btn hp-btn-ghost" onClick={() => setSignInOpen(true)}>
              Sign in to your planner
            </button>
          </div>
        </section>
      </main>

      <footer className="hp-footer">
        <div className="hp-footer-brand">
          <Wordmark light />
          <span>The wedding planner for two.</span>
        </div>
        <nav aria-label="Footer" className="hp-footer-links">
          <a href="#planner">Planner</a>
          <a href="#guests">Guest list</a>
          <a href="#budget">Budget</a>
          <a href="#inspiration">Inspiration</a>
        </nav>
      </footer>

      {signInOpen && <SignInDialog onClose={() => setSignInOpen(false)} />}
    </div>
  );
}
