import { initials } from "@/lib/format";

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-[11px]",
  lg: "h-11 w-11 text-[16px]",
};

export function Avatar({
  name,
  size = "sm",
  src,
}: {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  // Optional photo pointer (Employee.photo_url) — falls back to initials
  // when absent, since this app never hosts the image itself.
  src?: string | null;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, org-hosted URL, not a local asset
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full border border-border object-cover ${SIZE_CLASSES[size]}`}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-border bg-primary-tint font-extrabold uppercase tracking-[0.03em] text-primary-dark ${SIZE_CLASSES[size]}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
