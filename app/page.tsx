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
 * Default: open straight into the dashboard (avoids a long blank/black screen + WebGL failures blocking the app).
 * Opt-in splash: set NEXT_PUBLIC_SHADER_INTRO=1 (and do not set NEXT_PUBLIC_SKIP_SHADER_INTRO=1).
 */
export default function Home() {
  const skipIntro =
    process.env.NEXT_PUBLIC_SKIP_SHADER_INTRO === "1" ||
    process.env.NEXT_PUBLIC_SHADER_INTRO !== "1";

  if (skipIntro) {
    return <DashboardRoot />;
  }

  return <AppIntroOverlay />;
}
