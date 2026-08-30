"use client"

export type HomeCategory = { value: string; label: string }

export function CategoryChips({ categories, active, onChange }: { categories: HomeCategory[]; active: string; onChange: (value: string) => void }) {
  return <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
    {categories.map((category) => <button type="button" key={category.value} aria-pressed={category.value === active} onClick={() => onChange(category.value)} className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${category.value === active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"}`}>{category.label}</button>)}
  </div>
}
