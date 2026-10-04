type BrandMarkProps = {
  className?: string;
  size?: number;
};

/** Quiet seal — sits above the Kairos wordmark, never the hero. */
export function BrandMark({ className = "brand-mark", size = 40 }: BrandMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/kairos-mark.png"
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: "auto" }}
      decoding="async"
    />
  );
}
