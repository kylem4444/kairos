"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import {
  computePriceCents,
  formatUsdFromCents,
} from "@/lib/price";
import { getStripePromise } from "@/lib/stripe-client";
import type { Outcome } from "@/lib/types";

type CheckoutResult = {
  youWon: boolean;
  someoneElse?: boolean;
  outcome: Outcome;
  amountCents?: number;
  message?: string;
};

export function EmbeddedCheckout({
  outcome,
  startPriceCents,
  liveAt,
  durationMs,
  onCancel,
  onSettled,
  onError,
}: {
  outcome: Outcome;
  startPriceCents: number;
  liveAt: string;
  durationMs: number;
  onCancel: () => void;
  onSettled: (result: CheckoutResult) => void;
  onError: (message: string) => void;
}) {
  const [amountCents, setAmountCents] = useState(() =>
    computePriceCents({ startPriceCents, liveAt, durationMs }),
  );
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    const id = window.setInterval(() => {
      setAmountCents(
        computePriceCents({ startPriceCents, liveAt, durationMs }),
      );
    }, 250);
    return () => window.clearInterval(id);
  }, [startPriceCents, liveAt, durationMs]);

  if (amountCents <= 0) {
    return (
      <div className="checkout-panel">
        <p className="checkout-heading">
          {outcome === "destroy" ? "Destroy" : "Purchase"}
        </p>
        <p className="checkout-note">
          The price has reached zero. The artwork will be destroyed on livestream.
        </p>
        <button type="button" className="btn" onClick={onCancel}>
          Close
        </button>
      </div>
    );
  }

  // Use real Stripe Elements whenever a publishable key is present
  if (!stripePublishableKey) {
    return (
      <DemoPayForm
        outcome={outcome}
        amountCents={amountCents}
        onCancel={onCancel}
        onSettled={onSettled}
        onError={onError}
      />
    );
  }

  return (
    <StripePayShell
      outcome={outcome}
      amountCents={amountCents}
      onCancel={onCancel}
      onSettled={onSettled}
      onError={onError}
    />
  );
}

function DemoPayForm({
  outcome,
  amountCents,
  onCancel,
  onSettled,
  onError,
}: {
  outcome: Outcome;
  amountCents: number;
  onCancel: () => void;
  onSettled: (result: CheckoutResult) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.message ?? data.error ?? "Payment failed.");
        return;
      }
      onSettled({
        youWon: Boolean(data.youWon),
        someoneElse: data.youWon === false,
        outcome,
        amountCents: data.amountCents,
        message: data.message,
      });
    } catch {
      onError("Network error confirming payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout-panel">
      <p className="checkout-heading">
        {outcome === "destroy" ? "Destroy" : "Purchase"}
      </p>
      <p className="checkout-note">
        Demo mode — no card required. The live price still ticks; pay when you
        want.
      </p>
      <div className="checkout-actions">
        <button
          type="button"
          className="btn btn-purchase"
          disabled={busy || amountCents <= 0}
          onClick={() => void pay()}
        >
          {busy ? "Paying…" : `Pay ${formatUsdFromCents(amountCents)}`}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function StripePayShell({
  outcome,
  amountCents,
  onCancel,
  onSettled,
  onError,
}: {
  outcome: Outcome;
  amountCents: number;
  onCancel: () => void;
  onSettled: (result: CheckoutResult) => void;
  onError: (message: string) => void;
}) {
  const stripePromise = useMemo(() => getStripePromise(), []);
  // Remount Elements when amount crosses large thresholds is heavy;
  // we keep a stable initial amount and sync via elements.update in the form.
  const [initialAmount] = useState(amountCents);

  const options: StripeElementsOptions = useMemo(
    () => ({
      mode: "payment",
      amount: Math.max(initialAmount, 50),
      currency: "usd",
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#111111",
          colorBackground: "#ffffff",
          colorText: "#111111",
          colorDanger: "#b42318",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          borderRadius: "0px",
          spacingUnit: "4px",
        },
      },
    }),
    [initialAmount],
  );

  const belowMinimum = amountCents > 0 && amountCents < 50;

  return (
    <div className="checkout-panel">
      <p className="checkout-heading">
        {outcome === "destroy" ? "Destroy" : "Purchase"}
      </p>
      <p className="checkout-note">
        {belowMinimum
          ? "The price is below Stripe’s $0.50 minimum. The artwork will auto-destroy at zero."
          : "Enter your payment details while the price falls. Click pay at the amount you want."}
      </p>
      <Elements stripe={stripePromise} options={options}>
        <StripePayForm
          outcome={outcome}
          amountCents={amountCents}
          belowMinimum={belowMinimum}
          onCancel={onCancel}
          onSettled={onSettled}
          onError={onError}
        />
      </Elements>
    </div>
  );
}

function StripePayForm({
  outcome,
  amountCents,
  belowMinimum,
  onCancel,
  onSettled,
  onError,
}: {
  outcome: Outcome;
  amountCents: number;
  belowMinimum: boolean;
  onCancel: () => void;
  onSettled: (result: CheckoutResult) => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // Keep Elements amount in sync with the ticking price (min $0.50 for Stripe)
  useEffect(() => {
    if (!elements) return;
    const synced = Math.max(amountCents, 50);
    try {
      elements.update({ amount: synced });
    } catch {
      /* Elements may not be ready yet */
    }
  }, [amountCents, elements]);

  async function pollStatus(paymentIntentId: string): Promise<CheckoutResult> {
    for (let i = 0; i < 10; i++) {
      const res = await fetch(
        `/api/checkout/status?session_id=${encodeURIComponent(paymentIntentId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.youWon) {
          return {
            youWon: true,
            outcome,
            amountCents: data.settledAmountCents,
          };
        }
        if (data.someoneElse) {
          return {
            youWon: false,
            someoneElse: true,
            outcome,
            message:
              "Someone else claimed it first. If you were charged, you will be refunded.",
          };
        }
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    return {
      youWon: false,
      outcome,
      message:
        "Payment submitted. Confirming… refresh if the status does not update.",
    };
  }

  async function pay() {
    if (!stripe || !elements) return;

    setBusy(true);
    try {
      // Sync amount one last time before submit so Elements matches the PI
      const payAmount = Math.max(amountCents, 50);
      elements.update({ amount: payAmount });

      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? "Check your payment details.");
        return;
      }

      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.message ?? data.error ?? "Could not create payment.");
        return;
      }

      // Price may have moved between click and PI create — align Elements
      if (typeof data.amountCents === "number") {
        elements.update({ amount: Math.max(data.amountCents, 50) });
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: data.returnUrl,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Payment failed.");
        return;
      }

      const paymentIntentId =
        paymentIntent?.id ?? (data.paymentIntentId as string);

      if (
        paymentIntent?.status === "succeeded" ||
        paymentIntent?.status === "processing"
      ) {
        const result = await pollStatus(paymentIntentId);
        onSettled(result);
        return;
      }

      onError("Payment was not completed. Please try again.");
    } catch {
      onError("Network error confirming payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="payment-element">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: "tabs" }}
        />
      </div>
      <div className="checkout-actions">
        <button
          type="button"
          className="btn btn-purchase"
          disabled={
            !stripe ||
            !elements ||
            !ready ||
            busy ||
            amountCents <= 0 ||
            belowMinimum
          }
          onClick={() => void pay()}
        >
          {busy ? "Paying…" : `Pay ${formatUsdFromCents(amountCents)}`}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </>
  );
}
