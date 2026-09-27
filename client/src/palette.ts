export const SECTION_COLORS = [
  { name: "Sage", value: "#ad9ca6" },
  { name: "Dusty Rose", value: "#d3917f" },
  { name: "Terracotta", value: "#aaab89" },
  { name: "Mauve", value: "#c16e4e" },
  { name: "Gold", value: "#a0b6b3" },
  { name: "Slate Blue", value: "#7c514f" },
  { name: "Blush", value: "#7a7a62" },
  { name: "Charcoal", value: "#8ba099" },
];

export function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return SECTION_COLORS[hash % SECTION_COLORS.length].value;
}
