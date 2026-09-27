import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  CheckCircle2,
  Globe2,
  LineChart,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

const howItWorks = [
  {
    step: "01",
    title: "Sign up",
    description:
      "Create a verified account in minutes. Complete your professional profile with education, experience, and skills.",
  },
  {
    step: "02",
    title: "Complete assessments",
    description:
      "Take category-specific assessments — AI evaluation, data quality, programming, finance, language, and more.",
  },
  {
    step: "03",
    title: "Unlock capabilities",
    description:
      "Every assessment builds a capability profile. Pass thresholds and unlock advanced, higher-paying task tiers.",
  },
  {
    step: "04",
    title: "Complete tasks",
    description:
      "Work on real AI training projects from global AI companies — evaluation, annotation, reasoning, and domain expertise.",
  },
  {
    step: "05",
    title: "Earn money",
    description:
      "Your hourly rate reflects your capabilities and quality score. Track your earnings in real time.",
  },
  {
    step: "06",
    title: "Withdraw weekly",
    description:
      "Request payouts every Friday. Multiple payment methods — PayPal, Wise, bank transfer, M-Pesa, and more.",
  },
];

const categories = [
  "AI Response Evaluation",
  "Data Annotation",
  "Text Classification",
  "Image Annotation",
  "Video Annotation",
  "Audio Transcription",
  "Speech Evaluation",
  "Translation Evaluation",
  "Search Relevance",
  "AI Safety Evaluation",
  "Prompt Evaluation",
  "Prompt Engineering",
  "Coding Evaluation",
  "Mathematical Reasoning",
  "General Reasoning",
  "Fact Checking",
  "Data Quality",
  "Business Analysis",
  "Financial Reasoning",
  "Marketing Analysis",
  "Operations & Supply Chain",
  "Computer Science",
  "Domain Expert Tasks",
];

const stats = [
  { label: "Active trainers", value: "12,840+" },
  { label: "Countries", value: "140+" },
  { label: "Tasks completed", value: "8.4M+" },
  { label: "Avg. quality score", value: "94.2%" },
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Quality-controlled work",
    description:
      "Every submission is scored. Gold-standard tasks and peer review keep the network calibrated.",
  },
  {
    icon: LineChart,
    title: "Transparent progression",
    description:
      "See exactly which capabilities you've unlocked, which assessments to take next, and how your rate grows.",
  },
  {
    icon: Wallet,
    title: "Reliable weekly payouts",
    description:
      "Immutable ledger, server-side time tracking, and Friday payouts. No surprises.",
  },
  {
    icon: Globe2,
    title: "Global by design",
    description:
      "Work from anywhere. Payment methods and languages built for a worldwide workforce.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span>EvalForge</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/how-it-works" className="hover:text-foreground">
              How it works
            </Link>
            <Link href="/for-workers" className="hover:text-foreground">
              For trainers
            </Link>
            <Link href="/for-companies" className="hover:text-foreground">
              For companies
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-foreground">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                Become an AI Trainer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="border-b">
        <div className="container grid gap-12 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Trusted by AI labs and enterprises worldwide
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Train Humans.
              <br />
              <span className="text-primary">Improve AI.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Join a global network of AI trainers and evaluators helping build
              safer, smarter and more reliable artificial intelligence.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Become an AI Trainer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/for-companies">For Companies</Link>
              </Button>
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right-side decorative card */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl" />
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/40">
                <CardTitle className="text-base">
                  Capability Profile
                </CardTitle>
                <CardDescription>
                  Illustrative — your real profile is built from assessments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {[
                  { label: "AI Evaluation", level: "Advanced", tone: "primary" },
                  { label: "Data Quality", level: "Intermediate", tone: "muted" },
                  { label: "General Reasoning", level: "Advanced", tone: "primary" },
                  { label: "Financial Reasoning", level: "Beginner", tone: "muted" },
                  { label: "Programming", level: "Intermediate", tone: "primary" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                      {row.label}
                    </span>
                    <span
                      className={
                        row.tone === "primary"
                          ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {row.level}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────── */}
      <section id="how-it-works" className="border-b">
        <div className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-muted-foreground">
              From sign-up to your first payout — a transparent process built
              for professionals.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {howItWorks.map((item) => (
              <Card key={item.step} className="h-full">
                <CardHeader>
                  <div className="text-sm font-mono text-primary">
                    {item.step}
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {item.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Task categories ────────────────────────────────── */}
      <section className="border-b bg-muted/30">
        <div className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Task categories
            </h2>
            <p className="mt-4 text-muted-foreground">
              Specialize in what you're best at. Admins can add new categories
              without code changes.
            </p>
          </div>

          <div className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full border bg-background px-3 py-1.5 text-sm"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust / quality ────────────────────────────────── */}
      <section className="border-b">
        <div className="container py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for serious AI work
              </h2>
              <p className="mt-4 text-muted-foreground">
                Not a gig site. A quality-controlled evaluation platform trusted
                for the tasks that shape how AI models behave.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Server-side time tracking — no self-reported hours",
                  "Gold-standard tasks to detect quality drift",
                  "Peer review with configurable agreement thresholds",
                  "Immutable financial ledger, transactional payouts",
                  "Anti-fraud risk scoring with human review",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {trustPoints.map((t) => {
                const Icon = t.icon;
                return (
                  <Card key={t.title}>
                    <CardHeader>
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{t.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {t.description}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────── */}
      <section className="border-b bg-primary text-primary-foreground">
        <div className="container flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to train the next generation of AI?
            </h2>
            <p className="mt-2 max-w-xl opacity-90">
              Create your profile, take your first assessment, and unlock
              paid tasks this week.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                Become an AI Trainer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/for-companies">For Companies</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} EvalForge. Train Humans. Improve AI.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/faq" className="hover:text-foreground">
              FAQ
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}