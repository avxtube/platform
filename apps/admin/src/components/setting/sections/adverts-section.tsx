"use client";

import React, { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import {
    Button, Input, Label, SettingCard, SettingCardSkeleton,
} from "@workspace/ui/components";
import {
    PlusIcon, GripVerticalIcon, Trash2Icon, VideoIcon, ImageIcon,
    Code2Icon, Loader2, SaveIcon, ChevronDownIcon, ChevronUpIcon,
    TagIcon, LinkIcon, TimerIcon, PowerIcon, ImagePlusIcon, CodeIcon,
    AlertCircleIcon,
} from "lucide-react";
import { AdsImageShowOn } from "@workspace/core/enums";
import { advertHobbyValid, type AdvertSettings } from "@workspace/core/validators";

// ─── Local types (equivalents of the old ResultAdvert / ResultDomainAdvert) ───

interface ResultAdvert {
    _id?: string;
    enabled: boolean;
    name: string;
    // video
    mp4Url?: string;
    skipSeconds?: number;
    offset?: "pre" | "post" | number | `${number}%`;
    // video + image
    websiteUrl?: string;
    // image
    imageUrl?: string;
    showOn?: AdsImageShowOn[];
    // script
    script?: string;
}

interface ResultDomainAdvertCategory {
    enabled: boolean;
    list: ResultAdvert[];
}

interface ResultDomainAdvert {
    video: ResultDomainAdvertCategory;
    image: ResultDomainAdvertCategory;
    script: ResultDomainAdvertCategory;
}

// ─── Config ───

type CategoryKey = "video" | "image" | "script";

const CATEGORIES: {
    key: CategoryKey;
    label: string;
    desc: string;
    icon: React.ElementType;
    color: string;
    bg: string;
}[] = [
        {
            key: "video",
            label: "Video Ads",
            desc: "Pre-roll video ads displayed before content playback. Drag to reorder priority.",
            icon: VideoIcon, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/40",
        },
        {
            key: "image",
            label: "Image Ads",
            desc: "Banner image ads displayed as overlays on the player.",
            icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/40",
        },
        {
            key: "script",
            label: "Script Ads",
            desc: "Custom JavaScript ad scripts injected into the player.",
            icon: Code2Icon, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/40",
        },
    ];

// ─── Shared Components ───

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!checked); }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-input'}`}
        disabled={disabled}
    >
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const StatusDot = ({ active }: { active: boolean }) => (
    <span className={`inline-block size-1.5 rounded-full transition-colors duration-200 ${active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
);

const genId = () => Math.random().toString(36).substring(2, 9);

type VideoOffsetMode = "pre" | "percent" | "seconds" | "post";

function videoOffsetMode(offset: ResultAdvert["offset"]): VideoOffsetMode {
    if (offset === "post") return "post";
    if (typeof offset === "number") return "seconds";
    if (typeof offset === "string" && offset.endsWith("%")) return "percent";
    return "pre";
}

function videoOffsetLabel(offset: ResultAdvert["offset"]): string {
    if (offset === "post") return "Post-roll";
    if (typeof offset === "number") return `${offset}s`;
    if (typeof offset === "string" && offset.endsWith("%")) return offset;
    return "Pre-roll";
}

// ─── Validation ───

function validateAd(ad: ResultAdvert, categoryKey: CategoryKey): string[] {
    const errors: string[] = [];
    if (!ad.name?.trim()) errors.push("name");
    if (categoryKey === "video" && !ad.mp4Url?.trim()) errors.push("mp4Url");
    if (categoryKey === "image" && !ad.imageUrl?.trim()) errors.push("imageUrl");
    if (categoryKey === "image" && (!ad.showOn || ad.showOn.length === 0)) errors.push("showOn");
    if (categoryKey === "script" && !ad.script?.trim()) errors.push("script");
    return errors;
}

function validateAllAds(data: ResultDomainAdvert): { category: CategoryKey; adId: string; errors: string[] }[] {
    const issues: { category: CategoryKey; adId: string; errors: string[] }[] = [];
    for (const key of ["video", "image", "script"] as CategoryKey[]) {
        for (const ad of data[key].list) {
            const errors = validateAd(ad, key);
            if (errors.length > 0) issues.push({ category: key, adId: ad._id!, errors });
        }
    }
    return issues;
}

// ─── Show-on Options (for image ads) ───

const showOnOptions: { value: AdsImageShowOn; label: string; desc: string }[] = [
    { value: AdsImageShowOn.READY, label: "Ready", desc: "Before playback starts" },
    { value: AdsImageShowOn.END, label: "End", desc: "After video ends" },
    { value: AdsImageShowOn.PAUSE, label: "Pause", desc: "When player is paused" },
];

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════

export function AdvertSection({ data }: { data: { advert_hobby?: AdvertSettings } }) {
    const router = useRouter();
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false,
    );
    const [isPending, startTransition] = useTransition();

    const ensureIds = (list: ResultAdvert[]): ResultAdvert[] =>
        list.map(ad => ({ ...ad, _id: ad._id || genId() }));

    // Read from advert_hobby setting key
    const raw = data.advert_hobby as ResultDomainAdvert | undefined;

    const initial: ResultDomainAdvert = {
        video: { enabled: raw?.video?.enabled ?? false, list: ensureIds(raw?.video?.list ?? []) },
        image: { enabled: raw?.image?.enabled ?? false, list: ensureIds(raw?.image?.list ?? []) },
        script: { enabled: raw?.script?.enabled ?? false, list: ensureIds(raw?.script?.list ?? []) },
    };

    const [formData, setFormData] = useState<ResultDomainAdvert>(initial);
    const [originalData, setOriginalData] = useState<ResultDomainAdvert>(initial);

    const hasChanges = () => JSON.stringify(formData) !== JSON.stringify(originalData);
    const validationIssues = validateAllAds(formData);
    const isValid = validationIssues.length === 0;

    const updateCategory = (key: CategoryKey, category: ResultDomainAdvertCategory) => {
        setFormData(prev => ({ ...prev, [key]: category }));
    };

    const handleSave = () => {
        if (!isValid) {
            toast.error("Please fill in all required fields before saving.");
            return;
        }
        // Schema-level validation (advert_hobby) before hitting the server.
        const parsed = advertHobbyValid.safeParse(formData);
        if (!parsed.success) {
            toast.error("Advert configuration is invalid. Please review the fields.");
            return;
        }
        startTransition(async () => {
            // Save as advert_hobby with {video, image, script} — _id preserved
            const response = await fetch("/api/v1/admin/settings/adverts", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(parsed.data),
            });
            if (!response.ok) {
                toast.error("Unable to save advert settings.");
            } else {
                toast.success("Settings saved");
                const savedData = JSON.parse(JSON.stringify(parsed.data));
                setFormData(savedData);
                setOriginalData(savedData);
                router.refresh();
            }
        });
    };

    const handleDiscard = () => {
        if (!window.confirm("Discard changes? All unsaved changes will be lost.")) return;
        setFormData(JSON.parse(JSON.stringify(originalData)));
    };

    if (!mounted) return (
        <div className="space-y-6">
            <SettingCardSkeleton />
            <SettingCardSkeleton />
            <SettingCardSkeleton />
        </div>
    );

    return (
        <div className="space-y-6 relative pb-24">
            {CATEGORIES.map((cat) => (
                <CategoryCard
                    key={cat.key}
                    categoryKey={cat.key}
                    config={cat}
                    category={formData[cat.key]}
                    isPending={isPending}
                    validationIssues={validationIssues.filter(i => i.category === cat.key)}
                    onUpdate={(updated) => updateCategory(cat.key, updated)}
                />
            ))}

            {/* ─── Sticky Save Bar ─── */}
            <div className={cn(
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out",
                hasChanges() ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95 pointer-events-none"
            )}>
                <div className="flex items-center gap-6 bg-background/80 backdrop-blur-xl border border-primary/30 shadow-[0_10px_40px_rgba(var(--primary),0.15)] px-6 py-4 rounded-full min-w-[400px] justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex size-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full size-2.5 bg-primary"></span>
                        </div>
                        <span className="text-sm font-semibold tracking-wide text-foreground">Unsaved changes</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors text-xs font-semibold px-4"
                            onClick={handleDiscard}
                            disabled={isPending}
                        >
                            Discard
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            size="sm"
                            className="rounded-full shadow-[0_0_15px_rgba(var(--primary),0.4)] transition-all hover:shadow-[0_0_25px_rgba(var(--primary),0.6)] px-6 text-xs font-bold tracking-wider bg-primary text-primary-foreground"
                            disabled={isPending || !hasChanges() || !isValid}
                        >
                            {isPending ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <SaveIcon className="size-3.5 mr-2" />}
                            {isPending ? "SAVING..." : "SAVE CHANGES"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// Category Card — one SettingCard per ad type
// ═══════════════════════════════════════════════════

function CategoryCard({
    categoryKey,
    config,
    category,
    isPending,
    validationIssues,
    onUpdate,
}: {
    categoryKey: CategoryKey;
    config: (typeof CATEGORIES)[number];
    category: ResultDomainAdvertCategory;
    isPending: boolean;
    validationIssues: { adId: string; errors: string[] }[];
    onUpdate: (category: ResultDomainAdvertCategory) => void;
}) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const touchState = React.useRef<{ startIndex: number; startY: number; currentY: number } | null>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const Icon = config.icon;
    const list = category.list;
    const hasErrors = validationIssues.length > 0;

    const updateList = (newList: ResultAdvert[]) => {
        onUpdate({ ...category, list: newList });
    };

    const toggleEnabled = (v: boolean) => {
        onUpdate({ ...category, enabled: v });
    };

    const addAd = () => {
        const newAd: ResultAdvert = {
            _id: genId(),
            enabled: true,
            name: "",
            ...(categoryKey === "video" ? { mp4Url: "", skipSeconds: 5, offset: "pre", websiteUrl: "" } : {}),
            ...(categoryKey === "image" ? { imageUrl: "", websiteUrl: "", showOn: [] } : {}),
            ...(categoryKey === "script" ? { script: "" } : {}),
        };
        updateList([...list, newAd]);
        setExpandedId(newAd._id!);
    };

    const removeAd = (id: string) => {
        const ad = list.find(a => a._id === id);
        if (!window.confirm(`Delete advertisement "${ad?.name || "Untitled"}"?`)) return;
        updateList(list.filter(a => a._id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const updateAd = (id: string, updates: Partial<ResultAdvert>) => {
        updateList(list.map(a => a._id === id ? { ...a, ...updates } : a));
    };

    // ─── Drag & Drop ───
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };
    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }
        const next = [...list];
        const [moved] = next.splice(dragIndex, 1);
        if (moved) next.splice(dropIndex, 0, moved);
        updateList(next);
        setDragIndex(null);
        setDragOverIndex(null);
    };
    const handleDragEnd = () => {
        setDragIndex(null);
        setDragOverIndex(null);
    };

    // ─── Touch Drag (mobile) ───
    const handleTouchStart = (e: React.TouchEvent, index: number) => {
        const touch = e.touches[0];
        if (!touch) return;
        touchState.current = { startIndex: index, startY: touch.clientY, currentY: touch.clientY };
        setDragIndex(index);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchState.current || !listRef.current) return;
        const touch = e.touches[0];
        if (!touch) return;
        touchState.current.currentY = touch.clientY;

        const items = listRef.current.querySelectorAll<HTMLElement>('[data-ad-index]');
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                const idx = Number(item.dataset.adIndex);
                if (!isNaN(idx) && idx !== touchState.current.startIndex) {
                    setDragOverIndex(idx);
                }
                break;
            }
        }
    };

    const handleTouchEnd = () => {
        if (!touchState.current) return;
        const { startIndex } = touchState.current;
        if (dragOverIndex !== null && dragOverIndex !== startIndex) {
            const next = [...list];
            const [moved] = next.splice(startIndex, 1);
            if (moved) next.splice(dragOverIndex, 0, moved);
            updateList(next);
        }
        touchState.current = null;
        setDragIndex(null);
        setDragOverIndex(null);
    };

    return (
        <SettingCard
            title={config.label}
            description={config.desc}
            footer={
                <div className="flex items-center justify-between w-full">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        {list.length} ad{list.length !== 1 ? "s" : ""} · {list.filter(a => a.enabled).length} active
                        {hasErrors && (
                            <span className="text-amber-500 ml-2">
                                · {validationIssues.length} incomplete
                            </span>
                        )}
                    </p>
                    <Button type="button" size="sm" variant="outline" className="gap-2 text-xs" onClick={addAd}>
                        <PlusIcon className="size-3.5" />
                        Add Ad
                    </Button>
                </div>
            }
            className="relative p-0"
            headerClassName="p-5 border-b border-border bg-muted/30"
        >
            {/* Category Enable Toggle */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border/60">
                <div className={`flex items-center justify-center size-8 rounded-lg border transition-colors ${category.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                    <PowerIcon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Enable {config.label}</span>
                        <StatusDot active={category.enabled} />
                        <span className={`text-[10px] font-medium uppercase tracking-wide ${category.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'}`}>
                            {category.enabled ? "Active" : "Disabled"}
                        </span>
                    </div>
                </div>
                <Toggle
                    checked={category.enabled}
                    onChange={toggleEnabled}
                    disabled={isPending}
                />
            </div>

            {/* Ad List */}
            <div className="p-5">
                {list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-border">
                        <div className={cn("w-12 h-12 mx-auto rounded-full flex items-center justify-center", config.bg)}>
                            <Icon className={cn("size-6 opacity-60", config.color)} />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mt-3">
                            No {config.label.toLowerCase()} configured
                        </p>
                        <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={addAd}>
                            <PlusIcon className="size-3.5" />
                            Add Ad
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2" ref={listRef}>
                        {list.map((ad, index) => {
                            const isExpanded = expandedId === ad._id;
                            const isDragging = dragIndex === index;
                            const isDragOver = dragOverIndex === index && dragIndex !== index;
                            const adErrors = validateAd(ad, categoryKey);
                            const adHasErrors = adErrors.length > 0;

                            return (
                                <div
                                    key={ad._id}
                                    data-ad-index={index}
                                    className={cn(
                                        "rounded-lg border bg-background transition-all overflow-hidden",
                                        adHasErrors ? "border-amber-500/50" : "border-border",
                                        isDragging && "opacity-50",
                                        isDragOver && "border-primary ring-1 ring-primary/30"
                                    )}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={(e) => handleDrop(e, index)}
                                >
                                    {/* Header row — draggable */}
                                    <div
                                        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors touch-none select-none"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onTouchStart={(e) => handleTouchStart(e, index)}
                                        onTouchMove={(e) => handleTouchMove(e)}
                                        onTouchEnd={handleTouchEnd}
                                        onClick={() => setExpandedId(isExpanded ? null : ad._id!)}
                                    >
                                        <GripVerticalIcon
                                            className="size-4 text-muted-foreground/30 shrink-0 cursor-grab active:cursor-grabbing hover:text-foreground transition-colors"
                                        />
                                        <span className="text-[10px] font-bold font-mono text-muted-foreground/50 w-4 text-center shrink-0">{index + 1}</span>
                                        <div className={cn("flex items-center justify-center size-7 rounded-md border shrink-0 transition-colors", ad.enabled ? `${config.bg} border-transparent` : "bg-muted/50 border-border")}>
                                            <Icon className={cn("size-3.5", ad.enabled ? config.color : "text-muted-foreground")} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium truncate">{ad.name || "Untitled"}</span>
                                                {adHasErrors && <AlertCircleIcon className="size-3.5 text-amber-500 shrink-0" />}
                                                <StatusDot active={ad.enabled} />
                                            </div>
                                        </div>
                                        {categoryKey === "video" && ad.skipSeconds !== undefined && (
                                            <span className="text-[10px] text-muted-foreground font-mono shrink-0 bg-muted rounded px-1.5 py-0.5">{ad.skipSeconds}s skip</span>
                                        )}
                                        {categoryKey === "video" && (
                                            <span className="text-[10px] text-muted-foreground font-mono shrink-0 bg-muted rounded px-1.5 py-0.5">{videoOffsetLabel(ad.offset)}</span>
                                        )}
                                        {categoryKey === "image" && ad.showOn && ad.showOn.length > 0 && (
                                            <span className="text-[10px] text-muted-foreground font-mono shrink-0 bg-muted rounded px-1.5 py-0.5">{ad.showOn.length} event{ad.showOn.length !== 1 ? "s" : ""}</span>
                                        )}
                                        <Toggle
                                            checked={ad.enabled}
                                            onChange={(v) => updateAd(ad._id!, { enabled: v })}
                                            disabled={isPending}
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeAd(ad._id!); }}
                                            className="p-1 rounded text-muted-foreground/40 hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
                                        >
                                            <Trash2Icon className="size-3.5" />
                                        </button>
                                        <div className="shrink-0 text-muted-foreground/40">
                                            {isExpanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                                        </div>
                                    </div>

                                    {/* Expanded fields */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 border-t border-border/60 bg-muted/10">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                                {/* Name (all categories) */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <TagIcon className="size-3.5 text-muted-foreground" />
                                                        <Label className="text-xs font-medium">Ad Name</Label>
                                                    </div>
                                                    <Input
                                                        value={ad.name}
                                                        onChange={(e) => updateAd(ad._id!, { name: e.target.value })}
                                                        placeholder="Enter ad name"
                                                        className="text-xs"
                                                    />
                                                </div>

                                                {/* Video fields */}
                                                {categoryKey === "video" && (
                                                    <>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <TimerIcon className="size-3.5 text-muted-foreground" />
                                                                <Label className="text-xs font-medium">Skip After</Label>
                                                            </div>
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    value={ad.skipSeconds ?? 5}
                                                                    onChange={(e) => updateAd(ad._id!, { skipSeconds: Number(e.target.value) })}
                                                                    min={0}
                                                                    max={60}
                                                                    className="text-xs pr-10"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">sec</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <TimerIcon className="size-3.5 text-muted-foreground" />
                                                                <Label className="text-xs font-medium">Ad Position</Label>
                                                            </div>
                                                            <select
                                                                value={videoOffsetMode(ad.offset)}
                                                                onChange={(e) => {
                                                                    const mode = e.target.value as VideoOffsetMode;
                                                                    updateAd(ad._id!, {
                                                                        offset: mode === "pre" ? "pre" : mode === "post" ? "post" : mode === "percent" ? "50%" : 300,
                                                                    });
                                                                }}
                                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                                            >
                                                                <option value="pre">Pre-roll — before video</option>
                                                                <option value="percent">Mid-roll — watched percentage</option>
                                                                <option value="seconds">Mid-roll — playback time</option>
                                                                <option value="post">Post-roll — after video</option>
                                                            </select>
                                                        </div>
                                                        {videoOffsetMode(ad.offset) === "percent" && (
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium">Play After</Label>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        value={Number.parseInt(String(ad.offset), 10) || 50}
                                                                        onChange={(e) => {
                                                                            const value = Math.min(99, Math.max(1, Number(e.target.value) || 1));
                                                                            updateAd(ad._id!, { offset: `${value}%` });
                                                                        }}
                                                                        min={1}
                                                                        max={99}
                                                                        className="pr-10 text-xs"
                                                                    />
                                                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">%</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {videoOffsetMode(ad.offset) === "seconds" && (
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium">Play After</Label>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        value={typeof ad.offset === "number" ? ad.offset : 300}
                                                                        onChange={(e) => updateAd(ad._id!, { offset: Math.max(0, Number(e.target.value) || 0) })}
                                                                        min={0}
                                                                        className="pr-10 text-xs"
                                                                    />
                                                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">sec</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="space-y-1.5 sm:col-span-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <VideoIcon className="size-3.5 text-muted-foreground" />
                                                                <Label className="text-xs font-medium">Video URL (MP4)</Label>
                                                            </div>
                                                            <Input
                                                                value={ad.mp4Url ?? ""}
                                                                onChange={(e) => updateAd(ad._id!, { mp4Url: e.target.value })}
                                                                placeholder="https://cdn.example.com/ad.mp4"
                                                                className="font-mono text-xs"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5 sm:col-span-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <LinkIcon className="size-3.5 text-muted-foreground" />
                                                                <Label className="text-xs font-medium">Click-through URL</Label>
                                                            </div>
                                                            <Input
                                                                value={ad.websiteUrl ?? ""}
                                                                onChange={(e) => updateAd(ad._id!, { websiteUrl: e.target.value })}
                                                                placeholder="https://advertiser.com/landing"
                                                                className="font-mono text-xs"
                                                            />
                                                        </div>
                                                    </>
                                                )}

                                                {/* Image fields */}
                                                {categoryKey === "image" && (
                                                    <>
                                                        <div className="space-y-1.5 sm:col-span-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <ImagePlusIcon className="size-3.5 text-muted-foreground" />
                                                                <Label className="text-xs font-medium">Image URL</Label>
                                                            </div>
                                                            <Input
                                                                value={ad.imageUrl ?? ""}
                                                                onChange={(e) => updateAd(ad._id!, { imageUrl: e.target.value })}
                                                                placeholder="https://cdn.example.com/banner.png"
                                                                className="font-mono text-xs"
                                                            />
                                                            {/* Image Preview */}
                                                            {ad.imageUrl?.trim() ? (
                                                                <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted/30">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={ad.imageUrl}
                                                                        alt={ad.name || "Untitled"}
                                                                        className="w-full max-h-48 object-contain"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                                                                        onLoad={(e) => { (e.target as HTMLImageElement).style.display = ''; (e.target as HTMLImageElement).nextElementSibling?.classList.add('hidden'); }}
                                                                    />
                                                                    <div className="hidden flex-col items-center justify-center py-6 text-muted-foreground">
                                                                        <AlertCircleIcon className="size-5 mb-1" />
                                                                        <span className="text-[10px]">Failed to load image</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-2 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center py-6 text-muted-foreground/50">
                                                                    <ImageIcon className="size-8 mb-1" />
                                                                    <span className="text-[10px]">Enter a URL to preview</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <LinkIcon className="size-3.5 text-muted-foreground" />
                                                                <Label className="text-xs font-medium">Click-through URL</Label>
                                                            </div>
                                                            <Input
                                                                value={ad.websiteUrl ?? ""}
                                                                onChange={(e) => updateAd(ad._id!, { websiteUrl: e.target.value })}
                                                                placeholder="https://advertiser.com/landing"
                                                                className="font-mono text-xs"
                                                            />
                                                        </div>
                                                        {/* Trigger Events */}
                                                        <div className="sm:col-span-2 space-y-2 pt-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trigger Events</span>
                                                                <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                                                                    {(ad.showOn ?? []).length}/{showOnOptions.length}
                                                                </span>
                                                                <div className="flex-1 h-px bg-border" />
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {showOnOptions.map((option) => {
                                                                    const selected = (ad.showOn ?? []).includes(option.value);
                                                                    return (
                                                                        <button
                                                                            key={option.value}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const current = ad.showOn ?? [];
                                                                                const updated = selected
                                                                                    ? current.filter(o => o !== option.value)
                                                                                    : [...current, option.value];
                                                                                updateAd(ad._id!, { showOn: updated as AdsImageShowOn[] });
                                                                            }}
                                                                            className={cn(
                                                                                "group relative flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-2.5 text-center transition-all",
                                                                                selected
                                                                                    ? "bg-primary/5 border-primary text-primary shadow-sm"
                                                                                    : "bg-background border-border text-muted-foreground hover:bg-accent hover:border-border"
                                                                            )}
                                                                        >
                                                                            <span className="text-xs font-semibold capitalize">{option.label}</span>
                                                                            <span className="text-[10px] leading-tight opacity-70">{option.desc}</span>
                                                                            {selected && (
                                                                                <div className="absolute -top-1 -right-1 size-4 rounded-full bg-primary flex items-center justify-center">
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-2.5 text-primary-foreground">
                                                                                        <polyline points="20 6 9 17 4 12" />
                                                                                    </svg>
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {/* Script fields */}
                                                {categoryKey === "script" && (
                                                    <div className="space-y-1.5 sm:col-span-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <CodeIcon className="size-3.5 text-muted-foreground" />
                                                            <Label className="text-xs font-medium">JavaScript Code</Label>
                                                        </div>
                                                        <textarea
                                                            value={ad.script ?? ""}
                                                            onChange={(e) => updateAd(ad._id!, { script: e.target.value })}
                                                            placeholder={'<script src="https://ads.example.com/ad.js"></script>'}
                                                            rows={4}
                                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </SettingCard>
    );
}
