import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export const metadata = {
  title: "Kairos — terms",
  description: "Sales terms for Kairos artworks.",
};

const CONTACT = "trpa21cxx@mozmail.com";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className="brand-lockup sale-seal gallery-brand-link">
          <BrandMark size={64} className="brand-mark sale-mark" />
          <span className="brand sale-wordmark gallery-brand">Kairos</span>
        </Link>
        <h1 className="legal-title">Terms</h1>
      </header>

      <div className="legal-body">
        <p>
          These terms govern use of the Kairos website and any purchase or
          destroy action for a listed artwork. By using the site or completing a
          payment, you agree to them.
        </p>

        <h2>The sale</h2>
        <p>
          Kairos offers one artwork at a time. The displayed price falls over a
          set period from a starting amount toward zero. You may choose to{" "}
          <strong>purchase</strong> the work or <strong>destroy</strong> it. In
          either case you pay the price shown at the moment your payment is
          confirmed, not an earlier price you may have seen on the page.
        </p>
        <p>
          Only one successful payment can settle a live artwork. If someone else
          completes payment first, your attempt will not acquire the piece. If
          you were charged after the piece was already settled, you will be
          refunded.
        </p>

        <h2>Purchase vs destroy</h2>
        <p>
          A successful <strong>purchase</strong> means you buy the physical
          artwork (and any ownership rights we expressly convey for that piece).
          A successful <strong>destroy</strong> means you pay for the work to be
          destroyed according to the process described on the site; you do not
          receive the physical artwork.
        </p>
        <p>
          If the price reaches zero and no one has settled the piece, it may be
          destroyed automatically, including on livestream when we provide one.
        </p>

        <h2>Payments</h2>
        <p>
          Payments are processed by Stripe. You must provide accurate payment
          information and have authority to use the payment method. Prices are
          shown in U.S. dollars unless stated otherwise.
        </p>

        <h2>Refunds</h2>
        <p>
          Refunds are issued only at our discretion. If you have a refund
          question, contact{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Chargebacks for a
          completed purchase or destroy may be disputed with supporting records
          of the transaction.
        </p>

        <h2>Eligibility</h2>
        <p>
          You must be able to form a binding contract and, if you are in a
          jurisdiction with a minimum age for online purchases, meet that age
          (or have a parent or guardian act for you). You are responsible for
          any taxes, duties, or shipping arrangements that apply when a
          purchased work is delivered, unless we state otherwise for a specific
          piece.
        </p>

        <h2>Delivery of purchased works</h2>
        <p>
          After a purchase settles, we will contact you using information
          associated with your payment or the email you provide to arrange
          transfer or shipping of the artwork. Timing depends on the piece and
          location. Risk of loss for a purchased work passes according to the
          shipping or handoff method we agree with you.
        </p>

        <h2>Site use</h2>
        <p>
          Do not misuse the site, attempt to interfere with pricing, checkout,
          or settlement, or use automated tools to unfairly dominate checkout.
          We may refuse or cancel a transaction that appears fraudulent or
          abusive.
        </p>

        <h2>Intellectual property</h2>
        <p>
          The Kairos name, site design, and related branding remain ours. Buying
          an artwork does not transfer copyright or trademark rights unless we
          expressly say so for that piece. You may not copy or redistribute site
          content except for personal, non-commercial viewing.
        </p>

        <h2>Disclaimer</h2>
        <p>
          The site and artworks are provided as described at the time of sale.
          To the fullest extent permitted by law, we are not liable for
          indirect, incidental, or consequential damages arising from use of the
          site or from a purchase or destroy action. Our total liability for any
          claim related to a transaction is limited to the amount you paid for
          that transaction.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms from time to time. The version posted on
          this page applies to transactions completed after it is posted. The
          live price and artwork description on the sale page control the terms
          of that specific offering where they add detail.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms or a sale:{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>

        <p>
          See also our <Link href="/privacy">Privacy</Link> page.
        </p>
      </div>

      <p className="legal-back">
        <Link href="/">← Back</Link>
      </p>
    </main>
  );
}
