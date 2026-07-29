import type { TripProgress } from "../../lib/tripDrafts";
import type { TripPlannerTranslate } from "./types";

export function TripProgressCard({
  language,
  progress,
  translate
}: {
  language: string;
  progress: TripProgress;
  translate: TripPlannerTranslate;
}) {
  const percentLabel = translate("tripDrafts.progress.percentComplete")
    .replace("{percent}", formatProgressNumber(progress.completionPercent, language));

  return (
    <section className="trip-progress" aria-labelledby="trip-progress-title">
      <div className="trip-progress__header">
        <div>
          <h2 id="trip-progress-title">{translate("tripDrafts.progress.title")}</h2>
          <p>{translate("tripDrafts.progress.completion")}</p>
        </div>
        <strong className="trip-progress__percentage">{percentLabel}</strong>
      </div>
      <div
        aria-label={percentLabel}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress.completionPercent}
        className="trip-progress__track"
        role="progressbar"
      >
        <span className="trip-progress__fill" style={{ inlineSize: `${progress.completionPercent}%` }} />
      </div>
      <div className="trip-progress__counts">
        <span className="trip-progress__count">
          {translate("tripDrafts.progress.visitedCount").replace("{count}", formatProgressNumber(progress.visited, language))}
        </span>
        <span className="trip-progress__count">
          {translate("tripDrafts.progress.skippedCount").replace("{count}", formatProgressNumber(progress.skipped, language))}
        </span>
        <span className="trip-progress__count">
          {translate("tripDrafts.progress.remainingCount").replace("{count}", formatProgressNumber(progress.remaining, language))}
        </span>
        <span className="trip-progress__count">
          {translate("tripDrafts.progress.total").replace("{count}", formatProgressNumber(progress.total, language))}
        </span>
      </div>
    </section>
  );
}

function formatProgressNumber(value: number, language: string) {
  try {
    return new Intl.NumberFormat(localeForLanguage(language), { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

function localeForLanguage(language: string) {
  if (language === "es") return "es-ES";
  if (language === "fr") return "fr-FR";
  if (language === "ar") return "ar";
  if (language === "pt") return "pt-BR";
  return "en-US";
}
