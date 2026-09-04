export const DEFAULT_AUTH_SETTING = {
    "captcha": {
        "enabled": false
    },
    "login": {
        "enabled": true,
        "email_password": true,
        "social": {
            "google": false,
            "github": false
        },
    },
    "register": {
        "enabled": true,
        "email_password": true,
        "social": {
            "google": false,
            "github": false
        },
        // แสดงบนหน้า register ตอนปิดรับสมัคร — ที่เดียวที่คนสนใจจะไปต่อได้
        // ว่างไว้ = ไม่แสดงอะไร (หน้าเดิมไม่เปลี่ยน)
        "closed_url": "",
        "closed_label": "Join our Telegram for updates",
    },
    "forgot_password": {
        "enabled": true
    },
    "reset_password": {
        "enabled": true
    }
}

export const DEFAULT_TOPUP_SETTING = {
    "enabled": true,
    "methods": {
        "paypal": {
            "enabled": true,
            "account": [
                {
                    "_id": "pay01",
                    "enabled": true,
                    "name": "Paypal",
                    "email": "[EMAIL_ADDRESS]",
                    "currencies": ["USD", "EUR", "THB"],
                    "is_primary": true
                }
            ]
        },
        "crypto": {
            "enabled": true,
            "account": [
                {
                    "_id": "cry01",
                    "enabled": true,
                    "address": "0x1234567890123456789012345678901234567890",
                    "network": "TRC20",
                    "name": "Tether",
                    "currencies": ["USD"],
                    "is_primary": true
                }
            ]
        },
        "bank_transfer": {
            "enabled": true,
            "accounts": [
                {
                    "_id": "bnk01",
                    "enabled": true,
                    "name": "vdohide",
                    "bank_name": "KBank",
                    "account_number": "1234567890",
                    "swift_code": "KASITHNBAN",
                    "currencies": ["THB"],
                    "is_primary": true
                },
            ]
        }
    },
    "min_amount": 100,
    "max_amount": 200000,
    "quick_amounts": ["1000", "2000", "5000", "10000"],
    "proof_required": true,
    "auto_confirm": false,
    "notification": {
        "email": {
            "enabled": true
        },
        "sms": {
            "enabled": false
        }
    },
    "currencies": [
        {
            "code": "THB",
            "name": "Thai Baht",
            "symbol": "฿",
            "onlyCountry": ["th"]
        },
        {
            "code": "USD",
            "name": "US Dollar",
            "symbol": "$"
        },
        {
            "code": "EUR",
            "name": "Euro",
            "symbol": "€"
        }
    ]
}

export const DEFAULT_CURRENCY_RATES = {
    "thb": 1,
    "cny": 0.20731,
    "eur": 0.02632,
    "gbp": 0.02275,
    "jpy": 4.8985,
    "usd": 0.03064
}

// ── General — ค่า flat รายตัว (ชื่อเดียวกับระบบเก่า เพื่อให้ข้อมูลใน DB เดิมใช้ต่อได้) ──
export const DEFAULT_GENERAL_SETTING = {
    "register": true,
    "upload": true,
    "download_enabled": true,
    "remote_enabled": true,
    "player_maintenance": false,
    "trash_day": 15,
    /** 0 = ใช้ค่า default ของระบบ (10GB) */
    "max_size_upload": 0,
}

// ── Domain — โดเมนย่อยสำหรับ embed/สตรีม (ชื่อเดียวกับระบบเก่า) ──
export const DEFAULT_DOMAIN_SETTING = {
    "domain_content": "",
    "domain_static": "",
    "domain_playlist": "",
    "url_scraping": "",
}

// ── Domain profiles — โปรไฟล์ Cloudflare (เก็บเฉพาะ credentials — zone/token ต่อโปรไฟล์) ──
export const DEFAULT_DOMAIN_PROFILES = [] as {
    _id: string;
    name: string;
    zone_id?: string;
    api_token?: string;
    note?: string;
    last_purge_at?: string;
}[];

// ── Domain bindings — ผูกแต่ละ role เข้ากับ profile _id (null = ไม่ใช้ Cloudflare) ──
export const DEFAULT_DOMAIN_BINDINGS = {
    "content": null,
    "static": null,
    "preview": null,
    "playlist": null,
    "scraping": null,
    "sub": null,
} as {
    content: string | null;
    static: string | null;
    preview: string | null;
    playlist: string | null;
    scraping: string | null;
    sub: string | null;
};

// ── Firebase (realtime push) ──
export const DEFAULT_FIREBASE_SETTING = {
    "enabled": false,
    "api_key": "",
    "auth_domain": "",
    "database_url": "",
    "project_id": "",
    "storage_bucket": "",
    "messaging_sender_id": "",
    "app_id": "",
    "measurement_id": "",
    "database_secret": "",
}

export const DEFAULT_DOMAIN_SUB = []
