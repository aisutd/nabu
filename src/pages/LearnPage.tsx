import {
  ArrowRight,
  BookOpenCheck,
  Flame,
  GraduationCap,
  Hand,
  PenLine,
  Play,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { Page } from "../types";

const skills = [
  {
    icon: Hand,
    title: "ASL",
    page: "asl",
    detail: "Learn visual vocabulary and everyday signs.",
    color: "bg-[#e1eccf] text-[#527a36]",
  },
  {
    icon: Volume2,
    title: "Pronunciation",
    page: "pronunciation",
    detail: "Listen, repeat, and refine how words sound.",
    color: "bg-[#dbe5f8] text-[#365fae]",
  },
  {
    icon: PenLine,
    title: "Handwriting",
    page: "handwriting",
    detail: "Compare your writing with reference glyphs.",
    color: "bg-[#f6d5c7] text-[#cf5145]",
  },
] as const;

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const daysCompleted = 4;

export function LearnPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#cf5145]">
              Welcome back, Jordan
            </p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em] sm:text-[40px]">
              Keep learning
            </h1>
            <p className="mt-2 font-bold text-[#765e4b]">
              Pick up where you left off or choose a skill to practice.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#fffdf9] px-4 py-3 shadow-sm">
            <span className="grid size-10 place-items-center rounded-xl bg-[#fff0c7] text-[#bd741f]">
              <Flame size={21} />
            </span>
            <div>
              <p className="font-heading text-xl font-semibold">12 days</p>
              <p className="text-[11px] font-black text-[#8b735f]">Current streak</p>
            </div>
          </div>
        </div>

        {/* Continue learning hero */}
        <section className="relative mt-8 overflow-hidden rounded-[28px] bg-[#4c7bd9] p-6 text-white shadow-[0_6px_0_#365fae] sm:p-8">
          <span className="absolute -right-10 -top-16 size-52 rounded-full bg-white/10" />
          <span className="absolute bottom-[-70px] right-36 size-36 rounded-full bg-white/10" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
              <Sparkles size={14} /> Continue learning
            </span>
            <h2 className="mt-5 text-[28px] font-semibold sm:text-[34px]">
              Everyday introductions
            </h2>
            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-white/80">
              Practice greetings, introduce yourself, and build confidence using signs, speech, and
              writing together.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate("lessons")}
                className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#365fae]"
              >
                <Play size={17} fill="currentColor" /> Continue lesson
              </button>
              <span className="text-xs font-black text-white/80">Lesson 4 of 8 · 8 min</span>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Practice a skill</h2>
              <p className="mt-1 text-xs font-bold text-[#765e4b]">
                Short activities for focused practice.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("lessons")}
              className="hidden items-center gap-1 text-xs font-black text-[#cf5145] sm:flex"
            >
              View all lessons <ArrowRight size={15} />
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {skills.map(({ icon: Icon, title, page, detail, color }) => (
              <button
                type="button"
                key={title}
                onClick={() => onNavigate(page)}
                className="group rounded-[22px] border border-[#dfcdb9] bg-[#fffdf9] p-5 text-left transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className={`grid size-11 place-items-center rounded-xl ${color}`}>
                  <Icon size={21} />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-xs font-bold leading-5 text-[#765e4b]">{detail}</p>
                <span className="mt-5 flex items-center gap-1 text-xs font-black text-[#cf5145]">
                  Start practice <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Weekly progress + lessons shortcut */}
        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-[24px] border border-[#dfcdb9] bg-[#fffdf9] p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#fae9e3] text-[#cf5145]">
                <BookOpenCheck size={19} />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Weekly progress</h2>
                <p className="text-xs font-bold text-[#765e4b]">
                  {daysCompleted} of 5 learning days complete
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => (
                <div key={`${day}-${index}`} className="text-center">
                  <span
                    className={`mx-auto grid size-9 place-items-center rounded-full text-xs font-black ${
                      index < daysCompleted
                        ? "bg-[#cf5145] text-white"
                        : "bg-[#f6eee4] text-[#8b735f]"
                    }`}
                  >
                    {index < daysCompleted ? "✓" : day}
                  </span>
                  <p className="mt-1 text-[10px] font-black text-[#9a806b]">{day}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("lessons")}
            className="flex items-center gap-4 rounded-[24px] bg-[#f3d8c8] p-6 text-left"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-[#cf5145]">
              <GraduationCap size={23} />
            </span>
            <span>
              <span className="block text-lg font-black">Explore lessons</span>
              <span className="mt-1 block text-xs font-bold leading-5 text-[#765e4b]">
                Browse the full learning path.
              </span>
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}
