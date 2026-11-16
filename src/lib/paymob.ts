import { createHmac, timingSafeEqual } from "crypto";

type PaymobCallback = {
  obj?: Record<string, unknown> & {
    order?: { id?: string | number };
    source_data?: { pan?: string | number; sub_type?: string; type?: string };
  };
};

export function verifyPaymobTransactionHmac(
  payload: PaymobCallback,
  receivedHmac: string | null | undefined,
  secret: string
): boolean {
  const obj = payload?.obj;
  if (!obj || !receivedHmac || !/^[a-f0-9]{128}$/i.test(receivedHmac) || !secret) return false;

  const values = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order?.id,
    obj.owner,
    obj.pending,
    obj.source_data?.pan,
    obj.source_data?.sub_type,
    obj.source_data?.type,
    obj.success,
  ];

  const message = values.map((value) => value === null || value === undefined ? "" : String(value)).join("");
  const expected = createHmac("sha512", secret).update(message, "utf8").digest();
  const supplied = Buffer.from(receivedHmac, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function getPaymobCheckoutUrl(baseUrl: string, publicKey: string, clientSecret: string) {
  const url = new URL("/unifiedcheckout/", baseUrl);
  url.searchParams.set("publicKey", publicKey);
  url.searchParams.set("clientSecret", clientSecret);
  return url.toString();
}
