
import { buttonVariants, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { AlertTriangle, ShieldX, UserX, Ban } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { safeRedirectUrl } from "@workspace/core/utils";
import { getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

const errorConfig: Record<string, {
    icon: typeof AlertTriangle;
    titleKey: string;
    descKey: string;
}> = {
    account_not_linked: {
        icon: UserX,
        titleKey: "error.accountNotLinkedTitle",
        descKey: "error.accountNotLinkedDescription",
    },
    signup_disabled: {
        icon: Ban,
        titleKey: "error.signupDisabledTitle",
        descKey: "error.signupDisabledDescription",
    },
    access_denied: {
        icon: ShieldX,
        titleKey: "error.accessDeniedTitle",
        descKey: "error.accessDeniedDescription",
    },
};

const defaultError = {
    icon: AlertTriangle,
    titleKey: "error.title",
    descKey: "error.description",
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const t = await getTranslations("auth");
    const params = await searchParams;
    const config = errorConfig[params.error || ""] || defaultError;

    return {
        title: t(config.titleKey),
    }
}

export default async function ErrorPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
    const t = await getTranslations("auth");
    const params = await searchParams;
    const errorCode = params.error || "";
    const callbackUrl = safeRedirectUrl(params.callbackUrl, process.env.NEXT_PUBLIC_COOKIE_DOMAIN) || "/login";
    const config = errorConfig[errorCode] || defaultError;
    const Icon = config.icon;

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="w-full max-w-md border-none shadow-none">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <Icon className="h-8 w-8 text-destructive" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {t(config.titleKey)}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {t(config.descKey)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Link
                        href={callbackUrl}
                        className={cn(buttonVariants({ variant: "default" }), "w-full rounded-full")}
                    >
                        {t("action.backToLogin")}
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
