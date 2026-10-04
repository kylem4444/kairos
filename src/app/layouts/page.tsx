"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import {
  HOMEPAGE_LEDE,
  HOMEPAGE_QUOTE,
  HOMEPAGE_QUOTE_CITE_HREF,
  HOMEPAGE_QUOTE_CITE_LABEL,
  SIDEBAR_RULES_AFTER,
  SIDEBAR_RULES_CHOICE,
  SIDEBAR_RULES_LEAD,
} from "@/lib/copy";

type LayoutId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const LAYOUT_TABS: readonly { id: LayoutId; label: string }[] = [
  { id: 1, label: "Split (current)" },
  { id: 2, label: "Artwork stage" },
  { id: 3, label: "Centered column" },
  { id: 4, label: "Top brand + sidebar" },
  { id: 5, label: "Compact masthead" },
  { id: 6, label: "Centered seal + quote below" },
  { id: 7, label: "Quote-led" },
];

export default function LayoutsPreviewPage() {
  const [active, setActive] = useState<LayoutId>(6);

  return (
    <div className="layout-studio">
      <header className="layout-studio-bar">
        <p className="layout-studio-title">Homepage layout mockups</p>
        <p className="layout-studio-note">
          Private preview — not linked from the site. Layouts 4–7 share the same
          art + sidebar; only the header changes. Reply with a number.
        </p>
        <nav className="layout-studio-nav" aria-label="Layout options">
          {LAYOUT_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={
                active === id
                  ? "layout-studio-tab layout-studio-tab-active"
                  : "layout-studio-tab"
              }
              onClick={() => setActive(id)}
            >
              {id}. {label}
            </button>
          ))}
        </nav>
        <p className="layout-studio-back">
          <Link href="/">← Live site</Link>
        </p>
      </header>

      <div className="layout-studio-frame" data-layout={active}>
        {active === 1 ? <MockSplit /> : null}
        {active === 2 ? <MockStage /> : null}
        {active === 3 ? <MockCentered /> : null}
        {active === 4 ? <MockTopBrandStacked /> : null}
        {active === 5 ? <MockTopBrandCompact /> : null}
        {active === 6 ? <MockTopBrandAsymmetric /> : null}
        {active === 7 ? <MockTopBrandQuoteLed /> : null}
      </div>
    </div>
  );
}

function MockArt({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/artwork/kairos-1-full.png"
      alt="Sample artwork"
      className={className}
    />
  );
}

function MockPrice() {
  return (
    <p className="price">
      <span className="price-label">Live price</span>
      <span className="price-value">$847,320.14</span>
    </p>
  );
}

function MockActions() {
  return (
    <div className="actions">
      <button type="button" className="btn btn-purchase">
        Purchase
      </button>
      <button type="button" className="btn btn-destroy">
        Destroy
      </button>
    </div>
  );
}

function QuoteText({ citeId }: { citeId: string }) {
  return (
    <>
      “{HOMEPAGE_QUOTE}”
      <a
        className="mock-topbrand-sup"
        href={`#${citeId}`}
        aria-label="Citation 1"
      >
        <sup>1</sup>
      </a>
    </>
  );
}

function QuoteFootnote({ citeId }: { citeId: string }) {
  return (
    <footer className="mock-topbrand-footnotes">
      <p id={citeId} className="mock-topbrand-footnote">
        <sup>1</sup>{" "}
        <a
          href={HOMEPAGE_QUOTE_CITE_HREF}
          target="_blank"
          rel="noopener noreferrer"
        >
          {HOMEPAGE_QUOTE_CITE_LABEL}
        </a>
      </p>
    </footer>
  );
}

function SaleSidebar({ pick }: { pick: number }) {
  return (
    <section className="mock-topbrand-panel">
      <h1 className="title">Untitled No. 1</h1>
      <p className="artwork-details">Oil on canvas · 48 × 60 in</p>
      <MockPrice />
      <p className="rules">
        {SIDEBAR_RULES_LEAD}
        <br />
        <br />
        {SIDEBAR_RULES_CHOICE}
      </p>
      <MockActions />
      <p className="rules">{SIDEBAR_RULES_AFTER}</p>
      <p className="layout-pick">Use this direction → reply with {pick}</p>
    </section>
  );
}

/** Shared art + sidebar shell for layouts 4–7. */
function TopBrandShell({
  header,
  citeId,
  pick,
  headerClassName = "",
  quoteBelow = false,
}: {
  header: ReactNode;
  citeId: string;
  pick: number;
  headerClassName?: string;
  /** When true, quote sits under the bottom rule with the citation. */
  quoteBelow?: boolean;
}) {
  return (
    <main className="mock-topbrand">
      <header className={`mock-topbrand-header ${headerClassName}`.trim()}>
        {header}
      </header>

      <div className="mock-topbrand-body">
        <div className="mock-topbrand-visual">
          <MockArt className="mock-topbrand-image" />
        </div>
        <SaleSidebar pick={pick} />
      </div>

      {quoteBelow ? (
        <footer className="mock-topbrand-footnotes mock-footnotes-with-quote">
          <p className="mock-topbrand-quote mock-quote-below">
            <QuoteText citeId={citeId} />
          </p>
          <p id={citeId} className="mock-topbrand-footnote">
            <sup>1</sup>{" "}
            <a
              href={HOMEPAGE_QUOTE_CITE_HREF}
              target="_blank"
              rel="noopener noreferrer"
            >
              {HOMEPAGE_QUOTE_CITE_LABEL}
            </a>
          </p>
        </footer>
      ) : (
        <QuoteFootnote citeId={citeId} />
      )}
    </main>
  );
}

