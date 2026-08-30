import {
    buttonVariants,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@workspace/ui/components";
import React from "react";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { AuthFallback, SetPasswordForm } from "@/components/auth";
import { getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
    const t = await getTranslations("auth");
    return {
        title: t("setPassword.title"),
    }
}

export default async function SetPasswordPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const t = await getTranslations("auth");
    const searchParams = await props.searchParams;
    const token = searchParams?.token;

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Card className="w-full max-w-md border-none shadow-none">
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <X className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {t("setPassword.invalidTitle")}
                        </CardTitle>
                        <CardDescription className="text-base">
                            {t("setPassword.invalidDescription")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Link
                            href="/forgot-password"
                            className={cn(buttonVariants({ variant: "default" }), "w-full rounded-full")}
                        >
                            {t("setPassword.back")}
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <Card className="lg:border-0">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">{t("setPassword.title")}</CardTitle>
                    <CardDescription>{t("setPassword.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <React.Suspense fallback={<AuthFallback />}>
                        <SetPasswordForm token={token} />
                    </React.Suspense>
                </CardContent>
            </Card>
        </>
    )
}
