"use client";

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = u.searchParams.get("v");
      if (!id && u.hostname.includes("youtu.be")) {
        id = u.pathname.replace("/", "");
      }
      if (!id && u.pathname.includes("/live/")) {
        id = u.pathname.split("/live/")[1];
      }
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("twitch.tv")) {
      const channel = u.pathname.split("/").filter(Boolean)[0];
      if (channel) {
        const parent =
          typeof window !== "undefined" ? window.location.hostname : "localhost";
        return `https://player.twitch.tv/?channel=${channel}&parent=${parent}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function LivestreamEmbed({ url }: { url: string }) {
  const embed = toEmbedUrl(url);

  if (!embed) {
    return (
      <p className="stream-fallback">
        Livestream:{" "}
        <a href={url} target="_blank" rel="noreferrer">
          Watch the destruction
        </a>
      </p>
    );
  }

  return (
    <div className="stream-frame">
      <iframe
        src={embed}
        title="Destruction livestream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
