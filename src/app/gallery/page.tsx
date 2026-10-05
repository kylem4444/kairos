import Link from "next/link";
import { listArchiveArtworks } from "@/lib/artwork-service";
import { BrandMark } from "@/components/BrandMark";
import { GalleryGrid } from "@/components/GalleryGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kairos — gallery",
  description: "Past works that have passed through Kairos.",
};

export default async function GalleryPage() {
  const artworks = await listArchiveArtworks();

  return (
    <main className="gallery-page">
      <header className="gallery-header">
        <Link href="/" className="brand-lockup sale-seal gallery-brand-link">
          <BrandMark size={88} className="brand-mark sale-mark" />
          <span className="brand sale-wordmark gallery-brand">Kairos</span>
        </Link>
        <p className="gallery-kicker">Gallery</p>
        <p className="gallery-lede">Works that have passed through Kairos.</p>
      </header>

      {artworks.length === 0 ? (
        <p className="gallery-empty">Nothing in the archive yet.</p>
      ) : (
        <GalleryGrid artworks={artworks} />
      )}

      <p className="gallery-back">
        <Link href="/">← Back</Link>
        <span className="gallery-back-sep" aria-hidden="true">
          ·
        </span>
        <Link href="/privacy">Privacy</Link>
      </p>
    </main>
  );
}
