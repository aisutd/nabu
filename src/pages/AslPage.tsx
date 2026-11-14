import { Hand } from "lucide-react";
import type { Page } from "../types";
import { ComingSoon } from "./ComingSoon";

// Dummy page — replace with the real ASL practice tool later.
export function AslPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <ComingSoon
      icon={Hand}
      title="ASL"
      detail="Sign practice with camera feedback is on the way."
      onNavigate={onNavigate}
    />
  );
}
