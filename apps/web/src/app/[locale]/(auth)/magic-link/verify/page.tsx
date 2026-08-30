import { MagicLinkVerify } from "./magic-link-verify";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    const t = await getTranslations("auth");
    return {
        title: t("magicLink.metadataTitle"),
        description: t("magicLink.metadataDescription"),
    };
}

type Props = {
    searchParams: Promise<{ token?: string }>;
};

export default async function MagicLinkVerifyPage(props: Props) {
    const { token } = await props.searchParams;
    return <MagicLinkVerify token={token} />;
}
