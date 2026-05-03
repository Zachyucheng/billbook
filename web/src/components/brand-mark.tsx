type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({
  className = "h-12 w-12",
  title = "Billbook 标识",
}: BrandMarkProps) {
  return (
    <div className={`relative overflow-hidden ${className}`} aria-label={title}>
      {/* Static export preview is more reliable with a plain image tag here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand-mark.png"
        alt={title}
        className="absolute inset-0 h-full w-full object-contain"
        decoding="async"
      />
    </div>
  );
}
