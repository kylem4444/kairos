import Link from "next/link";
import { listArchiveArtworks } from "@/lib/artwork-service";
import { GalleryGrid } from "@/components/GalleryGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "kairos — gallery",
  description: "Past works that have passed through kairos.",
};

export default async function GalleryPage() {
  const artworks = await listArchiveArtworks();

  return (
    <main className="gallery-page">
      <header className="gallery-header">
        <Link href="/" className="brand gallery-brand">
          kairos
        </Link>
        <p className="gallery-kicker">Gallery</p>
        <p className="gallery-lede">
          Works that have passed through kairos.
        </p>
      </header>

      {artworks.length === 0 ? (
        <p className="gallery-empty">Nothing in the archive yet.</p>
      ) : (
        <GalleryGrid artworks={artworks} />
      )}

      <p className="gallery-back">
        <Link href="/">← Back</Link>
      </p>
    </main>
  );
}
