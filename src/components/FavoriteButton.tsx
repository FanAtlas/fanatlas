import { MouseEvent, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { FavoriteItem, isFavorite, removeFavorite, saveFavorite } from "../services/favorites";

type Props = {
  item: FavoriteItem;
  compact?: boolean;
  onChange?: () => void;
};

export function FavoriteButton({ item, compact = false, onChange }: Props) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    isFavorite(item.item_type, item.item_id)
      .then((value) => {
        if (mounted) setActive(value);
      })
      .catch(() => {
        if (mounted) setError("");
      });

    return () => {
      mounted = false;
    };
  }, [item.item_id, item.item_type]);

  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      setLoading(true);
      setError("");

      if (active) {
        await removeFavorite(item.item_type, item.item_id);
        setActive(false);
      } else {
        await saveFavorite(item);
        setActive(true);
      }

      onChange?.();
    } catch (err: any) {
      setError(err?.message || "Could not update favorites.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="favorite-control">
      <button
        aria-label={active ? `Remove ${item.name} from favorites` : `Save ${item.name} to favorites`}
        className={`favorite-btn ${active ? "active" : ""} ${compact ? "compact" : ""}`}
        disabled={loading}
        onClick={toggle}
        type="button"
      >
        <Heart size={compact ? 15 : 17} fill={active ? "currentColor" : "none"} />
        {!compact && <span>{active ? "Remove" : "Save"}</span>}
      </button>
      {error && !compact && <small className="favorite-error">{error}</small>}
    </span>
  );
}
