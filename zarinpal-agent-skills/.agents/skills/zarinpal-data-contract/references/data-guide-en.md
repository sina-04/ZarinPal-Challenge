# Dataset Column Guide — ZarinPal Challenge

## Structure

Each row represents **one payment attempt**, not necessarily a unique session.
A payment session may contain multiple attempts; in that case, session-level information
(amount, merchant, business category, and so on) is repeated in every row belonging to that session.

The file is in CSV format with UTF-8 encoding. Timestamp columns use the `YYYY-MM-DD HH:MM:SS` format.

---

## Payment Lifecycle

```text
The merchant creates a payment request     →  A session is created
The user is redirected to the bank gateway →  InBank
The bank debits the amount from the card   →  Paid
The merchant verifies the transaction      →  Verified
```

| Value | Meaning |
|---|---|
| `Verified` | The payment was completed and verified by the merchant — the final and complete state |
| `Paid` | The amount was debited from the buyer's card, but the merchant did not verify the transaction |
| `InBank` | The user was redirected to the bank gateway, but no result was returned |
| `Failed` | The attempt/session was unsuccessful |
| `Reversed` | The funds were reversed |
| `NoAttempt` | Used only in `try_status` for a session with no recorded payment attempt |

---

## Columns

| Column | Type | Description | Empty when |
|---|---|---|---|
| `session_key` | Identifier | Pseudonymous identifier of the payment session | — |
| `try_seq` | Number | Sequential number of the attempt within the same session, starting from 1 | `0` means the session had no attempt |
| `terminal_key` | Identifier | Pseudonymous identifier of the payment terminal | — |
| `merchant_key` | Identifier | Pseudonymous identifier of the account owner. A merchant may have multiple terminals | — |
| `category_id` | Number | Business-category code | — |
| `category_title` | Text | Business-category title | — |
| `amount` | Number | Transaction amount in **Iranian rials** | — |
| `adjusted_fee` | Number | Adjusted fee in Iranian rials — see Note 1 | — |
| `session_status` | Text | Final status of the entire session | — |
| `try_status` | Text | Status of this specific attempt | — |
| `switch_response_code` | Text | Banking-switch response code — see Note 2 | The switch returned no code |
| `psp_code` | Text | Payment service provider through which **this attempt** was routed | No attempt exists |
| `issuer_bank_code` | Text | Bank that issued the buyer's card | Card information was not returned — see Note 3 |
| `payer_card_key` | Identifier | Pseudonymous identifier of the buyer's card — see Note 4 | Under the same condition as `issuer_bank_code` |
| `verify_type` | Text | Merchant verification method: `Automated` or `Manual` | — |
| `init_time_ms` | Number | Duration of the payment-gateway API call when initiating the payment, in **milliseconds** — see Note 5 | This stage was not completed |
| `verify_time_ms` | Number | Duration of the API call during verification, in **milliseconds** — see Note 5 | The verification stage was not completed |
| `created_at` | Timestamp | Time at which the session was created | — |
| `try_created_at` | Timestamp | Time at which this attempt was created | No attempt exists |
| `verified_at` | Timestamp | Time at which the transaction was verified | The transaction was not verified |
| `settled_at` | Timestamp | Settlement time | No settlement occurred |
| `expire_in` | Timestamp | Session expiration time | — |

---

## Notes

**1 — `adjusted_fee`.** To preserve commercial confidentiality, this value has been
adjusted using a fixed multiplier and does not represent ZarinPal's actual pricing.
Because the adjustment is applied uniformly to all rows, relative relationships—including
rankings, time trends, and the fee-to-revenue ratio—remain valid for analysis.

**2 — `switch_response_code`.** Each payment service provider has its own code space;
the same numerical code does not necessarily have the same meaning across two providers.
For this reason, the value is stored in the form `PSP-xx:code` and is scoped to that
specific provider. A reference table explaining these codes has not been provided for
the competition.

**3 — `issuer_bank_code` and `payer_card_key`.** The buyer's card information becomes
available to the payment gateway only when the payment process is completed at the bank.
If the user abandons the payment or the bank rejects it, the card information is never
returned, and these two columns remain empty.

**4 — `payer_card_key`.** This identifier is unique **within each merchant**. The same
physical card receives different identifiers when used with two different merchants.

**5 — Millisecond timing columns.** These two columns measure the payment-gateway API
response times and **do not represent the user's thinking or interaction time**.

**6 — Identifiers.** All session, terminal, merchant, payment service provider, bank,
and card identifiers are **pseudonymous** and do not refer to any real identity, name,
or identifier.
