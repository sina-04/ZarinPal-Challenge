from __future__ import annotations

REQUIRED_COLUMNS = (
    "session_key",
    "try_seq",
    "terminal_key",
    "merchant_key",
    "category_id",
    "category_title",
    "amount",
    "adjusted_fee",
    "session_status",
    "try_status",
    "switch_response_code",
    "psp_code",
    "issuer_bank_code",
    "payer_card_key",
    "verify_type",
    "init_time_ms",
    "verify_time_ms",
    "created_at",
    "try_created_at",
    "verified_at",
    "settled_at",
    "expire_in",
)

SESSION_CONSISTENCY_COLUMNS = (
    "terminal_key",
    "merchant_key",
    "category_id",
    "category_title",
    "amount",
    "adjusted_fee",
    "session_status",
    "verify_type",
    "created_at",
    "verified_at",
    "settled_at",
    "expire_in",
)

CATEGORY_TITLES = {
    48160002: "ارائه دهنده خدمات اینترنت",
    82410000: "مراکز آموزشی مجازی",
    56610001: "کیف و کفش فروشی",
    48160000: "خدمات شبکه‌های کامپیوتری و اینترنت",
    59770001: "فروشگاه لوازم آرایشی و بهداشتی",
}

SESSION_STATUSES = ("Verified", "Paid", "InBank", "Failed", "Reversed")
TRY_STATUSES = ("Verified", "Paid", "InBank", "Failed", "Reversed", "NoAttempt")
VERIFY_TYPES = ("Automated", "Manual")

ADJUSTED_FEE_NOTICE = (
    "Adjusted fee is a uniformly transformed analytical value and does not "
    "represent ZarinPal's actual tariff."
)

COMMON_LIMITATIONS_FA = (
    "محاسبه در سطح نشست و پس از کنترل سازگاری فیلدهای تکرارشونده انجام شده است.",
    "این نتیجه توصیفی است و رابطهٔ علّی را اثبات نمی‌کند.",
)
