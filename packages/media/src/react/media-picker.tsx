"use client"

import * as React from "react"
import {
  Check,
  Crop as CropIcon,
  ImagePlus,
  Link2,
  LoaderCircle,
  RotateCcw,
  Upload,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components"

import {
  getMediaRule,
  mediaAccept,
  type MediaPurpose,
  type MediaUploadResult,
} from "../types"

export type MediaPickerLabels = Partial<{
  title: string
  description: string
  upload: string
  url: string
  choose: string
  drop: string
  import: string
  crop: string
  cancel: string
  apply: string
  remove: string
  skipCrop: string
  preserveAspectRatio: string
  preparing: string
}>

export type MediaCropShape = "auto" | "circle" | "rectangle"

const mediaCanvasBackground = {
  backgroundColor: "var(--muted)",
  backgroundImage:
    "radial-gradient(circle, color-mix(in oklab, var(--muted-foreground) 38%, transparent) 1px, transparent 1px)",
  backgroundPosition: "0 0",
  backgroundSize: "16px 16px",
} satisfies React.CSSProperties

export type MediaCropState = {
  zoom: number
  focalX: number
  focalY: number
  crop?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export type PendingMediaSelection = {
  token: string
  purpose: MediaPurpose
  kind: "image" | "video"
  previewUrl: string
  storageId?: string
  file?: File
  originalFile?: File
  sourceUrl?: string
  fallbackUrl?: string
  referrerUrl?: string
  imageMode?: "crop" | "fit"
  cropState?: MediaCropState
}

export function isPendingMediaToken(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("pending-media:")
}

export async function commitPendingMedia(
  selection: PendingMediaSelection,
  options: { keySlug?: string } = {}
) {
  const response = usesVdoHideImport(selection.purpose)
    ? await importPendingVdoHide(selection)
    : selection.file
      ? await uploadPendingFile(selection, options.keySlug)
      : await importPendingUrl(selection, options.keySlug)
  const body = (await response.json().catch(() => null)) as {
    media?: MediaUploadResult
    message?: string
    error?: string
  } | null
  if (!response.ok || !body?.media)
    throw new Error(body?.message ?? body?.error ?? "Media upload failed")
  return body.media
}

export function preparePendingVideoImport({
  sourceUrl,
  previewUrl = sourceUrl,
  purpose = "video",
}: {
  sourceUrl: string
  previewUrl?: string
  purpose?: "video" | "short"
}) {
  return {
    token: `pending-media:${createPendingId()}`,
    purpose,
    kind: "video",
    previewUrl,
    sourceUrl,
    fallbackUrl: previewUrl,
  } satisfies PendingMediaSelection
}

export async function preparePendingImageFromUrl({
  sourceUrl,
  purpose,
  referrerUrl,
  storageId = "",
}: {
  sourceUrl: string
  purpose: MediaPurpose
  referrerUrl?: string
  storageId?: string
}) {
  if (getMediaRule(purpose).kind !== "image")
    throw new Error(`${purpose} is not an image purpose`)
  const file = await prepareRemoteImage(sourceUrl, purpose, referrerUrl)
  return createPendingFile(file, purpose, storageId, "fit", sourceUrl, file)
}

export async function preparePendingVideoFromUrl({
  sourceUrl,
  purpose = "trailer",
  referrerUrl,
}: {
  sourceUrl: string
  purpose?: "trailer"
  referrerUrl?: string
}) {
  const file = await prepareRemoteMedia(sourceUrl, purpose, referrerUrl)
  return createPendingFile(file, purpose, "", undefined, sourceUrl, file)
}

export function MediaPicker({
  purpose,
  value,
  onChange,
  disabled,
  labels,
  className,
  crop: cropEnabled = true,
  cropShape = "auto",
  referrerUrl,
  selection,
}: {
  purpose: MediaPurpose
  value?: string
  onChange: (result: PendingMediaSelection | null) => void
  disabled?: boolean
  labels?: MediaPickerLabels
  className?: string
  crop?: boolean
  cropShape?: MediaCropShape
  referrerUrl?: string
  selection?: PendingMediaSelection
}) {
  const rule = getMediaRule(purpose)
  const copy = {
    title: "Media",
    description: "Prepare a file or URL. Upload starts when the form is saved.",
    upload: "Upload",
    url: "URL",
    choose: "Choose file",
    drop: "or drag and drop here",
    import: "Use this URL",
    crop: "Crop image",
    cancel: "Cancel",
    apply: "Apply",
    remove: "Remove",
    skipCrop: "Use without cropping",
    preserveAspectRatio: "Preserve image aspect ratio",
    preparing: "Preparing image…",
    ...labels,
  }
  const [open, setOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [preparing, setPreparing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [url, setUrl] = React.useState("")
  const [imageMode, setImageMode] = React.useState<"crop" | "fit">(
    cropEnabled ? "crop" : "fit"
  )
  const [cropSource, setCropSource] = React.useState<{
    file: File
    url: string
    sourceUrl?: string
    initialState?: MediaCropState
    editing?: boolean
  } | null>(null)

  React.useEffect(
    () => () => {
      if (cropSource) URL.revokeObjectURL(cropSource.url)
    },
    [cropSource]
  )

  function selectFile(file?: File) {
    if (!file) return
    if (!rule.accept.includes(file.type.toLowerCase()))
      return setError(`Unsupported file type: ${file.type || file.name}`)
    if (file.size > rule.maxBytes)
      return setError(`File is larger than ${formatBytes(rule.maxBytes)}`)
    if (rule.kind === "image") {
      if (cropEnabled) {
        setOpen(false)
        setCropSource({ file, url: URL.createObjectURL(file) })
      } else {
        onChange(createPendingFile(file, purpose, "", "fit", undefined, file))
        setOpen(false)
      }
    } else {
      onChange(createPendingFile(file, purpose, ""))
      setOpen(false)
    }
  }

  async function importUrl() {
    setError(null)
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        throw new Error("Only HTTP(S) URLs are allowed")

      if (rule.kind === "image") {
        setPreparing(true)
        const file = await prepareRemoteImage(
          parsed.toString(),
          purpose,
          referrerUrl
        )
        setUrl("")
        setOpen(false)
        if (cropEnabled && imageMode === "crop") {
          setCropSource({
            file,
            url: URL.createObjectURL(file),
            sourceUrl: parsed.toString(),
          })
        } else {
          onChange(
            createPendingFile(file, purpose, "", "fit", parsed.toString(), file)
          )
        }
        return
      }

      if (purpose === "trailer") {
        setPreparing(true)
        const file = await prepareRemoteMedia(
          parsed.toString(),
          purpose,
          referrerUrl
        )
        onChange(
          createPendingFile(
            file,
            purpose,
            "",
            undefined,
            parsed.toString(),
            file
          )
        )
        setUrl("")
        setOpen(false)
        return
      }

      onChange(createPendingUrl(parsed.toString(), purpose, ""))
      setUrl("")
      setOpen(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "URL is invalid")
    } finally {
      setPreparing(false)
    }
  }

  const resolvedCropShape =
    cropShape === "auto"
      ? purpose === "avatar" && rule.aspectRatio === 1
        ? "circle"
        : "rectangle"
      : cropShape
  const vdoHideImportOnly = usesVdoHideImport(purpose)

  return (
    <div className={className}>
      {value ? (
        <div
          className="group @container relative overflow-hidden rounded-lg border bg-muted/30"
          style={{ position: "relative", maxWidth: "100%", overflow: "hidden" }}
        >
          {rule.kind === "image" ? (
            <img
              src={value}
              alt="Media preview"
              className="max-h-80 w-full cursor-zoom-in object-contain"
              style={{
                display: "block",
                width: "100%",
                maxWidth: "100%",
                maxHeight: "20rem",
                aspectRatio: `${rule.width ?? 16}/${rule.height ?? 9}`,
                objectFit: "contain",
              }}
              onClick={() => setPreviewOpen(true)}
            />
          ) : (
            <video
              src={value}
              controls
              preload="metadata"
              className="aspect-video w-full bg-black object-contain"
              style={{
                display: "block",
                width: "100%",
                maxWidth: "100%",
                aspectRatio: "16 / 9",
                objectFit: "contain",
                background: "black",
              }}
            />
          )}
          <div
            className="absolute inset-x-0 top-0 flex justify-end gap-1 bg-gradient-to-b from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              left: 0,
              zIndex: 2,
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.25rem",
              padding: "0.5rem",
            }}
          >
            {rule.kind === "image" && cropEnabled && selection?.originalFile ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const file = selection.originalFile!
                  setCropSource({
                    file,
                    url: URL.createObjectURL(file),
                    sourceUrl: selection.sourceUrl,
                    initialState: selection.cropState,
                    editing: true,
                  })
                }}
                disabled={disabled}
                aria-label={copy.crop}
                title={copy.crop}
              >
                <CropIcon />
                <span className="hidden @[22rem]:inline">{copy.crop}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(true)}
              disabled={disabled}
              aria-label={copy.choose}
              title={copy.choose}
            >
              <Upload />
              <span className="hidden @[22rem]:inline">{copy.choose}</span>
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              onClick={() => onChange(null)}
              disabled={disabled}
              aria-label={copy.remove}
              title={copy.remove}
            >
              <X />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/20 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
        >
          {rule.kind === "image" ? (
            <ImagePlus className="size-8" />
          ) : (
            <Video className="size-8" />
          )}
          <span>{copy.choose}</span>
        </button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          setError(null)
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <Tabs defaultValue={vdoHideImportOnly ? "url" : "upload"}>
            <TabsList
              className={`grid w-full ${vdoHideImportOnly ? "grid-cols-1" : "grid-cols-2"}`}
            >
              {!vdoHideImportOnly ? (
                <TabsTrigger value="upload">
                  <Upload />
                  {copy.upload}
                </TabsTrigger>
              ) : null}
              <TabsTrigger value="url">
                <Link2 />
                {copy.url}
              </TabsTrigger>
            </TabsList>
            {!vdoHideImportOnly ? (
              <TabsContent value="upload" className="pt-3">
                <label
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    selectFile(event.dataTransfer.files?.[0])
                  }}
                  className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 text-muted-foreground hover:border-primary/50"
                >
                  {rule.kind === "image" ? (
                    <ImagePlus className="size-10" />
                  ) : (
                    <Video className="size-10" />
                  )}
                  <span className="font-medium">{copy.choose}</span>
                  <span className="text-xs">
                    {copy.drop} · {formatBytes(rule.maxBytes)}
                  </span>
                  <input
                    type="file"
                    accept={mediaAccept(purpose)}
                    className="hidden"
                    onChange={(event) => {
                      selectFile(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                </label>
              </TabsContent>
            ) : null}
            <TabsContent value="url" className="space-y-4 pt-3">
              <Input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/media"
              />
              {rule.kind === "image" && cropEnabled ? (
                <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={imageMode === "fit"}
                    onChange={(event) =>
                      setImageMode(event.target.checked ? "fit" : "crop")
                    }
                    className="size-4"
                  />
                  <span>{copy.preserveAspectRatio}</span>
                </label>
              ) : null}
              <Button
                type="button"
                className="w-full"
                disabled={!url.trim() || preparing}
                onClick={() => void importUrl()}
              >
                {preparing ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Link2 />
                )}
                {preparing ? copy.preparing : copy.import}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {cropSource ? (
        <CropDialog
          source={cropSource}
          purpose={purpose}
          shape={resolvedCropShape}
          labels={copy}
          onCancel={() => {
            const wasEditing = cropSource.editing
            setCropSource(null)
            if (!wasEditing) setOpen(true)
          }}
          onSkip={() => {
            const file = cropSource.file
            setCropSource(null)
            onChange(
              createPendingFile(
                file,
                purpose,
                "",
                "fit",
                cropSource.sourceUrl,
                file
              )
            )
          }}
          onComplete={(file, cropState) => {
            const originalFile = cropSource.file
            setCropSource(null)
            onChange(
              createPendingFile(
                file,
                purpose,
                "",
                "crop",
                cropSource.sourceUrl,
                originalFile,
                cropState
              )
            )
          }}
        />
      ) : null}

      {rule.kind === "image" && value ? (
        <ImagePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          src={value}
        />
      ) : null}
    </div>
  )
}

function CropDialog({
  source,
  purpose,
  shape,
  labels,
  onCancel,
  onSkip,
  onComplete,
}: {
  source: {
    file: File
    url: string
    sourceUrl?: string
    initialState?: MediaCropState
    editing?: boolean
  }
  purpose: MediaPurpose
  shape: Exclude<MediaCropShape, "auto">
  labels: Required<MediaPickerLabels>
  onCancel: () => void
  onSkip: () => void
  onComplete: (file: File, cropState: MediaCropState) => void
}) {
  const rule = getMediaRule(purpose)
  const imageRef = React.useRef<HTMLImageElement>(null)
  const cropViewportRef = React.useRef<HTMLDivElement>(null)
  const naturalSizeRef = React.useRef<{ width: number; height: number } | null>(
    null
  )
  const [working, setWorking] = React.useState(false)
  const [zoom, setZoom] = React.useState(source.initialState?.zoom ?? 1)
  const [naturalSize, setNaturalSize] = React.useState<{
    width: number
    height: number
  }>()
  const [stageSize, setStageSize] = React.useState({ width: 1, height: 1 })
  const [crop, setCrop] = React.useState<Crop | undefined>(() =>
    source.initialState?.crop
      ? { unit: "%", ...source.initialState.crop }
      : undefined
  )
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [dragging, setDragging] = React.useState(false)
  const dragStartRef = React.useRef<{
    clientX: number
    clientY: number
    panX: number
    panY: number
  } | null>(null)

  React.useEffect(() => {
    function resizePreview() {
      if (!naturalSizeRef.current) return
      const nextStage = fitCropPreviewSize(
        naturalSizeRef.current.width,
        naturalSizeRef.current.height,
        window.innerWidth,
        window.innerHeight
      )
      setStageSize(nextStage)
      setPan((current) => constrainImagePan(current, nextStage, zoom, crop))
    }
    window.addEventListener("resize", resizePreview)
    return () => window.removeEventListener("resize", resizePreview)
  }, [crop, zoom])

  function initialize(event: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget
    naturalSizeRef.current = { width: naturalWidth, height: naturalHeight }
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
    const nextStage = fitCropPreviewSize(
      naturalWidth,
      naturalHeight,
      window.innerWidth,
      window.innerHeight
    )
    setStageSize(nextStage)
    if (source.initialState) {
      const nextMetrics = getImageMetrics(nextStage, source.initialState.zoom, {
        x: 0,
        y: 0,
      })
      setPan(
        constrainImagePan(
          {
            x: (0.5 - source.initialState.focalX) * nextMetrics.renderedWidth,
            y: (0.5 - source.initialState.focalY) * nextMetrics.renderedHeight,
          },
          nextStage,
          source.initialState.zoom,
          source.initialState.crop
            ? { unit: "%", ...source.initialState.crop }
            : undefined
        )
      )
    } else {
      setPan({ x: 0, y: 0 })
    }
  }

  const metrics = naturalSize ? getImageMetrics(stageSize, zoom, pan) : null

  async function apply() {
    if (!imageRef.current || !metrics || !crop) return
    setWorking(true)
    try {
      const stageCrop = cropToStagePixels(crop, stageSize)
      const completedCrop = {
        unit: "px",
        x: stageCrop.x - metrics.left,
        y: stageCrop.y - metrics.top,
        width: stageCrop.width,
        height: stageCrop.height,
      } satisfies PixelCrop
      const blob = await cropToWebp(
        imageRef.current,
        completedCrop,
        rule.width ?? 1920,
        rule.height ?? 1080,
        (rule.quality ?? 88) / 100
      )
      onComplete(
        new File([blob], replaceExtension(source.file.name, "webp"), {
          type: "image/webp",
        }),
        {
          zoom,
          focalX: clamp(0.5 - pan.x / metrics.renderedWidth, 0, 1),
          focalY: clamp(0.5 - pan.y / metrics.renderedHeight, 0, 1),
          crop: cropToPercent(crop, stageSize),
        }
      )
    } finally {
      setWorking(false)
    }
  }

  const changeZoom = React.useCallback(
    (value: number) => {
      const nextZoom = Math.min(3, Math.max(1, value))
      const oldMetrics = getImageMetrics(stageSize, zoom, pan)
      const anchor = crop
        ? cropCenter(cropToStagePixels(crop, stageSize))
        : { x: stageSize.width / 2, y: stageSize.height / 2 }
      const imagePoint = {
        x: (anchor.x - oldMetrics.left) / oldMetrics.renderedWidth,
        y: (anchor.y - oldMetrics.top) / oldMetrics.renderedHeight,
      }
      const nextMetrics = getImageMetrics(stageSize, nextZoom, { x: 0, y: 0 })
      const nextPan = {
        x:
          anchor.x -
          imagePoint.x * nextMetrics.renderedWidth -
          (stageSize.width - nextMetrics.renderedWidth) / 2,
        y:
          anchor.y -
          imagePoint.y * nextMetrics.renderedHeight -
          (stageSize.height - nextMetrics.renderedHeight) / 2,
      }
      setZoom(nextZoom)
      setPan(constrainImagePan(nextPan, stageSize, nextZoom, crop))
    },
    [crop, pan, stageSize, zoom]
  )

  function startImageDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (working || !crop) return
    const target = event.target as Element
    if (target.closest(".ReactCrop__crop-selection")) return
    event.preventDefault()
    event.stopPropagation()
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveImage(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current
    if (!start) return
    event.preventDefault()
    event.stopPropagation()
    setPan(
      constrainImagePan(
        {
          x: start.panX + event.clientX - start.clientX,
          y: start.panY + event.clientY - start.clientY,
        },
        stageSize,
        zoom,
        crop
      )
    )
  }

  function stopDragging(event: React.PointerEvent<HTMLDivElement>) {
    dragStartRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }

  React.useEffect(() => {
    const viewport = cropViewportRef.current
    if (!viewport) return
    function zoomWithWheel(event: WheelEvent) {
      if (working || !naturalSize) return
      event.preventDefault()
      event.stopPropagation()
      changeZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1))
    }
    viewport.addEventListener("wheel", zoomWithWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", zoomWithWheel)
  }, [changeZoom, naturalSize, working, zoom])

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !working) onCancel()
      }}
    >
      <DialogContent
        className="grid h-[calc(100dvh-2rem)] max-h-[56rem] grid-rows-[auto_minmax(0,1fr)_auto_auto] overflow-hidden p-3 sm:max-w-5xl"
        style={{
          display: "grid",
          width: "min(64rem, calc(100vw - 2rem))",
          height: "min(56rem, calc(100dvh - 2rem))",
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: "calc(100dvh - 2rem)",
          gridTemplateRows: "auto minmax(0, 1fr) auto auto",
          overflow: "hidden",
          padding: "0.75rem",
        }}
      >
        <DialogHeader>
          <DialogTitle>{labels.crop}</DialogTitle>
          <DialogDescription>
            {rule.width} × {rule.height}px · WebP · ลากเพื่อสร้างกรอบก่อน
            จากนั้นลากในกรอบเพื่อย้ายกรอบ ลากนอกรอบเพื่อเลื่อนรูป
            และใช้ล้อเมาส์เพื่อซูม
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-muted p-2"
          style={{
            ...mediaCanvasBackground,
            display: "flex",
            minWidth: 0,
            minHeight: 0,
            maxWidth: "100%",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: "0.5rem",
          }}
        >
          <div
            ref={cropViewportRef}
            style={{
              position: "relative",
              flex: "0 0 auto",
              width: stageSize.width,
              height: stageSize.height,
              maxWidth: "none",
              maxHeight: "none",
              overflow: "hidden",
              cursor: crop ? (dragging ? "grabbing" : "grab") : "crosshair",
              touchAction: "none",
              userSelect: "none",
              ...mediaCanvasBackground,
            }}
            onPointerDownCapture={startImageDrag}
            onPointerMoveCapture={moveImage}
            onPointerUpCapture={stopDragging}
            onPointerCancelCapture={stopDragging}
          >
            <ReactCrop
              crop={crop}
              onChange={(_pixelCrop, percentCrop) => {
                setCrop(percentCrop)
                setPan((current) =>
                  constrainImagePan(current, stageSize, zoom, percentCrop)
                )
              }}
              aspect={rule.aspectRatio}
              circularCrop={shape === "circle"}
              disabled={working}
              keepSelection
              className="touch-none overflow-hidden border border-foreground/20 bg-muted shadow-inner select-none"
              style={{
                ...mediaCanvasBackground,
                position: "relative",
                width: stageSize.width,
                height: stageSize.height,
                maxWidth: "none",
                maxHeight: "none",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: stageSize.width,
                  height: stageSize.height,
                  maxWidth: "none",
                  maxHeight: "none",
                  overflow: "hidden",
                }}
              >
                <img
                  ref={imageRef}
                  src={source.url}
                  alt="Crop preview"
                  draggable={false}
                  onLoad={initialize}
                  className="pointer-events-none absolute top-1/2 left-1/2 max-h-none max-w-none select-none"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: metrics?.renderedWidth ?? 1,
                    height: metrics?.renderedHeight ?? 1,
                    maxWidth: "none",
                    maxHeight: "none",
                    pointerEvents: "none",
                    userSelect: "none",
                    transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
                  }}
                />
              </div>
            </ReactCrop>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => changeZoom(zoom - 0.25)}
            disabled={zoom <= 1 || working}
            aria-label="Zoom out"
          >
            <ZoomOut />
          </Button>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            disabled={working}
            aria-label="Crop image zoom"
            className="min-w-0 flex-1 accent-primary"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setCrop(undefined)
              setPan({ x: 0, y: 0 })
              setZoom(1)
            }}
            disabled={working}
          >
            <RotateCcw />
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => changeZoom(zoom + 0.25)}
            disabled={zoom >= 3 || working}
            aria-label="Zoom in"
          >
            <ZoomIn />
          </Button>
        </div>
        <DialogFooter className="flex-wrap">
          <Button
            type="button"
            variant="secondary"
            onClick={onSkip}
            disabled={working}
          >
            {labels.skipCrop}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={working}
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => void apply()}
            disabled={!metrics || !crop || working}
          >
            {working ? <LoaderCircle className="animate-spin" /> : <Check />}
            {labels.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function fitCropPreviewSize(
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number
) {
  const maxWidth = Math.max(1, Math.min(960, viewportWidth - 80))
  const maxHeight = Math.max(1, Math.min(700, viewportHeight - 280))
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1)
  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  }
}

