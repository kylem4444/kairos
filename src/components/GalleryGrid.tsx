import type { GalleryArtwork } from "@/lib/types";

export function GalleryGrid({ artworks }: { artworks: GalleryArtwork[] }) {
  return (
    <ul className="gallery-grid">
      {artworks.map((piece) => (
        <li key={piece.id} className="gallery-item">
          <p className="gallery-title">{piece.title}</p>
          {piece.description.trim() ? (
            <p className="gallery-description">{piece.description}</p>
          ) : null}
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
      ))}
    </ul>
  );
}
