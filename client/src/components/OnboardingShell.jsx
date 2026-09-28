import Wordmark from './Wordmark';

// Shared frame for the one-time buyer/supplier setup forms.
export function OnboardingShell({ step, title, description, children }) {
  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Wordmark to="/" />
        <div className="mt-10">
          {step && <p className="eyebrow">{step}</p>}
          <h1 className="page-title mt-2">{title}</h1>
          {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

// Multi-select as toggle buttons, announced as a labelled group with pressed state.
export function ChoiceChips({ legend, hint, options, selected, onToggle }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      {hint && <p className="field-hint -mt-1 mb-2.5">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors duration-150 ${
                active ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-2 hover:border-ink/40'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
