"use client"

import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { DataTablePager } from "@workspace/data-table"

export function QueuePager({
  page,
  pageCount,
  pageSize,
}: {
  page: number
  pageCount: number
  pageSize: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const changePage = React.useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (nextPage <= 1) params.delete("page")
      else params.set("page", String(nextPage))
      const query = params.toString()
      router.push(`/contents/video/import${query ? `?${query}` : ""}`)
    },
    [router, searchParams]
  )

  return (
    <DataTablePager
      page={page}
      pageCount={pageCount}
      pageSize={pageSize}
      onPageChange={changePage}
    />
  )
}
