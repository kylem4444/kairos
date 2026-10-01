import { isHomepageLedeText } from "@/lib/copy";
import type { GalleryArtwork } from "@/lib/types";

export function GalleryGrid({ artworks }: { artworks: GalleryArtwork[] }) {
  return (
    <ul className="gallery-grid">
      {artworks.map((piece) => {
        const details =
          piece.description.trim() && !isHomepageLedeText(piece.description)
            ? piece.description.trim()
            : null;

        return (
          <li key={piece.id} className="gallery-item">
            <p className="gallery-title">{piece.title}</p>
            {details ? <p className="gallery-description">{details}</p> : null}
            {piece.images.length > 0 ? (
              <div className="gallery-images">
                {piece.images.map((src, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${piece.id}-${index}`}
                    src={src}
                    alt=""
                    className="gallery-image"
                  />
                ))}
              </div>
            ) : (
              <div className="gallery-destroyed-placeholder">
                {piece.isDestroyed ? "Destroyed" : "No image"}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
