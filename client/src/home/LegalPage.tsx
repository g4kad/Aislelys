import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "./HomePage";
import "./home.css";
import "./legal.css";

// The Terms and Privacy pages. They share the home page's nav, footer and
// brand, and stay public like it. Update LAST_UPDATED whenever either text
// changes.

const LAST_UPDATED = "29 September 2026";
const CONTACT_EMAIL = "planner@aislelys.com";

function Mail() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}

function LegalLayout({ title, eyebrow, intro, children }: { title: string; eyebrow: string; intro: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — Aislelys`;
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="hp">
      <header className="hp-nav">
        <Link to="/" className="hp-brand" aria-label="Aislelys home">
          <Wordmark />
        </Link>
        <div className="hp-nav-actions">
          <Link to="/signup" className="hp-btn hp-btn-primary hp-btn-small">
            Start planning
          </Link>
        </div>
      </header>

      <main className="hp-legal hp-wrap">
        <p className="hp-eyebrow hp-eyebrow-rule">{eyebrow}</p>
        <h1 className="hp-h2">{title}</h1>
        <p className="hp-legal-updated">Last updated {LAST_UPDATED}</p>
        <div className="hp-legal-intro">{intro}</div>
        <div className="hp-legal-body">{children}</div>
      </main>

      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="hp-footer">
      <div className="hp-footer-brand">
        <Wordmark light />
        <span>The wedding planner for two.</span>
      </div>
      <nav aria-label="Footer" className="hp-footer-links">
        <Link to="/">Home</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
      </nav>
    </footer>
  );
}

export function TermsPage() {
  return (
    <LegalLayout
      eyebrow="The fine print"
      title="Terms of Service"
      intro={
        <p>
          These terms are the agreement between you and Aislelys, a wedding planner run by an independent developer in
          Singapore (“Aislelys”, “we”, “us”). By creating a planner or using aislelys.com, you agree to them. If you
          don’t agree, please don’t use Aislelys.
        </p>
      }
    >
      <section>
        <h2>1. Who can use Aislelys</h2>
        <p>
          You must be at least 18 years old, or the age of majority where you live, to create a planner. By signing
          up, you confirm that you are, and that your partner has agreed to you creating the planner with their name.
        </p>
      </section>

      <section>
        <h2>2. Your planner and passwords</h2>
        <ul>
          <li>Each planner is shared by two partners. Each of you signs in with your own name and password.</li>
          <li>
            Keep your passwords to yourselves. You’re responsible for what happens in your planner, including anything
            done by someone who signs in with one of your passwords.
          </li>
          <li>
            We don’t ask for an email address, so we may not be able to recover a lost password or confirm who you
            are. If you think someone else has access to your planner, contact us at <Mail />.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Guest-list links</h2>
        <p>
          You can create a link for each guest list so family members can add and edit their guests. Anyone who has
          that link can see and change the guests on that list, including any phone numbers, email addresses and
          home addresses on it. Only share a link with people you trust, and delete the list if a link reaches the
          wrong person.
        </p>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          Everything you put into Aislelys (plans, tasks, guests, budgets, vendors, notes, links and photos) stays
          yours. You give us permission to store, copy and display it only as needed to run Aislelys for you. We
          don’t sell your content and don’t use it for advertising.
        </p>
        <p>You’re responsible for what you add, and you agree that:</p>
        <ul>
          <li>
            you have permission to share any personal details you add about other people, such as your guests’
            contact details, and you’ll use them only to plan your wedding;
          </li>
          <li>you have the right to upload any photos you add;</li>
          <li>your content doesn’t break the law or anyone else’s rights.</li>
        </ul>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>Please don’t:</p>
        <ul>
          <li>use Aislelys for anything unlawful, or to store or share content that is abusive, hateful or obscene;</li>
          <li>try to get into another couple’s planner, or guess or misuse other people’s guest-list links;</li>
          <li>upload malware, or attempt to break, overload, scrape or reverse-engineer the service;</li>
          <li>use Aislelys to send spam or to host files unrelated to your wedding planning.</li>
        </ul>
        <p>We may remove content or suspend a planner that breaks these rules.</p>
      </section>

      <section>
        <h2>6. Vendors, budgets and exchange rates</h2>
        <p>
          Aislelys helps you keep track of vendors and money, but we aren’t part of any agreement you make with a
          vendor, venue or other supplier, and we aren’t responsible for their services. Budget totals, calculator
          results and currency conversions are estimates to help you plan. They aren’t financial advice, and
          exchange rates may be out of date, so check the figures before you pay.
        </p>
      </section>

      <section>
        <h2>7. Links to other sites</h2>
        <p>
          Inspiration links and previews come from other websites. We don’t control those sites and aren’t
          responsible for their content or how they treat your data.
        </p>
      </section>

      <section>
        <h2>8. Price and changes to the service</h2>
        <p>
          Aislelys is currently free. We may add, change or remove features. If we ever introduce paid features, we
          will tell you before you are charged, and nothing will be charged without your agreement.
        </p>
      </section>

      <section>
        <h2>9. Availability and backups</h2>
        <p>
          We work to keep Aislelys running and your data safe, but we can’t promise the service will always be
          available or free of errors. Please keep your own copy of anything you can’t afford to lose, such as vendor
          contracts and important photos.
        </p>
      </section>

      <section>
        <h2>10. Ending your use</h2>
        <p>
          You can stop using Aislelys at any time. To have your planner and everything in it deleted, email us at{" "}
          <Mail /> from your planner address; see our <Link to="/privacy">Privacy Policy</Link> for how we delete it.
          We may suspend or close a planner that breaks these terms, or if we shut down Aislelys, in which case we
          will try to give you reasonable notice.
        </p>
      </section>

      <section>
        <h2>11. Disclaimers</h2>
        <p>
          Aislelys is provided “as is” and “as available”. As far as the law allows, we make no promises about the
          service beyond those in these terms, including any implied promises that it is fit for a particular
          purpose.
        </p>
      </section>

      <section>
        <h2>12. Limitation of liability</h2>
        <p>
          As far as the law allows, we aren’t liable for indirect or consequential loss, or for lost data, profits,
          deposits or bookings, arising from your use of Aislelys. Our total liability to you for any claim about
          Aislelys is limited to S$50. Nothing in these terms limits liability that cannot be limited by law.
        </p>
      </section>

      <section>
        <h2>13. Changes to these terms</h2>
        <p>
          We may update these terms. When we do, we’ll change the date at the top of this page, and for significant
          changes we’ll give notice in the app. If you keep using Aislelys after a change, you accept the updated
          terms.
        </p>
      </section>

      <section>
        <h2>14. Governing law</h2>
        <p>
          These terms are governed by the laws of Singapore, and any dispute will be decided by the courts of
          Singapore.
        </p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p>
          Questions about these terms? Email <Mail />.
        </p>
      </section>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Your data"
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal data Aislelys collects, how we use it, and the choices you have. Aislelys
          is run by an independent developer in Singapore, and we handle personal data in line with Singapore’s
          Personal Data Protection Act 2012 (PDPA). In short: we collect only what we need to run your planner, we
          don’t run ads or tracking, and we never sell your data.
        </p>
      }
    >
      <section>
        <h2>1. What we collect</h2>
        <h3>When you create a planner</h3>
        <ul>
          <li>Both partners’ names, which are also used to make your planner’s web address.</li>
          <li>
            Your passwords. We store them only in hashed form, which means we can’t read them.
          </li>
          <li>Your wedding date, if you add one.</li>
        </ul>
        <p>We don’t ask for your email address, phone number or payment details.</p>

        <h3>What you add while planning</h3>
        <ul>
          <li>Events, tasks, to-dos and notes, including which of you each task is assigned to.</li>
          <li>Your budget, savings, costs and payments.</li>
          <li>Vendors and the contact details you save for them.</li>
          <li>Inspiration links, captions, and any photos you upload.</li>
        </ul>

        <h3>Your guests’ details</h3>
        <p>
          Your guest lists can include guests’ names, plus-ones, phone numbers, email addresses, home addresses and
          notes. You add these details yourselves, or family members add them through a guest-list link you share.
          We hold them for you only so you can plan your wedding. Before adding someone’s details, please make sure
          they would be happy for you to do so.
        </p>

        <h3>Technical information</h3>
        <ul>
          <li>A sign-in cookie that keeps you signed in (see section 5).</li>
          <li>
            Standard request data such as your IP address and browser type, which our hosting provider handles to
            deliver and protect the site.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use it</h2>
        <ul>
          <li>To run your planner and show it to both of you.</li>
          <li>To keep you signed in, and to show one partner in-app updates about changes the other makes.</li>
          <li>To keep Aislelys secure, prevent abuse, and fix problems.</li>
          <li>To reply when you contact us.</li>
        </ul>
        <p>
          We don’t sell your data, share it for advertising, send marketing, or use your content to train AI models.
        </p>
      </section>

      <section>
        <h2>3. Who can see your information</h2>
        <ul>
          <li>
            <strong>You and your partner.</strong> Both partners can see and change everything in your planner.
          </li>
          <li>
            <strong>Anyone with a guest-list link.</strong> A guest-list link shows everything on that list,
            including guests’ contact details, and lets the person using it add and edit guests. Share these links
            with care.
          </li>
          <li>
            <strong>Anyone with a photo’s address.</strong> Uploaded photos are stored at long, random web addresses
            that can’t be guessed and aren’t listed anywhere. However, anyone who has a photo’s exact address can view
            it.
          </li>
          <li>
            <strong>Us.</strong> We access your planner’s data only when we need to: to keep the service running, to
            help you when you ask us, or when the law requires it.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Service providers</h2>
        <p>We use a small number of other companies to run Aislelys:</p>
        <ul>
          <li>
            <strong>Cloudflare</strong> hosts the website and stores your planner’s data and uploaded photos.
          </li>
          <li>
            <strong>Google Fonts</strong> supplies the site’s fonts, so your browser connects to Google, which can
            see your IP address.
          </li>
          <li>
            <strong>Link previews.</strong> When you save an inspiration link, our server visits that page (or
            TikTok’s preview service, for TikTok links) to find a preview image. Only the link itself is sent.
          </li>
          <li>
            <strong>Frankfurter</strong> supplies currency exchange rates. No personal data is sent to it.
          </li>
        </ul>
        <p>
          These providers may process data outside Singapore. When they do, we rely on their contractual and
          security commitments to protect your data to a standard comparable to the PDPA. We may also disclose data
          when the law requires it.
        </p>
      </section>

      <section>
        <h2>5. Cookies</h2>
        <p>
          We use one cookie, called “session”. It keeps you signed in for up to 90 days, or until you sign out.
          Scripts on the page can’t read it, and it’s only sent over secure connections. We don’t use analytics,
          advertising or tracking cookies.
        </p>
      </section>

      <section>
        <h2>6. How long we keep data</h2>
        <p>
          We keep your planner for as long as it exists. When you delete an item, such as a guest, task or photo,
          it’s removed from your planner straight away. If you ask us to delete your whole planner, we’ll do it
          within 30 days. Deleted data may stay in our hosting provider’s backups for up to 30 more days before it’s
          gone for good.
        </p>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>Under the PDPA, you can:</p>
        <ul>
          <li>ask for a copy of the personal data we hold about you, and how it has been used;</li>
          <li>ask us to correct anything that’s wrong;</li>
          <li>withdraw your consent and ask us to delete your planner.</li>
        </ul>
        <p>
          Email <Mail /> and tell us your planner’s web address. We may ask you to confirm you’re one of its partners,
          for example by signing in, before we act. We aim to reply within 30 days.
        </p>
        <p>
          <strong>If you’re a guest</strong> and want your details changed or removed, you can ask the couple
          directly, or contact us and we’ll pass your request on to them.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          All connections are encrypted with HTTPS. Passwords are hashed with a salt, and sign-in cookies are
          protected from scripts. Each couple’s data is kept separate from every other couple’s. No system is
          perfectly secure, so please use strong passwords and share guest-list links with care. If a data breach
          affects your personal data, we will tell you in the app and notify the Personal Data Protection Commission as the PDPA
          requires.
        </p>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          Aislelys is for adults planning their wedding. We don’t knowingly collect data from children, except where
          a couple lists children as guests.
        </p>
      </section>

      <section>
        <h2>10. Changes to this policy</h2>
        <p>
          If we change this policy, we’ll update the date at the top of this page. We’ll let you know in the app
          before any significant change takes effect.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          For privacy questions or requests, email <Mail />. Also see our <Link to="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
