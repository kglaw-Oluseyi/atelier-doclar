export const ATELIER_TOKENS = {
  color: {
    onyx: "#11100F",
    espresso: "#1B1815",
    ivory: "#F5F0E8",
    parchment: "#EAE1D4",
    porcelain: "#FCFAF7",
    ink: "#191714",
    umber: "#5A534B",
    champagne: "#B89A62",
    champagnePale: "#D8C59C",
    oxblood: "#65352F",
    success: "#2F5D3A",
    warning: "#8A6A1F",
    error: "#8A3A32",
    information: "#3D4F63",
  },
  motion: {
    control: "200ms",
    panel: "280ms",
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
  radius: { sm: 6, md: 10, lg: 16 },
  font: {
    operational: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    editorial: 'var(--font-editorial), "Iowan Old Style", Palatino, "Times New Roman", serif',
  },
} as const;
