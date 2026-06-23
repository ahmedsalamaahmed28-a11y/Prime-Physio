# Paymob Onboarding Integration

## Problem

The onboarding flow (`/setup` → OnboardingFlow → plan → center → dashboard) creates subscriptions without real payment. Basic plan (500 EGP/mo) bypasses Paymob entirely via direct `/api/subscribe` call. Silver/gold plans use Paymob iframe, but after payment the callback creates a subscription with `clinic_id=null` (clinic doesn't exist yet), then create_center creates a duplicate subscription later.

## Flow

```
[OnboardingFlow] plan step
  → ALL plans (basic/silver/gold) open billing modal
  → POST /api/paymob/create-order → iframe URL
  → User pays on Paymob iframe

[Paymob GET callback]
  → If payment successful: store payment_confirmed in app_key_values (NOT create subscription)
  → Redirect to /subscription/success?order=X&tx=Y

[Subscription success page]
  → GET /api/auth/me → check if user has clinic
  → If no clinic (onboarding): redirect to /setup?step=clinic&order=X
  → If has clinic (upgrade): show normal success message

[OnboardingFlow] clinic step
  → User fills center form (name, slug, specializations, logo)
  → POST /api/center-setup with { orderId, planId, ...centerFields }

[/api/center-setup]
  → Check payment_confirmed for orderId in app_key_values
  → Verify planId matches
  → Call create_center RPC with plan_id (creates clinic + branch + subscription + links staff)
  → Delete payment_confirmed from app_key_values
  → Return clinicId + branchId

[OnboardingFlow] done step
  → Redirect to /home
```

## Files to Modify

### 1. `src/components/OnboardingFlow.tsx`

**handleSelectPlan**: Remove the special `planId === "basic"` branch that calls `/api/subscribe`. All plans follow the same path: `setShowBilling(true); setSelectedPlan(planId)`.

**Props**: Accept optional `paymobOrder` prop. If present, skip plan step (start at clinic step) and pass orderId to center-setup API.

### 2. `src/app/api/paymob/callback/route.ts`

**GET handler**: Remove subscription creation during onboarding. Instead store `payment_confirmed` in app_key_values:
- Key: `payment_confirmed_{orderId}`
- Value: `{ orderId, planId, planName, amount, email, timestamp }`

For existing users (clinic exists for the email): keep creating subscription as before.

Redirect always goes to `/subscription/success?order=X&tx=Y`.

**Logic**:
```
look up order info from app_key_values (paymob_order_XXX)
look up clinic by admin_email
if clinic exists:
  create subscription (existing logic)
  redirect to /subscription/success
else:
  store payment_confirmed in app_key_values
  redirect to /subscription/success
```

### 3. `src/app/subscription/success/page.tsx`

On mount: fetch `/api/auth/me` to check `hasClinic`.
- If `hasClinic === false` and `order` param present: redirect to `/setup?step=clinic&order=X`
- If `hasClinic === true`: show normal success page

### 4. `src/app/api/center-setup/route.ts`

Accept `orderId` (optional). When present:
- Look up `payment_confirmed_{orderId}` in app_key_values
- If not found: return 400 "لم يتم تأكيد الدفع"
- Extract planId from payment_confirmed
- Call create_center RPC with planId
- Delete `payment_confirmed` key
- Return result

### 5. `src/app/setup/page.tsx`

Read `order` from URL search params. Pass it to OnboardingFlow as `paymobOrder`.

### 6. `src/app/clinic_setup/page.tsx`

Similarly read `order` from URL and pass to center-setup API.

### 7. `src/app/subscription/failed/page.tsx`

Add link back to `/setup?step=plan` for onboarding users (so they can retry).

### 8. `src/app/api/subscribe/route.ts`

No changes needed — this is still used for upgrades (existing clinic → direct subscribe without Paymob flow).

## No SQL Changes

The `create_center` function remains unchanged — it already accepts `p_plan_id` and creates clinic + branch + subscription atomically.

## Edge Cases

| Case | Handling |
|------|----------|
| User pays but never creates center | payment_confirmed remains in DB (can be cleaned up by admin or expiration) |
| User refreshes success page | /api/auth/me still returns hasClinic=false → redirect to setup again |
| User pays, creates center, payment_confirmed not deleted | create_center already idempotent for subscription creation; key deleted on success |
| Existing user upgrades | Callback detects clinic exists → creates subscription normally → success page shows normal message |
