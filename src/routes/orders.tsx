import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { PageShell, SignInPrompt } from "@/components/PageShell";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My orders — Roots" }] }),
  component: Orders,
});

const STATUS_LABEL: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  upi_on_delivery: "UPI on delivery",
};

function Orders() {
  const { user, ready } = useSessionUser();
  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, locality, payment_method, total, created_at, order_items(name, quantity, unit_price)",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (ready && !user) {
    return (
      <PageShell>
        <SignInPrompt
          title="Sign in to see your orders"
          body="Your order history lives with your account."
          redirect="/orders"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Your account</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">My orders</h1>

      {error ? (
        <p className="mt-8 text-sm text-terra">
          We couldn't load your orders. Please refresh to try again.
        </p>
      ) : isLoading || !ready ? (
        <p className="mt-8 text-sm text-ink/55">Loading…</p>
      ) : !orders?.length ? (
        <div className="mt-8 rounded-3xl border border-ink/5 bg-surface/60 p-8 text-center">
          <p className="font-display text-lg font-semibold">No orders yet</p>
          <a
            href="/#shop"
            className="mt-4 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
          >
            Browse plants
          </a>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-3xl border border-ink/5 bg-surface/60 p-5 backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-semibold">{order.order_number}</p>
                  <p className="text-xs text-ink/50">
                    {new Date(order.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {order.locality} ·{" "}
                    {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <span className="font-display text-lg font-semibold">
                    {formatINR(Number(order.total))}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink/65">
                {order.order_items.map((item) => `${item.quantity} × ${item.name}`).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
