
export function stringifySafe(obj: any, spacing = 2) {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
    spacing
  );
}