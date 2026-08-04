type RateLimitOptions = {
  windowMs: number
  max: number
}

const store = new Map<string, number[]>()

export const isRateLimited = (
  key: string,
  { windowMs, max }: RateLimitOptions
): boolean => {
  const now = Date.now()
  const windowStart = now - windowMs
  const timestamps = store.get(key) ?? []
  const recent = timestamps.filter((timestamp) => timestamp > windowStart)

  if (recent.length >= max) {
    store.set(key, recent)
    return true
  }

  recent.push(now)
  store.set(key, recent)
  return false
}
