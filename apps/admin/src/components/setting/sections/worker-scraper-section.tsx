"use client"

import * as React from "react"
import { Languages, Loader2, Power, Save } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  MISSAV_SCRAPER_LOCALES,
  workerScraperSettingSchema,
  type WorkerScraperSettings,
} from "@workspace/core/validators"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Switch,
} from "@workspace/ui/components"

const localeNames: Record<string, string> = {
  th: "ไทย",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  tl: "Filipino",
  de: "Deutsch",
  fr: "Français",
  pt: "Português",
}

export function WorkerScraperSection({
  data,
}: {
  data: WorkerScraperSettings
}) {
  const t = useTranslations("admin.settings")
  const [saved, setSaved] = React.useState(data)
  const [values, setValues] = React.useState(data)
  const [pending, setPending] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const dirty = JSON.stringify(values) !== JSON.stringify(saved)

  function toggleLocale(
    locale: (typeof MISSAV_SCRAPER_LOCALES)[number],
    checked: boolean
  ) {
    setValues((current) => ({
      ...current,
      missav: {
        locales: checked
          ? [...new Set([...current.missav.locales, locale])]
          : current.missav.locales.filter((item) => item !== locale),
      },
    }))
    setMessage(null)
    setError(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = workerScraperSettingSchema.safeParse(values)
    if (!parsed.success) {
      setError(t("invalidForm"))
      return
    }
    setPending(true)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch("/api/v1/admin/settings/worker-scraper", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      if (!response.ok) throw new Error(t("saveFailed"))
      const body = (await response.json()) as { settings?: unknown }
      const result = workerScraperSettingSchema.parse(body.settings)
      setSaved(result)
      setValues(result)
      setMessage(t("workerScraper.saved"))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("saveFailed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={pending} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="size-4" />
              {t("workerScraper.status")}
            </CardTitle>
            <CardDescription>{t("workerScraper.statusHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="worker-scraper-enabled">
              {t("workerScraper.enabled")}
            </Label>
            <Switch
              id="worker-scraper-enabled"
              checked={values.enabled}
              onCheckedChange={(enabled) =>
                setValues((current) => ({ ...current, enabled }))
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="size-4" />
              {t("workerScraper.missavLocales")}
            </CardTitle>
            <CardDescription>
              {t("workerScraper.missavLocalesHelp")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MISSAV_SCRAPER_LOCALES.map((locale) => (
              <Label
                key={locale}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal"
              >
                <Checkbox
                  checked={values.missav.locales.includes(locale)}
                  onCheckedChange={(checked) =>
                    toggleLocale(locale, checked === true)
                  }
                />
                <span>
                  {localeNames[locale]}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({locale})
                  </span>
                </span>
              </Label>
            ))}
          </CardContent>
        </Card>
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
                onClick={() => {
                  setValues(saved)
                  setError(null)
                  setMessage(null)
                }}
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
