
import { buttonVariants, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { CheckCircle, MailCheck } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { ResendVerifyEmail } from "@/components/auth";
import { Link } from "@/i18n/navigation";
import { EmailVerification } from "./email-verification";
import { getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const t = await getTranslations("auth");
    const searchParams = await props.searchParams;
    const from = searchParams?.from;

    if (from === 'verified') {
        return {
            title: t("verifyEmail.verifiedTitle"),
            description: t("verifyEmail.verifiedDescription"),
        }
    }

    return {
        title: from === 'forgot-password' ? t("verifyEmail.checkTitle") : t("verifyEmail.title"),
        description: from === 'forgot-password'
            ? t("verifyEmail.resetSent")
            : t("verifyEmail.verificationSent"),
    }
}

type Props = {
    searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function VerifyEmailPage(props: Props) {
    const t = await getTranslations("auth");
    const searchParams = await props.searchParams;
    const from = searchParams?.from;
    const email = searchParams?.email;
    const token = searchParams?.token;

    if (token) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <EmailVerification token={token} />
            </div>
        );
    }

    // ยืนยันอีเมลสำเร็จ
    if (from === 'verified') {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Card className="w-full max-w-md border-none shadow-none">
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {t("verifyEmail.verifiedTitle")}
                        </CardTitle>
                        <CardDescription className="text-base">
                            {t("verifyEmail.verifiedAccountDescription")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Link
                            href="/login"
                            className={cn(buttonVariants({ variant: "default" }), "w-full rounded-full")}
                        >
                            {t("action.backToLogin")}
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="w-full max-w-md border-none shadow-none">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <MailCheck className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {from === 'forgot-password' ? t("verifyEmail.checkTitle") : t("verifyEmail.pleaseVerify")}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {from === 'forgot-password'
                            ? t("verifyEmail.resetSent")
                            : t("verifyEmail.verificationSent")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                    <Link
                        href="/login"
                        className={cn(buttonVariants({ variant: "default" }), "w-full rounded-full")}
                    >
                        {t("action.backToLogin")}
                    </Link>
                    {from !== 'forgot-password' && (
                        <ResendVerifyEmail email={email} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
