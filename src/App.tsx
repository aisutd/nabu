import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar, Wordmark } from "./components/Sidebar";
import { AslPage } from "./pages/AslPage";
import { HandwritingPage } from "./pages/HandwritingPage";
import { LearnPage } from "./pages/LearnPage";
import { LessonsPage } from "./pages/LessonsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PronunciationPage } from "./pages/PronunciationPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PAGES, type Page } from "./types";

const DEFAULT_PAGE: Page = "handwriting";

// Lightweight hash routing (#/learn, #/handwriting, ...) so each page has its own URL
// and the back button works, without pulling in a router library.
function readHash(): Page {
  const value = window.location.hash.replace(/^#\/?/, "") as Page;
  return PAGES.includes(value) ? value : DEFAULT_PAGE;
}

function PageContent({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  switch (page) {
    case "learn":
      return <LearnPage onNavigate={onNavigate} />;
    case "lessons":
      return <LessonsPage onNavigate={onNavigate} />;
    case "asl":
      return <AslPage onNavigate={onNavigate} />;
    case "pronunciation":
      return <PronunciationPage onNavigate={onNavigate} />;
    case "handwriting":
      return <HandwritingPage />;
    case "profile":
      return <ProfilePage />;
    case "settings":
      return <SettingsPage />;
  }
}

export default function App() {
  const [page, setPage] = useState<Page>(readHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => setPage(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (next: Page) => {
    window.location.hash = `/${next}`;
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="min-h-dvh bg-[#f2e8da] text-[#3b2b20]">
      <Sidebar
        active={page}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigate}
      />
      <div className="min-h-dvh md:pl-[252px]">
        {/* Mobile top bar */}
        <header className="flex h-[68px] items-center justify-between border-b border-[#dfcdb9] bg-[#fffdf9] px-5 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="grid size-10 place-items-center rounded-xl bg-[#f6eee4]"
          >
            <Menu size={21} />
          </button>
          <Wordmark />
          <button
            type="button"
            onClick={() => navigate("profile")}
            className="grid size-9 place-items-center rounded-full bg-[#4c7bd9] text-xs font-black text-white"
            aria-label="Open profile"
          >
            JD
          </button>
        </header>
        <PageContent page={page} onNavigate={navigate} />
      </div>
    </main>
  );
}
