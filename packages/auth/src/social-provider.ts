
interface SocialProviderConfig {
    [key: string]: unknown;
    clientId: string;
    clientSecret: string;
    redirectURI?: string;
    disableImplicitSignUp?: boolean;
}

const hasGithubCredentials =
    (process.env.GITHUB_CLIENT_ID?.length ?? 0) > 0 &&
    (process.env.GITHUB_CLIENT_SECRET?.length ?? 0) > 0;

const hasGoogleCredentials =
    (process.env.GOOGLE_CLIENT_ID?.length ?? 0) > 0 &&
    (process.env.GOOGLE_CLIENT_SECRET?.length ?? 0) > 0;

const socialProviders: Record<string, SocialProviderConfig> = {};


if (hasGithubCredentials) {
    socialProviders.github = {
        clientId: process.env.GITHUB_CLIENT_ID ?? "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        disableImplicitSignUp: true,
    };
}

if (hasGoogleCredentials) {
    socialProviders.google = {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        disableImplicitSignUp: true,
    };
}

export { socialProviders, hasGoogleCredentials, hasGithubCredentials, type SocialProviderConfig }