function getImageMetrics(
  stageSize: { width: number; height: number },
  zoom: number,
  pan: { x: number; y: number }
) {
  const renderedWidth = stageSize.width * zoom
  const renderedHeight = stageSize.height * zoom
  return {
    renderedWidth,
    renderedHeight,
    left: (stageSize.width - renderedWidth) / 2 + pan.x,
    top: (stageSize.height - renderedHeight) / 2 + pan.y,
  }
}

function constrainImagePan(
  pan: { x: number; y: number },
  stageSize: { width: number; height: number },
  zoom: number,
  crop?: Crop
) {
  const renderedWidth = stageSize.width * zoom
  const renderedHeight = stageSize.height * zoom
  const cropPixels = crop
    ? cropToStagePixels(crop, stageSize)
    : { x: 0, y: 0, width: stageSize.width, height: stageSize.height }
  const minX =
    cropPixels.x + cropPixels.width - (stageSize.width + renderedWidth) / 2
  const maxX = cropPixels.x + (renderedWidth - stageSize.width) / 2
  const minY =
    cropPixels.y + cropPixels.height - (stageSize.height + renderedHeight) / 2
  const maxY = cropPixels.y + (renderedHeight - stageSize.height) / 2
  return {
    x: clamp(pan.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(pan.y, Math.min(minY, maxY), Math.max(minY, maxY)),
  }
}

function cropToStagePixels(
  crop: Crop,
  stageSize: { width: number; height: number }
) {
  if (crop.unit === "%")
    return {
      x: (crop.x / 100) * stageSize.width,
      y: (crop.y / 100) * stageSize.height,
      width: (crop.width / 100) * stageSize.width,
      height: (crop.height / 100) * stageSize.height,
    }
  return {
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
  }
}

function cropToPercent(
  crop: Crop,
  stageSize: { width: number; height: number }
) {
  if (crop.unit === "%")
    return {
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    }
  return {
    x: (crop.x / stageSize.width) * 100,
    y: (crop.y / stageSize.height) * 100,
    width: (crop.width / stageSize.width) * 100,
    height: (crop.height / stageSize.height) * 100,
  }
}

function cropCenter(crop: {
  x: number
  y: number
  width: number
  height: number
}) {
  return {
    x: crop.x + crop.width / 2,
    y: crop.y + crop.height / 2,
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function ImagePreviewDialog({
  open,
  onOpenChange,
  src,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
}) {
  const [scale, setScale] = React.useState(1)
  const previewWheelCleanupRef = React.useRef<(() => void) | null>(null)
  const bindPreviewViewport = React.useCallback(
    (viewport: HTMLDivElement | null) => {
      previewWheelCleanupRef.current?.()
      previewWheelCleanupRef.current = null
      if (!viewport) return
      function zoomWithWheel(event: WheelEvent) {
        event.preventDefault()
        event.stopPropagation()
        setScale((current) =>
          Math.min(5, Math.max(0.25, current - event.deltaY * 0.0015))
        )
      }
      viewport.addEventListener("wheel", zoomWithWheel, { passive: false })
      previewWheelCleanupRef.current = () =>
        viewport.removeEventListener("wheel", zoomWithWheel)
    },
    []
  )

  React.useEffect(() => {
    return () => previewWheelCleanupRef.current?.()
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setScale(1)
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="grid h-[calc(100dvh-2rem)] max-h-[56rem] grid-rows-[minmax(0,1fr)_auto] overflow-hidden p-3 sm:max-w-5xl"
        style={{
          display: "grid",
          width: "min(64rem, calc(100vw - 2rem))",
          height: "min(56rem, calc(100dvh - 2rem))",
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: "calc(100dvh - 2rem)",
          gridTemplateRows: "minmax(0, 1fr) auto",
          overflow: "hidden",
          padding: "0.75rem",
        }}
      >
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        <div
          ref={bindPreviewViewport}
          className="flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
          style={{
            ...mediaCanvasBackground,
            display: "flex",
            minWidth: 0,
            minHeight: 0,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src={src}
            alt="Media preview"
            draggable={false}
            className="max-h-full max-w-full object-contain transition-transform duration-150"
            style={{
              display: "block",
              width: "auto",
              height: "auto",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              transform: `scale(${scale})`,
              transformOrigin: "center",
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-2 pt-3">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() =>
              setScale((current) => Math.max(0.25, current - 0.25))
            }
            aria-label="Zoom out"
          >
            <ZoomOut />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setScale(1)}
          >
            <RotateCcw />
            {Math.round(scale * 100)}%
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => setScale((current) => Math.min(5, current + 0.25))}
            aria-label="Zoom in"
          >
            <ZoomIn />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

async function cropToWebp(
  image: HTMLImageElement,
  crop: PixelCrop,
  width: number,
  height: number,
  quality: number
) {
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is unavailable")
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    width,
    height
  )
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image conversion failed")),
      "image/webp",
      quality
    )
  )
}

function replaceExtension(name: string, extension: string) {
  return `${name.replace(/\.[^.]+$/, "") || "image"}.${extension}`
}

function createPendingFile(
  file: File,
  purpose: MediaPurpose,
  storageId: string,
  imageMode?: "crop" | "fit",
  sourceUrl?: string,
  originalFile?: File,
  cropState?: MediaCropState
): PendingMediaSelection {
  return {
    token: `pending-media:${createPendingId()}`,
    purpose,
    kind: getMediaRule(purpose).kind,
    previewUrl: URL.createObjectURL(file),
    storageId: storageId || undefined,
    file,
    originalFile,
    sourceUrl,
    imageMode,
    cropState,
  }
}

async function prepareRemoteImage(
  sourceUrl: string,
  purpose: MediaPurpose,
  referrerUrl?: string
) {
  return prepareRemoteMedia(sourceUrl, purpose, referrerUrl)
}

async function prepareRemoteMedia(
  sourceUrl: string,
  purpose: MediaPurpose,
  referrerUrl?: string
) {
  const response = await fetch("/api/v1/admin/media/prepare-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ purpose, url: sourceUrl, referrerUrl }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string
      error?: string
    } | null
    throw new Error(body?.message ?? body?.error ?? "Unable to prepare media")
  }
  const blob = await response.blob()
  const fileName =
    response.headers.get("x-media-filename") ??
    `remote-${createPendingId()}.webp`
  const mimeType =
    response.headers.get("content-type")?.split(";")[0] ?? blob.type
  return new File([blob], fileName, { type: mimeType })
}

function createPendingUrl(
  sourceUrl: string,
  purpose: MediaPurpose,
  storageId: string,
  imageMode?: "crop" | "fit"
): PendingMediaSelection {
  return {
    token: `pending-media:${createPendingId()}`,
    purpose,
    kind: getMediaRule(purpose).kind,
    previewUrl: sourceUrl,
    storageId: storageId || undefined,
    sourceUrl,
    imageMode,
  }
}

function uploadPendingFile(selection: PendingMediaSelection, keySlug?: string) {
  if (!selection.file) throw new Error("Pending media file is missing")
  const form = new FormData()
  form.append("purpose", selection.purpose)
  if (selection.storageId) form.append("storageId", selection.storageId)
  if (selection.imageMode) form.append("imageMode", selection.imageMode)
  if (keySlug) form.append("keySlug", keySlug)
  form.append("file", selection.file)
  return fetch("/api/v1/admin/media/upload", { method: "POST", body: form })
}

function importPendingVdoHide(selection: PendingMediaSelection) {
  if (!selection.sourceUrl)
    throw new Error("VdoHide import requires a source URL")
  return fetch("/api/v1/admin/media/import-vdohide", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      purpose: selection.purpose,
      url: selection.sourceUrl,
      fallbackUrl: selection.fallbackUrl,
    }),
  })
}

function importPendingUrl(selection: PendingMediaSelection, keySlug?: string) {
  if (!selection.sourceUrl) throw new Error("Pending media URL is missing")
  return fetch("/api/v1/admin/media/import-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      purpose: selection.purpose,
      url: selection.sourceUrl,
      storageId: selection.storageId,
      imageMode: selection.imageMode,
      referrerUrl: selection.referrerUrl,
      keySlug,
    }),
  })
}

function usesVdoHideImport(purpose: MediaPurpose) {
  return purpose === "video" || purpose === "short"
}

function createPendingId() {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID()
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const values = globalThis.crypto.getRandomValues(new Uint32Array(4))
    return [...values]
      .map((value) => value.toString(16).padStart(8, "0"))
      .join("")
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function formatBytes(value: number) {
  if (value >= 1024 ** 3) return `${Math.round(value / 1024 ** 3)} GB`
  return `${Math.round(value / 1024 ** 2)} MB`
}
