// سطر الإصدار — قاعدة المالك (2026-11-25): رقم الإصدار ووقت النشر ظاهرين بشكل أساسي
// داخل التطبيق وفي أول شاشة، مبنيين من بيانات البناء نفسه (مش مكتوبين يدوي).
export function versionLine(): string {
  const when = new Date(__BUILD_TIME__).toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `الإصدار ${__APP_VERSION__} — نُشر ${when}`
}

export default function VersionLine() {
  return <p className="version-line" dir="rtl">{versionLine()}</p>
}
