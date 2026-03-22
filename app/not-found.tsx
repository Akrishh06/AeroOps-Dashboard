import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-void px-6 text-ink">
      <p className="micro-label text-dim">404</p>
      <h1 className="text-sm font-normal text-ink/90">This page does not exist.</h1>
      <Link
        href="/"
        className="border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-wider text-dim transition-colors hover:bg-white/[0.07]"
      >
        Home
      </Link>
    </div>
  );
}
