"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export const LAZY_LOAD_PAGE_SIZE = 20

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  rootMargin?: string
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = "200px",
}: UseInfiniteScrollOptions) {
  const onLoadMoreRef = useRef(onLoadMore)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const hasMoreRef = useRef(hasMore)
  const isLoadingRef = useRef(isLoading)

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    hasMoreRef.current = hasMore
    isLoadingRef.current = isLoading
  }, [hasMore, isLoading])

  const connectObserver = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      nodeRef.current = node
      if (!node || !hasMoreRef.current || isLoadingRef.current) return

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            onLoadMoreRef.current()
          }
        },
        { rootMargin }
      )
      observer.observe(node)
      observerRef.current = observer
    },
    [rootMargin]
  )

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      connectObserver(node)
    },
    [connectObserver]
  )

  useEffect(() => {
    connectObserver(nodeRef.current)
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [connectObserver, hasMore, isLoading])

  return sentinelRef
}

export function useLazyLoadSlice<T>(items: T[], pageSize = LAZY_LOAD_PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [animateFromIndex, setAnimateFromIndex] = useState(0)

  useEffect(() => {
    setVisibleCount(pageSize)
    setAnimateFromIndex(0)
  }, [items, pageSize])

  const visibleItems = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length

  const loadMore = useCallback(() => {
    if (isLoadingMore || visibleCount >= items.length) return
    setIsLoadingMore(true)
    const nextFromIndex = visibleCount
    window.setTimeout(() => {
      setAnimateFromIndex(nextFromIndex)
      setVisibleCount((prev) => Math.min(prev + pageSize, items.length))
      setIsLoadingMore(false)
    }, 250)
  }, [items.length, pageSize, isLoadingMore, visibleCount])

  return { visibleItems, hasMore, isLoadingMore, loadMore, animateFromIndex }
}