function MockSplit() {
  return (
    <main className="stage mock-stage">
      <div className="visual">
        <MockArt className="artwork-image" />
      </div>
      <section className="panel">
        <div className="brand-lockup">
          <BrandMark />
          <p className="brand">Kairos</p>
        </div>
        <h1 className="title">Untitled No. 1</h1>
        <p className="lede">{HOMEPAGE_LEDE}</p>
        <p className="artwork-details">Oil on canvas · 48 × 60 in</p>
        <MockPrice />
        <p className="rules">The price falls for seven days.</p>
        <MockActions />
        <p className="layout-pick">Use this direction → reply with 1</p>
      </section>
    </main>
  );
}

function MockStage() {
  return (
    <main className="mock-artwork-stage">
      <div className="mock-stage-visual">
        <MockArt className="mock-stage-image" />
      </div>
      <aside className="mock-stage-strip">
        <div className="brand-lockup">
          <BrandMark size={32} />
          <p className="brand mock-brand-sm">Kairos</p>
        </div>
        <div className="mock-stage-meta">
          <h1 className="title">Untitled No. 1</h1>
          <p className="lede mock-lede-compact">{HOMEPAGE_LEDE}</p>
          <MockPrice />
          <MockActions />
        </div>
        <p className="layout-pick">Use this direction → reply with 2</p>
      </aside>
    </main>
  );
}

function MockCentered() {
  return (
    <main className="mock-centered">
      <div className="brand-lockup mock-centered-lockup">
        <BrandMark />
        <p className="brand">Kairos</p>
      </div>
      <p className="lede mock-centered-lede">{HOMEPAGE_LEDE}</p>
      <MockArt className="mock-centered-image" />
      <h1 className="title">Untitled No. 1</h1>
      <p className="artwork-details">Oil on canvas · 48 × 60 in</p>
      <MockPrice />
      <MockActions />
      <p className="layout-pick">Use this direction → reply with 3</p>
    </main>
  );
}

/** 4 — Stacked seal over wordmark, then quote (your current favorite baseline). */
function MockTopBrandStacked() {
  return (
    <TopBrandShell
      pick={4}
      citeId="quote-cite-4"
      header={
        <>
          <div className="brand-lockup mock-topbrand-lockup">
            <BrandMark size={160} className="brand-mark mock-topbrand-mark" />
            <p className="brand mock-brand-sm">Kairos</p>
          </div>
          <div className="mock-topbrand-rule" aria-hidden="true" />
          <p className="mock-topbrand-quote">
            <QuoteText citeId="quote-cite-4" />
          </p>
        </>
      }
    />
  );
}

/** 5 — Compact newspaper masthead: mark + wordmark in one thin row; quote as a quiet deck. More room for art. */
function MockTopBrandCompact() {
  return (
    <TopBrandShell
      pick={5}
      citeId="quote-cite-5"
      headerClassName="mock-header-compact"
      header={
        <>
          <div className="mock-masthead-row">
            <BrandMark size={52} className="brand-mark mock-mark-inline" />
            <p className="brand mock-brand-masthead">Kairos</p>
          </div>
          <div className="mock-topbrand-rule mock-rule-full" aria-hidden="true" />
          <p className="mock-topbrand-quote mock-quote-deck">
            <QuoteText citeId="quote-cite-5" />
          </p>
        </>
      }
    />
  );
}

/** 6 — Layout-6 seal size, centered; quote lives under the bottom rule. */
function MockTopBrandAsymmetric() {
  return (
    <TopBrandShell
      pick={6}
      citeId="quote-cite-6"
      headerClassName="mock-header-seal-only"
      quoteBelow
      header={
        <div className="brand-lockup mock-seal-centered">
          <BrandMark size={88} className="brand-mark mock-mark-asymmetric" />
          <p className="brand mock-brand-sm">Kairos</p>
        </div>
      }
    />
  );
}

/** 7 — Quote-led: the line carries the page; mark + wordmark as a quiet signature beneath. */
function MockTopBrandQuoteLed() {
  return (
    <TopBrandShell
      pick={7}
      citeId="quote-cite-7"
      headerClassName="mock-header-quoteled"
      header={
        <>
          <p className="mock-topbrand-quote mock-quote-hero">
            <QuoteText citeId="quote-cite-7" />
          </p>
          <div className="mock-signature">
            <BrandMark size={40} className="brand-mark mock-mark-signature" />
            <p className="brand mock-brand-signature">Kairos</p>
          </div>
        </>
      }
    />
  );
}
