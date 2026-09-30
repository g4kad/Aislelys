import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BudgetPreview,
  FamilyListsPreview,
  GuestListPreview,
  TaskPreview,
  WeddingBudgetBadge,
  WeddingCardsPreview,
} from "./AppPreviews";
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

const PLANNER_POINTS = [
  "Both of you add and edit plans",
  "Assign tasks to each other",
  "Your own categories, sorted into wedding cards",
];

const BUDGET_POINTS = [
  "Total budget, savings and remaining — always live",
  "Book a vendor and it lands on your budget",
  "A calculator to compare quotes before you commit",
];

const INSPO = [
  { cat: "Tables", caption: "Candlelit long tables", img: "/inspo-1.jpg", imgMobile: "/inspo-1-m.jpg", tone: "#E6D6C3", h: 320, loved: true, by: "Saved by Mira" },
  { cat: "Florals", caption: "Ivory rose bouquet", img: "/inspo-2.jpg", imgMobile: "/inspo-2-m.jpg", tone: "#D9CDB8", h: 240, loved: false, by: "Saved by Theo" },
  { cat: "Table setting", caption: "Eucalyptus place settings", img: "/inspo-3.jpg", imgMobile: "/inspo-3-m.jpg", tone: "#C9CAB0", h: 360, loved: true, by: "Uploaded by Theo" },
  { cat: "Hair", caption: "Loose floral updo", img: "/inspo-4.jpg", imgMobile: "/inspo-4-m.jpg", tone: "#E9DFCF", h: 280, loved: false, by: "Saved by Mira" },
];

const STEPS = [
  { n: "1", title: "Create your wedding", body: "Add both your names and your date — your countdown starts straight away." },
  { n: "2", title: "Plan side by side", body: "Each of you signs in with your own name to add plans, assign tasks and heart ideas." },
  { n: "3", title: "Bring in the family", body: "Send a guest-list link to your parents so they can add their people." },
];

const FAQS = [
  {
    q: "Is Aislelys free?",
    a: "Yes, Aislelys is free right now. If we ever add paid features, we'll tell you first, and nothing is charged without your agreement.",
  },
  {
    q: "Do we each need our own sign-in?",
    a: "You share one planner, and each of you signs in with your own name and password. You can both see and change everything in it.",
  },
  {
    q: "Why is there no mobile app?",
    a: "Aislelys runs in your browser so it's easy to jump between phone and computer. Open it on either one and your planner is right where you left it.",
  },
  {
    q: "Do our parents need an account?",
    a: "No. Send each side its own guest-list link and they can add their people straight away, without signing up. Share it only with people you trust.",
  },
  {
    q: "Which currencies does the budget use?",
    a: "Singapore dollars (S$) and Malaysian ringgit (RM). Add each cost in either one; conversions are estimates to help you plan.",
  },
  {
    q: "Is our planner private?",
    a: "Yes. Each couple's planner is kept separate from everyone else's. We don't run ads or tracking, never sell your data, and don't use your content to train AI.",
  },
  {
    q: "Can we delete our planner?",
    a: "Yes. Anything you delete in the app is removed straight away. To delete your whole planner, go to Settings and choose Delete planner. It's gone for both of you right away.",
  },
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

// The icon plus the official "aislelys" logotype (sage on light backgrounds,
// a cream copy of the same artwork on the sage footer).
export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`hp-wordmark ${light ? "light" : ""}`}>
      <img className="hp-wordmark-icon" src="/favicon.png" alt="" width={34} height={34} />
      <img
        className="hp-wordmark-type"
        src={light ? "/logo-aislelys-cream.png" : "/logo-aislelys.png"}
        alt="Aislelys"
        width={798}
        height={211}
      />
    </span>
  );
}

