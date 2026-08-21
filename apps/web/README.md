# نبض زرین — وب

رابط فارسی RTL محصول تحلیلی پذیرندگان، ساخته‌شده با Next.js App Router، shadcn/ui،
ECharts و AI SDK. محاسبات قطعی از FastAPI دریافت می‌شوند و تحلیل‌گر فقط شواهد
اعتبارسنجی‌شده را توضیح می‌دهد.

از ریشه مخزن pnpm install --frozen-lockfile و سپس pnpm dev را اجرا کنید. وب روی
پورت 3000 و API روی پورت 8000 اجرا می‌شود.

در اجرای عادی متصل به API، داده رسمی pin‌شده تا `2026-06-30` با
`checksum_status=verified` و `partial_data=false` استفاده می‌شود. بدون API، فقط
snapshot جزئی M43 با برچسب آشکار `deterministic_offline_snapshot` و
`partial_data=true` در دسترس است. بدون `OPENAI_API_KEY` پاسخ قطعی محلی جایگزین
توضیح مدل می‌شود.

پس از تغییر قرارداد FastAPI، pnpm --dir apps/web api:schema را اجرا کنید.

برای اجرای خروجی production/standalone از ریشه مخزن:

```powershell
pnpm build
# برای آماده‌سازی artifact بدون اجرا:
pnpm --dir apps/web prepare:standalone
# این فرمان prepare را نیز خودکار انجام می‌دهد و سپس server.js را اجرا می‌کند:
pnpm --dir apps/web start:standalone
```

`/api/health` فقط وقتی HTTP 200 می‌دهد که FastAPI در دسترس و DuckDB آماده باشد؛
قطع بالادست یا دیتابیس ناآماده HTTP 503 می‌دهد. حالت نمونه/جزئی می‌تواند با
`status=degraded` و `database_ready=true` آمادهٔ سرویس باشد، بنابراین برای تشخیص
دادهٔ کامل باید `status`، `source_kind` و `checksum_status` بدنهٔ `/healthz` خود API
نیز بررسی شود.
