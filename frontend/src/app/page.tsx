import {
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  Library,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Jobs saved", value: "0" },
  { label: "Resumes generated", value: "0" },
  { label: "Applications tracked", value: "0" },
  { label: "Average match", value: "--" },
];

const workflow = [
  "Save job description",
  "Assemble Gemini prompt",
  "Upload raw DOCX",
  "Validate rules",
  "Format final resume",
  "Track application",
];

const modules = [
  {
    title: "Jobs",
    detail: "Company, role, URL, requirements, status, and notes.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Prompts",
    detail: "Versioned Gemini prompt templates for resume tailoring.",
    icon: WandSparkles,
  },
  {
    title: "Validation",
    detail: "Eligibility, bullet counts, word counts, skills, and match checks.",
    icon: ShieldCheck,
  },
  {
    title: "Formatter",
    detail: "FastAPI wrapper around the existing Python DOCX formatter.",
    icon: FileText,
  },
  {
    title: "Library",
    detail: "Generated DOCX/PDF resumes linked to jobs and prompts.",
    icon: Library,
  },
  {
    title: "Tracker",
    detail: "Saved, generated, applied, interview, rejected, offer, and follow-up.",
    icon: CalendarClock,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-[#fdfdfb]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#6f7d4f]">ResumeFlow OS</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#17212b]">
                Application workflow dashboard
              </h1>
            </div>
            <Link
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#264653] px-4 text-sm font-medium text-white transition hover:bg-[#1f3944] sm:w-auto"
              href="/dashboard"
            >
              <BriefcaseBusiness size={17} aria-hidden="true" />
              Open dashboard
            </Link>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-md border border-[#d9d6cc] bg-white p-4"
              >
                <p className="text-sm text-[#65707a]">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#17212b]">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_340px] lg:px-10">
        <div>
          <h2 className="text-lg font-semibold text-[#17212b]">MVP workflow</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="rounded-md border border-[#d9d6cc] bg-white p-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e9c46a] text-sm font-semibold text-[#17212b]">
                  {index + 1}
                </span>
                <p className="mt-4 text-sm font-medium text-[#17212b]">{step}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-8 text-lg font-semibold text-[#17212b]">Core modules</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <div
                  key={module.title}
                  className="rounded-md border border-[#d9d6cc] bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#d8eadf] text-[#2a6f58]">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[#17212b]">{module.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#65707a]">{module.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#17212b]">Service status</h2>
          <div className="mt-4 space-y-3">
            {["Frontend", "Backend API", "Formatter API", "PostgreSQL", "Redis"].map(
              (service) => (
                <div
                  key={service}
                  className="flex items-center justify-between border-b border-[#eeeae0] pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-[#38434f]">{service}</span>
                  <span className="rounded-md bg-[#e6f0ec] px-2 py-1 text-xs font-medium text-[#2a6f58]">
                    Ready
                  </span>
                </div>
              )
            )}
          </div>
        </aside>
      </section>
      </main>
  );
}
