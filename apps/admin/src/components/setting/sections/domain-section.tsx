"use client"

import * as React from "react"
import { Globe, ImageIcon, Link2, Loader2, Network, Save } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  domainSettingSchema,
  type DomainSettings,
} from "@workspace/core/validators"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@workspace/ui/components"

const domainFields = [
  {
    name: "domain_content",
    icon: Globe,
    placeholder: "cdn.example.com",
  },
  {
    name: "domain_static",
    icon: ImageIcon,
    placeholder: "static.example.com",
  },
  {
    name: "domain_playlist",
    icon: Network,
    placeholder: "playlist.example.com",
  },
] as const

export function DomainSection({ data }: { data: DomainSettings }) {
  const t = useTranslations("admin.settings")
  const [saved, setSaved] = React.useState(data)
  const [values, setValues] = React.useState(data)
  const [pending, setPending] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {}
  )
  const dirty = JSON.stringify(values) !== JSON.stringify(saved)

  function update(field: keyof DomainSettings, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: "" }))
    setMessage(null)
    setError(null)
  }

  function reset() {
    setValues(saved)
    setFieldErrors({})
    setError(null)
    setMessage(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    const parsed = domainSettingSchema.safeParse(values)
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "")
        errors[field] =
          field === "url_scraping" ? t("invalidEndpoint") : t("invalidOrigin")
      }
      setFieldErrors(errors)
      setError(t("invalidForm"))
      return
    }
    setPending(true)
    setFieldErrors({})
    try {
      const response = await fetch("/api/v1/admin/settings/domain", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      if (!response.ok)
        throw new Error(
          response.status === 401 || response.status === 403
            ? t("accessDenied")
            : t("saveFailed")
        )
      const body: unknown = await response.json()
      if (!body || typeof body !== "object" || !("settings" in body))
        throw new Error(t("saveFailed"))
      const result = domainSettingSchema.parse(body.settings)
      setSaved(result)
      setValues(result)
      setMessage(t("saved"))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("saveFailed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5"
      noValidate
      aria-label={t("domain.title")}
    >
      <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t("domain.notice")}
      </p>
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("domain.roles")}</CardTitle>
            <CardDescription>{t("domain.rolesHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            {domainFields.map(({ name, icon: Icon, placeholder }) => (
              <div
                key={name}
                className="grid min-w-0 gap-3 border-b py-4 first:pt-0 last:border-b-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <Label htmlFor={name}>{t(`fields.${name}.label`)}</Label>
                    <p
                      id={`${name}-help`}
                      className="mt-1 text-xs leading-relaxed text-muted-foreground"
                    >
                      {t(`fields.${name}.help`)}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Input
                    id={name}
                    type="text"
                    value={values[name]}
                    onChange={(event) => update(name, event.target.value)}
                    placeholder={placeholder}
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={2048}
                    aria-invalid={Boolean(fieldErrors[name])}
                    aria-describedby={`${name}-help ${name}-error`}
                  />
                  <p id={`${name}-error`} className="text-xs text-destructive">
                    {fieldErrors[name]}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="size-4" />
                {t("domain.scraping")}
              </CardTitle>
              <CardDescription>{t("fields.url_scraping.help")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="url_scraping">
                {t("fields.url_scraping.label")}
              </Label>
              <Input
                id="url_scraping"
                type="url"
                value={values.url_scraping}
                onChange={(event) => update("url_scraping", event.target.value)}
                placeholder="http://localhost:8081"
                maxLength={2048}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(fieldErrors.url_scraping)}
                aria-describedby="url_scraping-error"
              />
              <p id="url_scraping-error" className="text-xs text-destructive">
                {fieldErrors.url_scraping}
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardFooter className="flex-wrap justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {dirty ? t("unsaved") : t("noChanges")}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!dirty || pending}
                onClick={reset}
              >
                {t("reset")}
              </Button>
              <Button type="submit" disabled={!dirty || pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />}
                {t(pending ? "saving" : "save")}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </fieldset>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="rounded-lg border p-3 text-sm">
          {message}
        </p>
      ) : null}
    </form>
  )
}
