import { Suspense } from "react";
import { getArtworkPublicView } from "@/lib/artwork-service";
import { ArtworkSale } from "@/components/ArtworkSale";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const view = await getArtworkPublicView();

  if (!view) {
    return (
      <main className="empty">
        <div>
          <p className="brand">kairos</p>
          <p className="rules">No artwork is live right now.</p>
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
