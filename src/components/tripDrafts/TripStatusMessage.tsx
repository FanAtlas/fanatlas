export function TripStatusMessage({
  action,
  isError = false,
  message
}: {
  action?: {
    disabled?: boolean;
    label: string;
    onClick: () => void;
  };
  isError?: boolean;
  message: string;
}) {
  if (!message) return null;
  return (
    <div className={`${isError ? "route-status error" : "route-status"}${action ? " trip-status-message" : ""}`}>
      <span className="trip-status-message__content">{message}</span>
      {action && (
        <button
          className="secondary-btn trip-status-message__undo"
          disabled={action.disabled}
          onClick={action.onClick}
          type="button"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
