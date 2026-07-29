import { useId, useRef } from "react";
import { PHOTO_MAX_FILE_SIZE, PHOTO_MAX_SELECTION_COUNT } from "../../lib/tripPhotoStorage";
import type { TripPlannerTranslate } from "./types";

export function TripPhotoPicker({
  disabled,
  language,
  onSelectFiles,
  translate
}: {
  disabled?: boolean;
  language: string;
  onSelectFiles: (files: File[]) => void;
  translate: TripPlannerTranslate;
}) {
  const inputId = useId();
  const helpId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="trip-photo-picker">
      <label className="secondary-btn trip-photo-picker__label" htmlFor={inputId}>
        {disabled ? translate("tripDrafts.photos.adding") : translate("tripDrafts.photos.add")}
      </label>
      <input
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        aria-describedby={helpId}
        className="trip-photo-picker__input"
        disabled={disabled}
        id={inputId}
        multiple
        onChange={(event) => {
          const files: File[] = [];
          const selectedFiles = event.currentTarget.files;
          if (selectedFiles) {
            for (let index = 0; index < selectedFiles.length; index += 1) {
              const file = selectedFiles.item(index);
              if (file) files.push(file);
            }
          }
          if (files.length > 0) onSelectFiles(files);
          if (inputRef.current) inputRef.current.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <p className="trip-photo-picker__help" id={helpId}>
        {translate("tripDrafts.photos.helper")
          .replace("{size}", formatPhotoNumber(Math.floor(PHOTO_MAX_FILE_SIZE / 1024 / 1024), language))
          .replace("{count}", formatPhotoNumber(PHOTO_MAX_SELECTION_COUNT, language))}
      </p>
    </div>
  );
}

export function formatPhotoNumber(value: number, language: string) {
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
