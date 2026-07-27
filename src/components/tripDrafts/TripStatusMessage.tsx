export function TripStatusMessage({
  isError = false,
  message
}: {
  isError?: boolean;
  message: string;
}) {
  if (!message) return null;
  return (
    <div className={isError ? "route-status error" : "route-status"}>
      {message}
    </div>
  );
}
