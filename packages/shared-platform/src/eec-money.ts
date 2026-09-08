/** BigInt-safe money formatting. Never coerce minor-unit strings through JavaScript Number. */

const MINOR_PER_MAJOR = 100n;

export function formatMoneyMinor(minor: string, currency = "NGN"): string {
  if (minor === "redacted") return "Restricted in this projection";
  if (!/^-?\d+$/.test(minor)) return `${currency} unavailable`;
  const value = BigInt(minor);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / MINOR_PER_MAJOR;
  const frac = (abs % MINOR_PER_MAJOR).toString().padStart(2, "0");
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${negative ? "-" : ""}${grouped}.${frac}`;
}
