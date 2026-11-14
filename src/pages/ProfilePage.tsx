import { FormEvent, ReactNode, useState } from "react";
import { Eye, EyeOff, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Toast, useToast } from "../components/Toast";

function Field({
  label,
  value,
  onChange,
  type = "text",
  right,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  right?: ReactNode;
}) {
  return (
    <label className="block text-sm font-extrabold">
      {label}
      <span className="relative mt-2 block">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-[#dfcdb9] bg-[#fffdf9] px-4 pr-12 text-sm font-bold outline-none transition focus:border-[#cf5145] focus:ring-3 focus:ring-[#cf5145]/10"
        />
        {right && <span className="absolute right-2 top-1/2 -translate-y-1/2">{right}</span>}
      </span>
    </label>
  );
}

function CardHeader({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fae9e3] text-[#b5362b]">
        {icon}
      </span>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs font-semibold text-[#765e4b]">{detail}</p>
      </div>
    </div>
  );
}

// Dummy profile: all values are sample data and nothing is persisted yet.
export function ProfilePage() {
  const [email, setEmail] = useState("jordan.doe@example.com");
  const [currentPassword, setCurrentPassword] = useState("nabupass");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const toast = useToast();

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    toast.show("Email updated");
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) return;
    setCurrentPassword(newPassword);
    setNewPassword("");
    toast.show("Password updated");
  };

  const passwordType = showPasswords ? "text" : "password";

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[980px]">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#cf5145]">
            Your account
          </p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em]">Profile</h1>
          <p className="mt-2 text-sm font-semibold text-[#765e4b]">
            Update your sign-in details or log out of this device.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[22px] border border-[#dfcdb9] bg-white p-6 text-center">
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#4c7bd9] font-heading text-2xl font-semibold text-white">
              JD
            </span>
            <h2 className="mt-4 text-xl font-semibold">Jordan Doe</h2>
            <p className="mt-1 text-sm font-semibold text-[#765e4b]">Dummy account</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#fae9e3] px-3 py-1.5 text-xs font-extrabold text-[#b5362b]">
              <ShieldCheck size={14} /> Email verified
            </span>
            <div className="mt-6 border-t border-[#eadccd] pt-5 text-left">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#989188]">
                Account note
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#765e4b]">
                This profile uses sample data. Changes are shown for demonstration only.
              </p>
            </div>
          </aside>

          <div className="space-y-5">
            <form
              onSubmit={submitEmail}
              className="rounded-[22px] border border-[#dfcdb9] bg-white p-5 sm:p-7"
            >
              <CardHeader
                icon={<Mail size={18} />}
                title="Email address"
                detail="Used to sign in and receive account notices."
              />
              <div className="mt-5">
                <Field label="Email" value={email} onChange={setEmail} type="email" />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-[#cf5145] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#b5362b]"
                >
                  Save email
                </button>
              </div>
            </form>

            <form
              onSubmit={submitPassword}
              className="rounded-[22px] border border-[#dfcdb9] bg-white p-5 sm:p-7"
            >
              <CardHeader
                icon={<UserRound size={18} />}
                title="Change password"
                detail="Choose a password with at least 8 characters."
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  type={passwordType}
                />
                <Field
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  type={passwordType}
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="grid size-8 place-items-center rounded-lg text-[#765e4b] hover:bg-[#f6eee4]"
                      aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    >
                      {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={newPassword.length < 8}
                  className="rounded-xl bg-[#cf5145] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#b5362b] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Update password
                </button>
              </div>
            </form>

            <section className="flex flex-col gap-4 rounded-[22px] border border-[#dfcdb9] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <h2 className="text-lg font-semibold">Log out</h2>
                <p className="mt-1 text-xs font-semibold text-[#765e4b]">
                  End this session on the current device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.show("Logged out of demo")}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#b85850] px-5 py-3 text-sm font-extrabold text-[#a2443d] hover:bg-[#fff5f4]"
              >
                <LogOut size={17} /> Log out
              </button>
            </section>
          </div>
        </div>
      </div>
      <Toast message={toast.message} />
    </div>
  );
}
