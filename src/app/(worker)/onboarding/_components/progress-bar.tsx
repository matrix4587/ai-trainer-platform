const STEPS = [
  { num: 1, label: "Personal", weight: 20 },
  { num: 2, label: "Education", weight: 15 },
  { num: 3, label: "Experience", weight: 15 },
  { num: 4, label: "Skills", weight: 15 },
  { num: 5, label: "Languages", weight: 10 },
  { num: 6, label: "Resume", weight: 15 },
  { num: 7, label: "Review", weight: 10 },
];

export function ProgressBar({ completion }: { completion: number }) {
  // Determine current step from completion percentage
  let cumulative = 0;
  let currentStep = 1;
  for (const s of STEPS) {
    cumulative += s.weight;
    if (completion < cumulative) {
      currentStep = s.num;
      break;
    }
    currentStep = s.num;
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium">
          Step {currentStep} of {STEPS.length}
        </p>
        <p className="text-muted-foreground">{completion}% complete</p>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s) => (
          <span
            key={s.num}
            className={
              s.num < currentStep
                ? "rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
                : s.num === currentStep
                  ? "rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground"
                  : "rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
            }
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}