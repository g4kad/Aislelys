import type { Currency, ExtraCost } from "../types";
import { formatMoney, extrasTotal } from "../money";
import { IconTrash } from "./Icons";

type EditorProps = {
  extras: ExtraCost[];
  onChange: (extras: ExtraCost[]) => void;
};

// Named add-ons on top of a base cost, e.g. extra chairs on a venue package.
export function ExtraCostsEditor({ extras, onChange }: EditorProps) {
  function update(id: string, patch: Partial<ExtraCost>) {
    onChange(extras.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  return (
    <div className="extras-editor">
      {extras.length > 0 && <span className="view-label">Extra expenses</span>}
      {extras.map((extra) => (
        <div className="extras-row" key={extra.id}>
          <input
            type="text"
            className="extras-label"
            placeholder="e.g. Extra chairs"
            value={extra.label}
            onChange={(e) => update(extra.id, { label: e.target.value })}
          />
          <input
            type="number"
            className="extras-amount"
            min={0}
            placeholder="0"
            value={extra.amount || ""}
            onChange={(e) => update(extra.id, { amount: Math.max(0, Number(e.target.value) || 0) })}
          />
          <button
            type="button"
            className="icon-btn danger"
            title="Remove"
            onClick={() => onChange(extras.filter((e) => e.id !== extra.id))}
          >
            <IconTrash size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="link-btn"
        onClick={() => onChange([...extras, { id: crypto.randomUUID(), label: "", amount: 0 }])}
      >
        + Add extra expenses
      </button>
    </div>
  );
}

type BreakdownProps = {
  baseLabel: string;
  base: number;
  extras: ExtraCost[];
  currency: Currency;
};

// Read-only cost breakdown: base, each extra, then the total.
export function CostBreakdown({ baseLabel, base, extras, currency }: BreakdownProps) {
  if (extras.length === 0) return <p className="notes-text">{formatMoney(base, currency)}</p>;
  return (
    <div className="cost-breakdown">
      <div className="cost-breakdown-row">
        <span>{baseLabel}</span>
        <span>{formatMoney(base, currency)}</span>
      </div>
      {extras.map((e) => (
        <div className="cost-breakdown-row" key={e.id}>
          <span>+ {e.label || "Extra"}</span>
          <span>{formatMoney(e.amount, currency)}</span>
        </div>
      ))}
      <div className="cost-breakdown-row total">
        <span>Total</span>
        <span>{formatMoney(base + extrasTotal(extras), currency)}</span>
      </div>
    </div>
  );
}
