import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export const metadata = {
  title: "Kairos — privacy",
  description: "How Kairos handles information on this site.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className="brand-lockup sale-seal gallery-brand-link">
          <BrandMark size={64} className="brand-mark sale-mark" />
          <span className="brand sale-wordmark gallery-brand">Kairos</span>
        </Link>
        <h1 className="legal-title">Privacy</h1>
      </header>

      <div className="legal-body">
        <h2>What we collect</h2>
        <p>
          When you view the sale page or open checkout, we may record simple
          event counts (for example page views and checkout opens) tied to an
          artwork. On our hosting platform we may also store a coarse location
          derived from your IP address — typically a country and sometimes a
          region or state code. We do not store your IP address for these
          analytics events.
        </p>
        <p>
          We use session storage in your browser only to avoid counting the same
          page view repeatedly in one visit. That is not a cookie.
        </p>

        <h2>Payments</h2>
        <p>
          Purchases and destroy payments are processed by Stripe. Stripe may
          collect payment details and related information under its own privacy
          policy. We receive confirmation that a payment succeeded and enough
          information to settle the sale of the artwork.
        </p>

        <h2>We do not sell your data</h2>
        <p>
          We do not sell personal information. We do not use advertising
          trackers or marketing cookies on this site.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy:{" "}
          <a href="mailto:trpa21cxx@mozmail.com">trpa21cxx@mozmail.com</a>
        </p>
      </div>

      <p className="legal-back">
        <Link href="/">← Back</Link>
      </p>
    </main>
  );
}
