/**
 * Saat kuleli bina — sekme logosunun (client/public/favicon.svg) uygulama içi
 * karşılığı. Şekiller aynıdır; renkler farklı yoldan gelir: favicon işletim
 * sisteminin `prefers-color-scheme` tercihini okur, uygulama teması ise
 * <html> üzerindeki `dark` sınıfıyla sürüldüğü için burada Tailwind
 * varyantları kullanılır. Biri değişirse diğeri de güncellenmeli.
 */
export default function Logo({ className = 'size-6' }) {
  const ink = 'fill-slate-900 dark:fill-slate-100'
  const paper = 'fill-white dark:fill-slate-900'

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      {/* Çatı, gövde, kaide */}
      <path className={ink} d="M16 1.5 29 10.5 H3 Z" />
      <rect className={ink} x="6" y="10" width="20" height="19" />
      <rect className={ink} x="2" y="28.5" width="28" height="2.6" rx="1.1" />

      {/* Saat */}
      <circle className="fill-emerald-600 dark:fill-emerald-400" cx="16" cy="17" r="6.6" />
      <circle className={paper} cx="16" cy="17" r="5.2" />
      <path
        className="stroke-slate-900 dark:stroke-slate-100"
        d="M16 17 V13.2"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        className="stroke-slate-900 dark:stroke-slate-100"
        d="M16 17 H19.1"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle className={ink} cx="16" cy="17" r="0.9" />

      {/* Kapı ve pencereler */}
      <rect className={paper} x="14.2" y="24.6" width="3.6" height="4.4" rx="1.8" />
      <rect className={paper} x="8.4" y="24.8" width="2.6" height="2.6" rx="0.5" />
      <rect className={paper} x="21" y="24.8" width="2.6" height="2.6" rx="0.5" />
    </svg>
  )
}
