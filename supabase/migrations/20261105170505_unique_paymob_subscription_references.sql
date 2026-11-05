-- Prevent duplicate subscription creation when Paymob retries a webhook.
-- Existing production data was checked: no duplicate non-null order_id or transaction_id values.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_order_id_unique
ON public.subscriptions (order_id)
WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_transaction_id_unique
ON public.subscriptions (transaction_id)
WHERE transaction_id IS NOT NULL;
