import { AppIntroOverlay } from "@/components/AppIntroOverlay";
import { DashboardShell } from "@/components/DashboardShell";

function DashboardRoot() {
  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden">
      <DashboardShell />
    </div>
  );
}

/**
 * Default: WebGL “AeroOps” splash on every load/refresh, then the dashboard.
 * Opt out: NEXT_PUBLIC_SKIP_SHADER_INTRO=1 (e.g. if WebGL fails or you want instant dashboard).
 */
export default function Home() {
  if (process.env.NEXT_PUBLIC_SKIP_SHADER_INTRO === "1") {
    return <DashboardRoot />;
  }

  return <AppIntroOverlay />;
}
