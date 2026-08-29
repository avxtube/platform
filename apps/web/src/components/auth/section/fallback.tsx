import { Skeleton } from "@workspace/ui/components"

export const AuthFallback = ({ rows = 2 }: { rows?: number }) => {
    return (
        <div className="space-y-8 animate-in fade-in-0 duration-500">
            {/* Form fields skeleton - matches FormField structure */}
            {Array.from({ length: rows }).map((_, i) => (
                <div className="space-y-2" key={i}>
                    {/* FormLabel skeleton */}
                    <Skeleton className="w-16 h-4 bg-muted-foreground/20" />
                    {/* FormControl (Input) skeleton */}
                    <Skeleton className="w-full h-10 bg-muted/50 rounded-md border" />
                    {/* FormMessage space */}
                    <div className="h-1" />
                </div>
            ))}

            {/* Submit button skeleton - matches SubmitButton */}
            <Skeleton className="w-full h-10 bg-primary/20 rounded-md" />

            {/* Loading indicator */}
            <div className="flex justify-center space-x-1">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                        style={{
                            animationDelay: `${i * 0.15}s`,
                            animationDuration: '1s'
                        }}
                    />
                ))}
            </div>
        </div>
    )
}