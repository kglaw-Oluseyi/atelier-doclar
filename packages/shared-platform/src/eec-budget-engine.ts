import { PlatformError } from "./errors.js";
import { exactHash } from "./eec-hash.js";

export const BUDGET_EXPR_MAX_DEPTH = 8;
export const BUDGET_EXPR_MAX_NODES = 64;
export const BUDGET_EVAL_MAX_STEPS = 128;

export type BudgetExpr =
  | { kind: "CONST_MONEY"; valueMinor: string; currency: string }
  | { kind: "CONST_NUMBER"; value: string }
  | { kind: "DRIVER"; key: string }
  | { kind: "ADD"; terms: BudgetExpr[] }
  | { kind: "MULTIPLY"; factors: BudgetExpr[] }
  | { kind: "MAX"; values: BudgetExpr[] }
  | { kind: "MIN"; values: BudgetExpr[] }
  | { kind: "ROUND"; value: BudgetExpr; increment: string; mode: "UP" | "DOWN" | "NEAREST" }
  | { kind: "LOOKUP"; tableId: string; input: BudgetExpr }
  | { kind: "IF"; condition: BudgetCondition; then: BudgetExpr; otherwise: BudgetExpr };

export type BudgetCondition =
  | { kind: "COMPARE"; operator: "LT" | "LTE" | "EQ" | "GTE" | "GT"; left: BudgetExpr; right: BudgetExpr }
  | { kind: "IN"; value: BudgetExpr; choices: string[] }
  | { kind: "AND"; conditions: BudgetCondition[] }
  | { kind: "OR"; conditions: BudgetCondition[] };

export type EvaluationTraceStep = Readonly<{
  op: string;
  detail: string;
  value: string;
}>;

export type EvaluationResult<T> = Readonly<{
  value: T;
  trace: readonly EvaluationTraceStep[];
  warnings: readonly string[];
  inputHash: string;
  ruleEditionHash: string;
}>;

type NumberValue = { kind: "NUMBER"; value: bigint; scale: 0 };
type MoneyValue = { kind: "MONEY"; currency: string; minor: bigint };
type Value = NumberValue | MoneyValue;

const SCALE = 1000n;

function parseDecimal(raw: string): bigint {
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new PlatformError("VALIDATION_FAILED", "invalid decimal");
  }
  const negative = raw.startsWith("-");
  const [whole = "0", frac = ""] = (negative ? raw.slice(1) : raw).split(".");
  const padded = (frac + "000").slice(0, 3);
  const value = BigInt(whole) * SCALE + BigInt(padded);
  return negative ? -value : value;
}

function formatScaled(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(3, "0").replace(/0+$/, "");
  return frac ? `${sign}${whole.toString()}.${frac}` : `${sign}${whole.toString()}`;
}

function countNodes(expr: BudgetExpr | BudgetCondition): number {
  if (expr.kind === "CONST_MONEY" || expr.kind === "CONST_NUMBER" || expr.kind === "DRIVER") return 1;
  if (expr.kind === "ADD") return 1 + expr.terms.reduce((sum, item) => sum + countNodes(item), 0);
  if (expr.kind === "MULTIPLY") return 1 + expr.factors.reduce((sum, item) => sum + countNodes(item), 0);
  if (expr.kind === "MAX" || expr.kind === "MIN") return 1 + expr.values.reduce((sum, item) => sum + countNodes(item), 0);
  if (expr.kind === "ROUND") return 1 + countNodes(expr.value);
  if (expr.kind === "LOOKUP") return 1 + countNodes(expr.input);
  if (expr.kind === "IF") return 1 + countNodes(expr.condition) + countNodes(expr.then) + countNodes(expr.otherwise);
  if (expr.kind === "COMPARE") return 1 + countNodes(expr.left) + countNodes(expr.right);
  if (expr.kind === "IN") return 1 + countNodes(expr.value);
  return 1 + expr.conditions.reduce((sum, item) => sum + countNodes(item), 0);
}

function depthOf(expr: BudgetExpr | BudgetCondition): number {
  if (expr.kind === "CONST_MONEY" || expr.kind === "CONST_NUMBER" || expr.kind === "DRIVER") return 1;
  if (expr.kind === "ADD") return 1 + Math.max(...expr.terms.map(depthOf));
  if (expr.kind === "MULTIPLY") return 1 + Math.max(...expr.factors.map(depthOf));
  if (expr.kind === "MAX" || expr.kind === "MIN") return 1 + Math.max(...expr.values.map(depthOf));
  if (expr.kind === "ROUND") return 1 + depthOf(expr.value);
  if (expr.kind === "LOOKUP") return 1 + depthOf(expr.input);
  if (expr.kind === "IF") return 1 + Math.max(depthOf(expr.condition), depthOf(expr.then), depthOf(expr.otherwise));
  if (expr.kind === "COMPARE") return 1 + Math.max(depthOf(expr.left), depthOf(expr.right));
  if (expr.kind === "IN") return 1 + depthOf(expr.value);
  return 1 + Math.max(...expr.conditions.map(depthOf));
}

