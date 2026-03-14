# PRIYA

PRIYA is a Pine Labs-first hospital reconciliation prototype built for hackathon demos. It accepts two datasets:

- Pine Labs payment and settlement records for hospitals
- Hospital bank statement credits

The app uploads both CSVs, reconciles them by UTR, and shows:

- Total transactions
- Reconciled and unreconciled percentages
- Delayed settlements
- High-risk exceptions where the difference between Pine Labs net amount and bank credit exceeds 30%

## Run

```bash
npm install
npm run dev
```

## Sample datasets

- `public/datasets/pine_labs_hospital_payments.csv`
- `public/datasets/hospital_bank_statement.csv`

## Pine Labs alignment

The prototype keeps Pine Labs API coverage visible in the product and includes a Pine Labs integration layer for:

- Orders
- Balance
- Payouts
- Settlements
- Payment Links
- Webhooks
- Subscriptions
- Affordability
- Offer Engine

In a production version, the reconciliation engine would call Pine Labs `Get Settlements by UTR` for each UTR and merge that with uploaded bank statements instead of relying on static CSV input.
