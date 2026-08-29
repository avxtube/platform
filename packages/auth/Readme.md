# 🛡️ @workspace/auth

แพ็กเกจจัดการระบบ Authentication ส่วนกลางของโปรเจกต์ สร้างขึ้นมาบนพื้นฐานของ **Better-Auth** และฐานข้อมูล **MongoDB** ถูกตั้งค่ามาเพื่อให้พร้อมสเกลระดับ Enterprise-grade, รองรับหลายเว็บในเครือข่าย (Subdomains), และทำงานคู่กับ Next.js App Router อย่างลื่นไหล

---

## ✨ ฟีเจอร์หลักที่ตั้งค่ามาให้แล้ว (Key Features)
1. **Plugins ครบจบ:** รองรับ Two-Factor Auth (2FA), เข้าสู่ระบบด้วย Magic Link, และป้องกันบอทด้วย Cloudflare Turnstile (Captcha)
2. **Security & Rate Limiting:** จำกัดจำนวนการขอ OTP และรหัสผ่านใหม่เพื่อกันสแปม, พร้อมระบบซ่อนข้อมูลอ่อนไหวอัตโนมัติ (Custom Session)
3. **Cross-Domain Cookies:** รองรับการล็อกอินครั้งเดียวแล้วใช้งานได้ทุกซับโดเมน (เช่น `panel.vdohide.org`, `www.vdohide.org`) ผ่านตัวแปร `NEXT_PUBLIC_COOKIE_DOMAIN`
4. **Event-Driven Architecture:** โค้ดส่วนหลักกับโค้ดส่งอีเมลแยกออกจากกันโดยเด็ดขาด ใช้วิธีการยิง Event ทริกเกอร์แทน (ทำให้แก้ไขง่าย ไม่รก)
5. **Database Hooks อัจฉริยะ:** ดึงข้อมูลประเทศ (Country), Provider (Google, GitHub, Email), และ IP Address ของผู้ใช้มาเก็บบันทึกแบบอัตโนมัติ

---

## 🚀 1. การเรียกใช้งานเบื้องต้น (Basic Usage)

### ► ดึงข้อมูลผู้ใช้งานบน Server Components
ระบบจัดการซ่อนรหัสผ่านและข้อมูลที่อ่อนไหวให้หมดแล้ว และมีการครอบ `cache()` ไว้ให้ ทำให้คุณเรียกกี่ครั้งในหนึ่งหน้าเว็บก็ไม่กินแรง Server

```tsx
import { getCurrentUser } from "@workspace/auth/server"

export default async function DashboardPage() {
    const user = await getCurrentUser();

    if (!user.userId) {
        return <div>กรุณาเข้าสู่ระบบ</div>
    }

    return <h1>สวัสดีคุณ {user.name} ({user.role})</h1>
}
```

### ► ดึงข้อมูลผู้ใช้งานบน Client Components
ใช้ออบเจ็กต์ `authClient` สำหรับทำหน้าที่ต่างๆ เช่น เข้าสู่ระบบ, สมัครสมาชิก, หรือดึง Session สดๆ จากหลังบ้าน

```tsx
"use client"
import { authClient } from "@workspace/auth/client"

export function SignInButton() {
    const handleLogin = async () => {
        await authClient.signIn.email({
            email: "user@example.com",
            password: "password123"
        });
    }

    // การเช็ค Session ฝั่ง Client
    const { data: session } = authClient.useSession();

    return <button onClick={handleLogin}>Log In</button>
}
```

---

## ⚡ 2. การจัดการ Event ข้ามระบบ (Event Handlers)
ระบบนี้ใช้ **Inversion of Control** เพื่อให้ Auth Core ไม่ต้องยุ่งกับการส่ง Email (เช่น ไม่ต้องพึ่งพา Resend ตรงๆ)
ระบบจะใช้วิธียิง Event แล้วปล่อยให้แอปตัวหลักของคุณเป็นคนจัดการว่า "จะส่งเมลมั้ย จะสร้างโปรไฟล์หรือเปล่า"

### วิธีลงทะเบียน Event
คุณสามารถสร้างไฟล์ `instrumentation.ts` หรือเอาไปวางในที่ที่ Server เริ่มต้นทำงาน:

```typescript
import { registerAuthEvents } from "@workspace/auth/handlers"

// ลงทะเบียนการกระทำต่างๆ ที่คุณอยากให้เกิดขึ้น
registerAuthEvents({
    // 1. เมื่อระบบสั่งส่งอีเมลยืนยันตัวตน
    onSendVerificationEmail: async ({ user, url }) => {
        await sendEmailViaResend({
            to: user.email,
            subject: "ยินดีต้อนรับ! ยืนยันอีเมลของคุณ",
            body: `<a href="${url}">คลิกยืนยัน</a>`
        });
    },

    // 2. เมื่อผู้ใช้สมัครสมาชิกและยืนยันอีเมลสำเร็จ (หรือมาจาก Social Login)
    onUserSignUpSuccess: async ({ user }) => {
        console.log("ยินดีต้อนรับผู้ใช้ใหม่:", user.name);
        // สามารถเขียนโค้ดเพื่อสร้าง Workspace เริ่มต้น หรือสร้างโฟลเดอร์ฟรีให้ผู้ใช้ตรงนี้ได้เลย
        await createDefaultSpaceForUser(user.id);
    },

    // 3. เมื่อระบบสั่งลบบัญชีผู้ใช้
    onUserDeleteSuccess: async ({ user }) => {
        // เช่น นำไปส่งอีเมลบอกลา หรือสั่งเคลียร์รูปภาพใน AWS S3 ทิ้ง
    }
});
```

---

## 🛠️ โครงสร้างไฟล์ในแพ็กเกจ
- `config.ts` : หัวใจหลัก ใช้ตั้งค่า Better-Auth, Plugins และ Database Hooks
- `handlers.ts` : โกดังเก็บ Event เปล่าๆ (`authEvents`) และฟังก์ชัน `registerAuthEvents` สำหรับ Override
- `server.ts` : ฟังก์ชันสำหรับเรียกใช้งานฝั่ง SSR (Server-Side)
- `client.ts` : ตัว `authClient` สำหรับฝั่ง Frontend
- `social-provider.ts` : แหล่งรวม Provider (Google, GitHub, ฯลฯ)
- `mongodb.ts` : Connection ไปยังฐานข้อมูล MongoDB
