import { ExternalLink, Phone, Search } from "lucide-react";
import type { SavedPlaceAction } from "../lib/savedPlaceActions";

type SavedPlaceSecondaryActionsProps = {
  actions: SavedPlaceAction[];
  translate: (key: string) => string;
  onInternalAction?: (action: SavedPlaceAction) => void;
  className?: string;
  compact?: boolean;
};

const VISIBLE_SECONDARY_LIMIT = 3;

export function SavedPlaceSecondaryActions({
  actions,
  translate,
  onInternalAction,
  className = "",
  compact = false
}: SavedPlaceSecondaryActionsProps) {
  const visibleActions = secondaryActions(actions, Boolean(onInternalAction));
  if (visibleActions.length === 0) return null;

  return (
    <div className={["saved-place-secondary-actions", compact ? "compact" : "", className].filter(Boolean).join(" ")}>
      {visibleActions.map((action) => renderAction(action, translate, onInternalAction))}
    </div>
  );
}

function secondaryActions(actions: SavedPlaceAction[], includeInternalActions: boolean) {
  const seen = new Set<SavedPlaceAction["kind"]>();
  const visible: SavedPlaceAction[] = [];

  for (const action of actions) {
    if (seen.has(action.kind)) continue;
    seen.add(action.kind);

    if (action.kind === "call" || action.kind === "open_website" || action.kind === "search_web") {
      if (!isSafeHref(action)) continue;
      visible.push(action);
    } else if (includeInternalActions) {
      visible.push(action);
    }

    if (visible.length >= VISIBLE_SECONDARY_LIMIT) break;
  }

  return visible;
}

function renderAction(
  action: SavedPlaceAction,
  translate: (key: string) => string,
  onInternalAction?: (action: SavedPlaceAction) => void
) {
  const label = translate(action.labelKey);

  switch (action.kind) {
    case "call":
      return (
        <a className="saved-place-secondary-action" href={action.href} key={action.kind}>
          <Phone size={14} aria-hidden="true" />
          <span>{label}</span>
        </a>
      );
    case "open_website":
      return (
        <a className="saved-place-secondary-action" href={action.href} key={action.kind} rel="noopener noreferrer" target="_blank">
          <ExternalLink size={14} aria-hidden="true" />
          <span>{label}</span>
        </a>
      );
    case "search_web":
      return (
        <a className="saved-place-secondary-action" href={action.href} key={action.kind} rel="noopener noreferrer" target="_blank">
          <Search size={14} aria-hidden="true" />
          <span>{label}</span>
        </a>
      );
    case "open_restaurant":
    case "open_hotel":
    case "open_map":
    case "open_stadium":
    case "open_fan_zone":
    case "open_event":
      if (!onInternalAction) return null;
      return (
        <button className="saved-place-secondary-action" key={action.kind} onClick={() => onInternalAction(action)} type="button">
          <ExternalLink size={14} aria-hidden="true" />
          <span>{label}</span>
        </button>
      );
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function isSafeHref(action: SavedPlaceAction) {
  if (action.kind === "call") return action.href.startsWith("tel:") && action.href.length > 4;
  if (action.kind === "open_website" || action.kind === "search_web") {
    try {
      const url = new URL(action.href);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
  return false;
}
