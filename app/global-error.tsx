"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#060708] text-[rgba(236,238,241,0.88)] antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[rgba(236,238,241,0.38)]">
            Critical fault
          </p>
          <h1 className="max-w-md text-center text-sm font-normal leading-relaxed">
            {error.message || "The application failed to start."}
          </h1>
          <button
            type="button"
            onClick={() => reset()}
            className="border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[rgba(236,238,241,0.75)]"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
