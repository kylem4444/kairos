"use client";

export function ActionButtons({
  disabled,
  busy,
  onPurchase,
  onDestroy,
}: {
  disabled: boolean;
  busy: boolean;
  onPurchase: () => void;
  onDestroy: () => void;
}) {
  return (
    <div className="actions">
      <button
        type="button"
        className="btn btn-purchase"
        disabled={disabled || busy}
        onClick={onPurchase}
      >
        {busy ? "Loading…" : "Purchase"}
      </button>
      <button
        type="button"
        className="btn btn-destroy"
        disabled={disabled || busy}
        onClick={onDestroy}
      >
        {busy ? "Loading…" : "Destroy"}
      </button>
    </div>
  );
}