// One of the four feature tiles. On phones it starts closed like a drop-down
// and opens (showing its line) once scrolled a third of the way up the
// screen, so they open one by one; the styling for that lives in home.css
// (desktop ignores the open/closed state).
function Pillar({ num, name, line, href }: { num: string; name: string; line: string; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    if (typeof IntersectionObserver === "undefined") {
      setOpen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOpen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -33% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  return (
    <a ref={ref} href={href} className={`hp-pillar ${open ? "is-open" : ""}`}>
      <span className="hp-pillar-num">{num}</span>
      <span className="hp-pillar-name">{name}</span>
      <span className="hp-pillar-line">{line}</span>
    </a>
  );
}

export default function HomePage() {
  // the inspiration hearts can be toggled, like in the app (nothing is saved)
  const [loved, setLoved] = useState(() => new Set(INSPO.filter((i) => i.loved).map((i) => i.caption)));

  function toggleLoved(caption: string) {
    setLoved((prev) => {
      const next = new Set(prev);
      if (next.has(caption)) next.delete(caption);
      else next.add(caption);
      return next;
    });
  }

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
          <Link to="/sign-in" className="hp-link-btn">
            Sign in
          </Link>
          <Link to="/sign-up" className="hp-btn hp-btn-primary hp-btn-small">
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
              <Link to="/sign-up" className="hp-btn hp-btn-primary">
                Start planning together
              </Link>
              <a href="#how" className="hp-btn hp-btn-ghost">
                See how it works
              </a>
            </div>
          </div>

          <div className="hp-hero-visual">
            <div className="hp-hero-backdrop" />
            <span className="hp-pearl hp-pearl-window" aria-hidden="true" />
            <span className="hp-pearl hp-pearl-right" aria-hidden="true" />
            <WeddingCardsPreview />
            <WeddingBudgetBadge />
            <span className="hp-pearl hp-pearl-rings" aria-hidden="true" />
            <span className="hp-pearl hp-pearl-photo" aria-hidden="true" />
          </div>
        </section>

        {/* PILLARS */}
        <section className="hp-wrap">
          <div className="hp-pillars">
            {PILLARS.map((p) => (
              <Pillar key={p.num} {...p} />
            ))}
          </div>
        </section>

        {/* PLANNER */}
        <section id="planner" className="hp-wrap hp-split">
          <div className="hp-split-copy">
            <p className="hp-eyebrow">Day-to-day planner</p>
            <h2 className="hp-h2">Every task has an owner.</h2>
            <p className="hp-body">
              Add your own plans, give them a category and hand tasks to each other. Everything lands in a task card,
              but we call it a wedding card — one clear view of who's doing what, and when. No more “I thought you were handling that.”
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
          <div className="hp-plan-stage hp-stage-motif">
            <TaskPreview />
          </div>
        </section>

        {/* GUESTS */}
        <section id="guests" className="hp-guests">
          <div className="hp-guests-head">
            <div>
              <p className="hp-eyebrow hp-eyebrow-light">Guest list</p>
              <h2 className="hp-h2 hp-h2-light">
                Invite everyone who matters <em>to you &amp; the families.</em>
              </h2>
            </div>
            <p className="hp-body hp-body-light">
              Add friends and family, mark your VIPs and sort everyone into lists. Make things easier by sending a link
              to the parents — they add their own guests, and it all lands in one place. No more chasing names across group chats.
            </p>
          </div>
          <div className="hp-guests-grid">
            <GuestListPreview />
            <div className="hp-share">
              <div className="hp-share-card" aria-hidden="true">
                <div className="hp-share-title">Invite family to add guests</div>
                <p>Share a private link. They add names straight into their own list.</p>
                <div className="hp-share-link">
                  <span>{window.location.host}/guests/…</span>
                  <span className="hp-share-copy">Copy link</span>
                </div>
              </div>
              <FamilyListsPreview />
            </div>
          </div>
        </section>

        {/* BUDGET */}
        <section id="budget" className="hp-wrap hp-split hp-split-reverse">
          <div className="hp-plan-stage hp-stage-motif">
            <BudgetPreview />
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
          <div className="hp-inspo-grid">
            {INSPO.map((i) => (
              <div className="hp-inspo-item" key={i.caption}>
                <div
                  className="hp-inspo-tile hp-inspo-photo"
                  style={
                    {
                      height: i.h,
                      backgroundColor: i.tone,
                      "--hp-inspo-img": `url(${i.img})`,
                      "--hp-inspo-img-m": `url(${i.imgMobile})`,
                    } as React.CSSProperties
                  }
                >
                  <span className="hp-inspo-cat">{i.cat}</span>
                  <button
                    type="button"
                    className={`hp-inspo-heart ${loved.has(i.caption) ? "loved" : ""}`}
                    aria-pressed={loved.has(i.caption)}
                    aria-label={`Approve ${i.caption}`}
                    title={loved.has(i.caption) ? "Approved" : "Mark as approved"}
                    onClick={() => toggleLoved(i.caption)}
                  >
                    <Heart filled={loved.has(i.caption)} />
                  </button>
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
                <span className="hp-step-text">
                  <span className="hp-step-title">{s.title}</span>
                  <span className="hp-step-body">{s.body}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="hp-wrap hp-final">
          <h2 className="hp-display hp-final-title">
            One wedding. <em>One shared plan.</em>
          </h2>
          <div className="hp-faq">
            <h3 className="hp-eyebrow hp-faq-title">Questions, answered</h3>
            {FAQS.map((f) => (
              <details className="hp-faq-item" key={f.q}>
                <summary>
                  {f.q}
                  <span className="hp-faq-icon" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <div className="hp-cta-row hp-cta-center">
            <Link to="/sign-up" className="hp-btn hp-btn-primary">
              Start planning together
            </Link>
            <Link to="/sign-in" className="hp-btn hp-btn-ghost">
              Sign in to your planner
            </Link>
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
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </footer>

    </div>
  );
}
