"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, buttonVariants } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";

type Status = "verifying" | "success" | "error";

// หน้ารอ + ยิง verify เอง — ไม่ส่ง callbackURL เพื่อให้ better-auth ตอบ JSON + set cookie
// (ถ้าส่ง callbackURL มันจะ 302 redirect แทน)
export function MagicLinkVerify({ token }: { token?: string }) {
    const t = useTranslations("auth");
    const [status, setStatus] = React.useState<Status>(token ? "verifying" : "error");

    React.useEffect(() => {
        if (!token) return;
        let active = true;

        (async () => {
            try {
                const res = await fetch(`/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`, {
                    credentials: "include",
                    // สำเร็จ = 200 JSON (set cookie); error = 302 → opaqueredirect (ok=false)
                    redirect: "manual",
                });
                if (!active) return;

                if (res.ok) {
                    setStatus("success");
                    // ให้ cookie ลงตัวก่อนแล้วพาไป dashboard
                    setTimeout(() => { window.location.href = "/dashboard"; }, 800);
                } else {
                    setStatus("error");
                }
            } catch {
                if (active) setStatus("error");
            }
        })();

        return () => { active = false; };
    }, [token]);

    if (status === "verifying") {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">{t("magicLink.verifyingTitle")}</CardTitle>
                    <CardDescription className="text-base">
                        {t("magicLink.verifyingDescription")}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (status === "success") {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                            <ShieldCheck className="h-8 w-8 text-green-500" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">{t("magicLink.successTitle")}</CardTitle>
                    <CardDescription className="text-base">
                        {t("magicLink.successDescription")}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // error
    return (
        <Card className="border-none shadow-lg">
            <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <ShieldX className="h-8 w-8 text-destructive" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">{t("magicLink.invalidTitle")}</CardTitle>
                <CardDescription className="text-base">
                    {t("magicLink.invalidDescription")}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Link href="/login" className={cn(buttonVariants({ variant: "default" }), "w-full rounded-full")}>
                    {t("action.backToLogin")}
                </Link>
            </CardContent>
        </Card>
    );
}
