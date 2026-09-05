export const DESIGN_TOKENS = {
  color: {
    ink: "#161513",
    muted: "#5c5852",
    paper: "#f7f4ef",
    raised: "#ffffff",
    line: "#d8d2c8",
    brass: "#b79f85",
    focus: "#1b1a17",
    danger: "#8a3a32",
    warn: "#8a6a1f",
    ok: "#2f5d3a",
  },
  space: [4, 8, 12, 16, 24, 32, 48] as const,
  radius: { sm: 6, md: 8, lg: 10 },
  font: {
    family: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    body: "1rem",
    small: "0.875rem",
  },
  touch: 44,
} as const;

export const STATUS_WORDS = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
  DISCOVER: "Discover",
  DESIGN: "Design",
  PREPARE: "Prepare",
  READY: "Ready",
  LIVE: "Live",
  CLOSE: "Close",
  LEARN: "Learn",
} as const;
