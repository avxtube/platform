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

/**
 * Accept an internal path or an absolute HTTP(S) URL owned by the configured
 * cookie domain. This supports SSO redirects between trusted subdomains while
 * continuing to reject arbitrary external URLs.
 */
export function safeRedirectUrl(
    url: string | null | undefined,
    allowedDomain: string | null | undefined,
): string | null {
    const internalPath = safeRedirectPath(url);
    if (internalPath) return internalPath;
    if (!url || !allowedDomain) return null;

    const domain = allowedDomain.trim().replace(/^\./, "").toLowerCase();
    if (!domain) return null;

    try {
        const target = new URL(url);
        const isHttp = target.protocol === "http:" || target.protocol === "https:";
        const isOwnedHost = target.hostname === domain || target.hostname.endsWith(`.${domain}`);
        if (!isHttp || !isOwnedHost || target.username || target.password) return null;
        return target.toString();
    } catch {
        return null;
    }
}

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** Normalize a username to lowercase ASCII letters and digits only. */
export function normalizeUsername(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, USERNAME_MAX_LENGTH);
}

/** Build a valid username base from the local part of an email address. */
export function usernameFromEmail(email: string): string {
    const localPart = email.split("@", 1)[0] ?? "";
    const normalized = normalizeUsername(localPart);

    if (normalized.length >= USERNAME_MIN_LENGTH) return normalized;

    return `${normalized}user`.slice(0, USERNAME_MAX_LENGTH);
}
