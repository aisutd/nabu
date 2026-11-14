import type { LucideIcon } from "lucide-react";
import type { Page } from "../types";

/** Shared placeholder used by practice tools that aren't built yet. */
export function ComingSoon({
  icon: Icon,
  title,
  detail,
  onNavigate,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-5 py-10">
      <div className="max-w-md rounded-[26px] border border-[#dfcdb9] bg-[#fffdf9] p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f6d5c7] text-[#cf5145]">
          <Icon size={26} />
        </span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[#cf5145]">
          Practice tool · Coming soon
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.035em]">{title}</h1>
        <p className="mt-2 text-sm font-bold leading-6 text-[#765e4b]">{detail}</p>
        <button
          type="button"
          onClick={() => onNavigate("handwriting")}
          className="mt-6 rounded-xl bg-[#cf5145] px-5 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_#b5362b] hover:bg-[#b5362b]"
        >
          Try handwriting instead
        </button>
      </div>
    </div>
  );
}