function asNumber(value: Value, label: string): bigint {
  if (value.kind !== "NUMBER") throw new PlatformError("VALIDATION_FAILED", `${label} must be numeric`);
  return value.value;
}

function display(value: Value): string {
  return value.kind === "MONEY" ? `${value.minor.toString()} ${value.currency}` : formatScaled(value.value);
}

export function evaluateBudgetExpr(
  expr: BudgetExpr,
  input: {
    drivers: Record<string, string>;
    lookups?: Record<string, Record<string, string>>;
    ruleEditionHash: string;
  },
): EvaluationResult<{ kind: "MONEY" | "NUMBER"; currency?: string; minor?: string; value?: string }> {
  if (depthOf(expr) > BUDGET_EXPR_MAX_DEPTH) {
    throw new PlatformError("VALIDATION_FAILED", "rule exceeds maximum depth");
  }
  if (countNodes(expr) > BUDGET_EXPR_MAX_NODES) {
    throw new PlatformError("VALIDATION_FAILED", "rule exceeds maximum node count");
  }
  const trace: EvaluationTraceStep[] = [];
  let steps = 0;
  const warnings: string[] = [];

  const evalExpr = (node: BudgetExpr): Value => {
    steps += 1;
    if (steps > BUDGET_EVAL_MAX_STEPS) {
      throw new PlatformError("VALIDATION_FAILED", "rule exceeded evaluation steps");
    }
    switch (node.kind) {
      case "CONST_MONEY": {
        const value: MoneyValue = { kind: "MONEY", currency: node.currency, minor: BigInt(node.valueMinor) };
        trace.push({ op: "CONST_MONEY", detail: node.currency, value: display(value) });
        return value;
      }
      case "CONST_NUMBER": {
        const value: NumberValue = { kind: "NUMBER", value: parseDecimal(node.value), scale: 0 };
        trace.push({ op: "CONST_NUMBER", detail: node.value, value: display(value) });
        return value;
      }
      case "DRIVER": {
        const raw = input.drivers[node.key];
        if (raw == null) throw new PlatformError("VALIDATION_FAILED", `missing driver ${node.key}`);
        const value: NumberValue = { kind: "NUMBER", value: parseDecimal(raw), scale: 0 };
        trace.push({ op: "DRIVER", detail: node.key, value: display(value) });
        return value;
      }
      case "ADD": {
        const terms = node.terms.map(evalExpr);
        if (terms.some((item) => item.kind === "MONEY")) {
          const money = terms.filter((item): item is MoneyValue => item.kind === "MONEY");
          if (money.length !== terms.length) throw new PlatformError("VALIDATION_FAILED", "cannot add mixed money and numbers");
          const currency = money[0]!.currency;
          if (money.some((item) => item.currency !== currency)) {
            throw new PlatformError("VALIDATION_FAILED", "cross-currency aggregation requires an explicit FX conversion record");
          }
          const value: MoneyValue = { kind: "MONEY", currency, minor: money.reduce((sum, item) => sum + item.minor, 0n) };
          trace.push({ op: "ADD", detail: "money", value: display(value) });
          return value;
        }
        const value: NumberValue = {
          kind: "NUMBER",
          value: terms.reduce((sum, item) => sum + asNumber(item, "add"), 0n),
          scale: 0,
        };
        trace.push({ op: "ADD", detail: "number", value: display(value) });
        return value;
      }
      case "MULTIPLY": {
        const factors = node.factors.map(evalExpr);
        const money = factors.filter((item): item is MoneyValue => item.kind === "MONEY");
        if (money.length > 1) throw new PlatformError("VALIDATION_FAILED", "cannot multiply two money values");
        if (money.length === 1) {
          const quantity = factors.filter((item) => item.kind === "NUMBER").reduce((prod, item) => prod * asNumber(item, "multiply"), 1n);
          const value: MoneyValue = { kind: "MONEY", currency: money[0]!.currency, minor: (money[0]!.minor * quantity) / SCALE };
          trace.push({ op: "MULTIPLY", detail: "money", value: display(value) });
          return value;
        }
        const value: NumberValue = {
          kind: "NUMBER",
          value: factors.reduce((prod, item) => (prod * asNumber(item, "multiply")) / SCALE, SCALE),
          scale: 0,
        };
        trace.push({ op: "MULTIPLY", detail: "number", value: display(value) });
        return value;
      }
      case "MAX":
      case "MIN": {
        const values = node.values.map(evalExpr);
        if (values.some((item) => item.kind === "MONEY")) {
          const money = values.filter((item): item is MoneyValue => item.kind === "MONEY");
          if (money.length !== values.length) throw new PlatformError("VALIDATION_FAILED", "cannot compare mixed types");
          const currency = money[0]!.currency;
          if (money.some((item) => item.currency !== currency)) {
            throw new PlatformError("VALIDATION_FAILED", "cross-currency aggregation requires an explicit FX conversion record");
          }
          const minor = money.reduce((best, item) =>
            node.kind === "MAX" ? (item.minor > best ? item.minor : best) : item.minor < best ? item.minor : best,
          money[0]!.minor);
          const value: MoneyValue = { kind: "MONEY", currency, minor };
          trace.push({ op: node.kind, detail: "money", value: display(value) });
          return value;
        }
        const nums = values.map((item) => asNumber(item, node.kind));
        const picked = nums.reduce((best, item) => (node.kind === "MAX" ? (item > best ? item : best) : item < best ? item : best));
        const value: NumberValue = { kind: "NUMBER", value: picked, scale: 0 };
        trace.push({ op: node.kind, detail: "number", value: display(value) });
        return value;
      }
      case "ROUND": {
        const inner = evalExpr(node.value);
        const increment = parseDecimal(node.increment);
        if (increment <= 0n) throw new PlatformError("VALIDATION_FAILED", "round increment must be positive");
        const raw = inner.kind === "MONEY" ? inner.minor * SCALE : inner.value;
        const quotient = raw / increment;
        const remainder = raw % increment;
        let rounded = quotient * increment;
        if (node.mode === "UP" && remainder !== 0n) rounded += increment;
        if (node.mode === "NEAREST" && remainder * 2n >= increment) rounded += increment;
        if (inner.kind === "MONEY") {
          const value: MoneyValue = { kind: "MONEY", currency: inner.currency, minor: rounded / SCALE };
          trace.push({ op: "ROUND", detail: node.mode, value: display(value) });
          return value;
        }
        const value: NumberValue = { kind: "NUMBER", value: rounded, scale: 0 };
        trace.push({ op: "ROUND", detail: node.mode, value: display(value) });
        return value;
      }
      case "LOOKUP": {
        const key = formatScaled(asNumber(evalExpr(node.input), "lookup"));
        const table = input.lookups?.[node.tableId];
        if (!table || table[key] == null) throw new PlatformError("VALIDATION_FAILED", `missing lookup ${node.tableId}:${key}`);
        const value: NumberValue = { kind: "NUMBER", value: parseDecimal(table[key]!), scale: 0 };
        trace.push({ op: "LOOKUP", detail: `${node.tableId}:${key}`, value: display(value) });
        return value;
      }
      case "IF": {
        const matched = evalCondition(node.condition);
        const value = evalExpr(matched ? node.then : node.otherwise);
        trace.push({ op: "IF", detail: matched ? "then" : "otherwise", value: display(value) });
        return value;
      }
      default:
        throw new PlatformError("VALIDATION_FAILED", "unknown operator");
    }
  };

  const evalCondition = (condition: BudgetCondition): boolean => {
    steps += 1;
    if (steps > BUDGET_EVAL_MAX_STEPS) throw new PlatformError("VALIDATION_FAILED", "rule exceeded evaluation steps");
    if (condition.kind === "AND") return condition.conditions.every(evalCondition);
    if (condition.kind === "OR") return condition.conditions.some(evalCondition);
    if (condition.kind === "IN") {
      return condition.choices.includes(formatScaled(asNumber(evalExpr(condition.value), "in")));
    }
    const left = evalExpr(condition.left);
    const right = evalExpr(condition.right);
    const compare = (a: bigint, b: bigint) =>
      condition.operator === "LT"
        ? a < b
        : condition.operator === "LTE"
          ? a <= b
          : condition.operator === "EQ"
            ? a === b
            : condition.operator === "GTE"
              ? a >= b
              : a > b;
    if (left.kind === "MONEY" || right.kind === "MONEY") {
      if (left.kind !== "MONEY" || right.kind !== "MONEY") throw new PlatformError("VALIDATION_FAILED", "cannot compare mixed types");
      if (left.currency !== right.currency) throw new PlatformError("VALIDATION_FAILED", "cross-currency aggregation requires an explicit FX conversion record");
      return compare(left.minor, right.minor);
    }
    return compare(left.value, right.value);
  };

  const value = evalExpr(expr);
  const dto =
    value.kind === "MONEY"
      ? { kind: "MONEY" as const, currency: value.currency, minor: value.minor.toString() }
      : { kind: "NUMBER" as const, value: formatScaled(value.value) };
  return {
    value: dto,
    trace,
    warnings,
    inputHash: exactHash({ drivers: input.drivers, lookups: input.lookups ?? {}, expr }),
    ruleEditionHash: input.ruleEditionHash,
  };
}

export function perHeadMoney(unitMinor: string, currency: string, guests: string): EvaluationResult<{ kind: "MONEY"; currency: string; minor: string }> {
  return evaluateBudgetExpr(
    {
      kind: "MULTIPLY",
      factors: [
        { kind: "CONST_MONEY", valueMinor: unitMinor, currency },
        { kind: "DRIVER", key: "guest.target_count" },
      ],
    },
    { drivers: { "guest.target_count": guests }, ruleEditionHash: exactHash({ unitMinor, currency }) },
  ) as EvaluationResult<{ kind: "MONEY"; currency: string; minor: string }>;
}
