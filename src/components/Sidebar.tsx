import {
  BookOpen,
  GraduationCap,
  Hand,
  PenLine,
  Settings,
  UserRound,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Page } from "../types";

type NavItem = { page: Page; label: string; icon: LucideIcon };

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "Learn",
    items: [
      { page: "learn", label: "Learn", icon: BookOpen },
      { page: "lessons", label: "Lessons", icon: GraduationCap },
    ],
  },
  {
    label: "Practice tools",
    items: [
      { page: "asl", label: "ASL", icon: Hand },
      { page: "pronunciation", label: "Pronunciation", icon: Volume2 },
      { page: "handwriting", label: "Handwriting", icon: PenLine },
    ],
  },
];

const accountItems: NavItem[] = [
  { page: "profile", label: "Profile", icon: UserRound },
  { page: "settings", label: "Settings", icon: Settings },
];

export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-[14px] bg-[#cf5145] text-white shadow-[0_4px_0_#b5362b]">
        <PenLine size={18} strokeWidth={2.4} />
      </span>
      <span className="font-heading text-[25px] font-semibold tracking-[-0.04em]">nabu</span>
    </div>
  );
}

function NavButton({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: (page: Page) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.page)}
      aria-current={active ? "page" : undefined}
      className={active ? "sidebar-link-active" : "sidebar-link"}
    >
      <Icon size={19} strokeWidth={active ? 2.6 : 2} /> {item.label}
    </button>
  );
}

export function Sidebar({
  active,
  open,
  onClose,
  onNavigate,
}: {
  active: Page;
  open: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}) {
  const select = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#3b2b20]/30 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col overflow-y-auto border-r border-[#dfcdb9] bg-[#fffdf9] p-5 transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Wordmark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-xl bg-[#f6eee4] md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {sections.map((section, index) => (
          <nav key={section.label} className={index === 0 ? "mt-9" : "mt-7"} aria-label={section.label}>
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#9a806b]">
              {section.label}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => (
                <NavButton key={item.page} item={item} active={active === item.page} onSelect={select} />
              ))}
            </div>
          </nav>
        ))}

        <nav className="mt-auto space-y-1 border-t border-[#eadccd] pt-4" aria-label="Account">
          {accountItems.map((item) => (
            <NavButton key={item.page} item={item} active={active === item.page} onSelect={select} />
          ))}
        </nav>

        <div className="mt-4 rounded-2xl bg-[#f6eee4] p-4">
          <p className="text-xs font-black">Daily practice</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dfcdb9]">
            <div className="h-full w-3/5 rounded-full bg-[#cf5145]" />
          </div>
          <p className="mt-2 text-[11px] font-bold text-[#765e4b]">3 of 5 activities complete</p>
        </div>
      </aside>
    </>
  );
}
