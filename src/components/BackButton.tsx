export function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button className="back-btn" onClick={onBack} type="button">
      ← Back
    </button>
  );
}
