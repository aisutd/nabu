import { useState } from "react";
import { BookOpen, Check, ChevronRight, Clock3, Lock, Play, Search } from "lucide-react";
import type { Page } from "../types";

type Lesson = {
  number: string;
  title: string;
  detail: string;
  time: string;
  status: "complete" | "current" | "locked";
};

// TODO: load lessons from the backend.
const lessons: Lesson[] = [
  { number: "01", title: "Meet and greet", detail: "Greetings and polite expressions", time: "6 min", status: "complete" },
  { number: "02", title: "Introduce yourself", detail: "Names, places, and simple questions", time: "8 min", status: "complete" },
  { number: "03", title: "Family and friends", detail: "Describe the people close to you", time: "10 min", status: "current" },
  { number: "04", title: "Everyday routines", detail: "Talk about your day and common activities", time: "9 min", status: "locked" },
  { number: "05", title: "Food and favorites", detail: "Share preferences and order a meal", time: "12 min", status: "locked" },
];

const badgeStyles: Record<Lesson["status"], string> = {
  complete: "bg-[#e1eccf] text-[#527a36]",
  current: "bg-[#f6d5c7] text-[#cf5145]",
  locked: "bg-[#f6eee4] text-[#9a806b]",
};

export function LessonsPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [query, setQuery] = useState("");
  const visible = lessons.filter((lesson) =>
    `${lesson.title} ${lesson.detail}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const completed = lessons.filter((lesson) => lesson.status === "complete").length;
  const percent = Math.round((completed / lessons.length) * 100);

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#cf5145]">
              Learning path
            </p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em] sm:text-[40px]">
              Lessons
            </h1>
            <p className="mt-2 font-bold text-[#765e4b]">
              Build practical communication skills one lesson at a time.
            </p>
          </div>
          <label className="relative block w-full sm:w-[260px]">
            <span className="sr-only">Search lessons</span>
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a806b]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lessons"
              className="h-12 w-full rounded-2xl border border-[#dfcdb9] bg-[#fffdf9] pl-11 pr-4 text-sm font-bold outline-none focus:border-[#cf5145]"
            />
          </label>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-[26px] border border-[#dfcdb9] bg-[#fffdf9]">
            <div className="flex items-center justify-between border-b border-[#eadccd] p-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold">Foundations</h2>
                <p className="mt-1 text-xs font-bold text-[#765e4b]">
                  {lessons.length} lessons · Beginner
                </p>
              </div>
              <span className="rounded-full bg-[#e1eccf] px-3 py-1.5 text-xs font-black text-[#527a36]">
                {percent}% complete
              </span>
            </div>
            <div>
              {visible.length === 0 && (
                <p className="p-6 text-sm font-bold text-[#765e4b]">No lessons match "{query}".</p>
              )}
              {visible.map((lesson) => {
                const locked = lesson.status === "locked";
                return (
                  <button
                    type="button"
                    key={lesson.number}
                    disabled={locked}
                    onClick={() => onNavigate("handwriting")}
                    className="flex w-full items-center gap-4 border-b border-[#eadccd] p-4 text-left transition last:border-0 hover:bg-[#fdf8f2] disabled:cursor-not-allowed sm:px-6 sm:py-5"
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xs font-black ${badgeStyles[lesson.status]}`}
                    >
                      {lesson.status === "complete" ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        lesson.number
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black">{lesson.title}</span>
                      <span className="mt-1 block truncate text-xs font-bold text-[#765e4b]">
                        {lesson.detail}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1 text-[11px] font-black text-[#9a806b] sm:flex">
                      <Clock3 size={13} /> {lesson.time}
                    </span>
                    {locked ? (
                      <Lock size={16} className="text-[#b8a18c]" />
                    ) : (
                      <ChevronRight size={17} className="text-[#cf5145]" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[24px] bg-[#4c7bd9] p-6 text-white shadow-[0_5px_0_#365fae]">
              <span className="grid size-11 place-items-center rounded-xl bg-white/15">
                <Play size={20} fill="currentColor" />
              </span>
              <h2 className="mt-5 text-xl font-semibold">Continue lesson 3</h2>
              <p className="mt-2 text-xs font-bold leading-5 text-white/80">
                Practice words for family and friends across all three learning tools.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("handwriting")}
                className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-[#365fae]"
              >
                Resume lesson
              </button>
            </section>
            <section className="rounded-[24px] border border-[#dfcdb9] bg-[#fffdf9] p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#fae9e3] text-[#cf5145]">
                  <BookOpen size={19} />
                </span>
                <div>
                  <p className="text-sm font-black">Lesson goal</p>
                  <p className="text-xs font-bold text-[#765e4b]">Complete 3 this week</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f6eee4]">
                <div className="h-full w-2/3 rounded-full bg-[#cf5145]" />
              </div>
              <p className="mt-2 text-right text-[11px] font-black text-[#9a806b]">2 of 3</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
