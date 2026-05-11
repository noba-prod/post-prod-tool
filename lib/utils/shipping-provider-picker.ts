/**
 * Ensures the selected carrier string appears in OptionPicker `options` when it was added as a
 * custom value (not in the static preset list).
 */
export function mergeShippingProviderOptions(
  base: { value: string; label: string }[],
  current: string | undefined | null
): { value: string; label: string }[] {
  const v = current?.trim()
  if (!v) return base
  const inList = base.some(
    (o) =>
      o.value === v ||
      o.label.toLowerCase() === v.toLowerCase() ||
      o.value.toLowerCase() === v.toLowerCase()
  )
  if (inList) return base
  return [...base, { value: v, label: v }]
}
