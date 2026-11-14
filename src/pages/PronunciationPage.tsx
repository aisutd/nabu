import { Volume2 } from "lucide-react";
import type { Page } from "../types";
import { ComingSoon } from "./ComingSoon";

// Dummy page — replace with the real pronunciation tool later.
export function PronunciationPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <ComingSoon
      icon={Volume2}
      title="Pronunciation"
      detail="Listen-and-repeat practice with speech feedback is on the way."
      onNavigate={onNavigate}
    />
  );
}
