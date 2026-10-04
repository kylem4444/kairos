import { Suspense } from "react";
import Link from "next/link";
import { getArtworkPublicView } from "@/lib/artwork-service";
import { ArtworkSale } from "@/components/ArtworkSale";
import { BrandMark } from "@/components/BrandMark";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const view = await getArtworkPublicView();

  if (!view) {
    return (
      <main className="sale sale-empty">
        <header className="sale-header">
          <div className="brand-lockup sale-seal">
            <BrandMark size={88} className="brand-mark sale-mark" />
            <p className="brand sale-wordmark">Kairos</p>
          </div>
        </header>
        <div className="sale-empty-body">
          <p className="rules">No artwork is live right now.</p>
          <p className="gallery-link">
            <Link href="/gallery">Gallery</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <Suspense fallback={<main className="empty">Loading…</main>}>
      <ArtworkSale initial={view} />
    </Suspense>
  );
}
