/**
 * กัน open redirect — ยอมรับเฉพาะ path ภายในเว็บ ("/...")
 * ปัด absolute URL (https://evil.com) และ protocol-relative ("//evil.com") ทิ้ง
 *
 * ใช้ตรวจสอบค่า callbackUrl ทั้งฝั่ง server (proxy/middleware) และฝั่ง client
 * (auth form components) ก่อนนำไปใช้ redirect หรือเก็บลง cookie
 */
export function safeRedirectPath(url: string | null | undefined): string | null {
    if (!url) return null;
    if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return null;
    return url;
}
