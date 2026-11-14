import { useState } from "react";
import {
  Accessibility,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Mail,
  MessageCircle,
  Moon,
  Shield,
  Type,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { Toast, useToast } from "../components/Toast";

type Tab = "About & support" | "Accessibility" | "Notifications";

const tabs: { name: Tab; icon: LucideIcon }[] = [
  { name: "About & support", icon: CircleHelp },
  { name: "Accessibility", icon: Accessibility },
  { name: "Notifications", icon: Bell },
];

const supportLinks: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: BookOpen, title: "Help center", detail: "Browse guides and common questions" },
  { icon: MessageCircle, title: "Contact support", detail: "Send a message to our support team" },
  { icon: Shield, title: "Privacy policy", detail: "See how handwriting data is handled" },
  { icon: Mail, title: "Send feedback", detail: "Tell us how we can improve Nabu" },
];

function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        value ? "bg-[#cf5145]" : "bg-[#d7c1ad]"
      }`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${
          value ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  title,
  detail,
  value,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[#eadccd] py-5 last:border-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fae9e3] text-[#b5362b]">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{title}</p>
        <p className="mt-0.5 text-xs font-semibold text-[#765e4b]">{detail}</p>
      </div>
      <Toggle value={value} onChange={onChange} label={title} />
    </div>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-[#765e4b]">{detail}</p>
    </>
  );
}

export function SettingsPage() {
  const [active, setActive] = useState<Tab>("About & support");
  const [prefs, setPrefs] = useState({
    largeText: false,
    contrast: false,
    motion: true,
    email: true,
    review: true,
    product: false,
  });
  const toast = useToast();

  const toggle = (key: keyof typeof prefs) => () =>
    setPrefs((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1080px]">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#cf5145]">
            Preferences
          </p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em]">Settings</h1>
          <p className="mt-2 text-sm font-semibold text-[#765e4b]">
            Manage your experience, alerts, and help resources.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
          <nav className="rounded-2xl border border-[#dfcdb9] bg-white p-2" aria-label="Settings sections">
            {tabs.map(({ name, icon: Icon }) => (
              <button
                type="button"
                key={name}
                onClick={() => setActive(name)}
                aria-current={active === name ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-extrabold transition ${
                  active === name
                    ? "bg-[#fae9e3] text-[#cf5145]"
                    : "text-[#765e4b] hover:bg-[#f6eee4]"
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{name}</span>
                {active === name && <ChevronRight size={15} />}
              </button>
            ))}
          </nav>

          <section className="rounded-[22px] border border-[#dfcdb9] bg-white p-5 shadow-[0_2px_12px_rgba(39,35,28,.04)] sm:p-7">
            {active === "About & support" && (
              <>
                <SectionHeading
                  title="About & support"
                  detail="Learn about Nabu or get help with a learning activity."
                />
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {supportLinks.map(({ icon: Icon, title, detail }) => (
                    <button
                      type="button"
                      key={title}
                      onClick={() => toast.show(`${title} opened`)}
                      className="group flex items-start gap-3 rounded-xl border border-[#dfcdb9] p-4 text-left transition hover:border-[#e2a58c] hover:bg-[#fffdf9]"
                    >
                      <Icon size={18} className="mt-0.5 text-[#b5362b]" />
                      <span className="flex-1">
                        <span className="block text-sm font-extrabold">{title}</span>
                        <span className="mt-1 block text-xs font-semibold leading-5 text-[#765e4b]">
                          {detail}
                        </span>
                      </span>
                      <ExternalLink size={14} className="text-[#aaa49a]" />
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between rounded-xl bg-[#f6eee4] px-4 py-3 text-xs font-bold text-[#765e4b]">
                  <span>Nabu learning</span>
                  <span>Version 1.0.0</span>
                </div>
              </>
            )}

            {active === "Accessibility" && (
              <>
                <SectionHeading
                  title="Accessibility"
                  detail="Adjust the interface for comfort and clarity."
                />
                <div className="mt-5">
                  <SettingRow icon={Type} title="Larger text" detail="Increase text size across the interface." value={prefs.largeText} onChange={toggle("largeText")} />
                  <SettingRow icon={Moon} title="High contrast" detail="Strengthen text and interface contrast." value={prefs.contrast} onChange={toggle("contrast")} />
                  <SettingRow icon={Volume2} title="Interface motion" detail="Allow subtle transitions and loading animation." value={prefs.motion} onChange={toggle("motion")} />
                </div>
              </>
            )}

            {active === "Notifications" && (
              <>
                <SectionHeading
                  title="Notifications"
                  detail="Choose which updates you would like to receive."
                />
                <div className="mt-5">
                  <SettingRow icon={Mail} title="Email notifications" detail="Receive important account and security updates." value={prefs.email} onChange={toggle("email")} />
                  <SettingRow icon={Check} title="Review completed" detail="Get notified when a handwriting grade is ready." value={prefs.review} onChange={toggle("review")} />
                  <SettingRow icon={Bell} title="Product updates" detail="Occasional news about new learning features." value={prefs.product} onChange={toggle("product")} />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      <Toast message={toast.message} />
    </div>
  );
}
