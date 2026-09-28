import { useEffect, useMemo, useState } from "react";
import type { Currency, Vendor, VendorCategory } from "../types";
import Modal from "./Modal";
import * as api from "../api";
import { extrasTotal, formatMoney, formatSgd, toSgd } from "../money";
import { VENDOR_STATUSES } from "../constants";

type Props = {
  vendors: Vendor[];
  categories: VendorCategory[];
  onClose: () => void;
};

const STATUS_LABEL: Record<string, string> = Object.fromEntries(VENDOR_STATUSES.map((s) => [s.value, s.label]));

function vendorTotal(v: Vendor) {
  return v.cost + extrasTotal(v.extras);
}

// A scratchpad for "what if we went with these?" — tick vendors to see what
// they'd add up to. Nothing here is saved or touches the budget.
export default function VendorCalculatorModal({ vendors, categories, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [myrToSgd, setMyrToSgd] = useState(0.31);

  useEffect(() => {
    api
      .getExchangeRate()
      .then((rate) => setMyrToSgd(rate.myrToSgd))
      .catch(() => {});
  }, []);

  const groups = useMemo(() => {
    const known = new Set(categories.map((c) => c.title));
    const list = categories
      .map((c) => ({ title: c.title, vendors: vendors.filter((v) => v.category === c.title) }))
      .filter((g) => g.vendors.length > 0);
    const other = vendors.filter((v) => !v.category || !known.has(v.category));
    if (other.length > 0) list.push({ title: "Uncategorized", vendors: other });
    return list;
  }, [vendors, categories]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  const chosen = vendors.filter((v) => selected.has(v.id));
  const byCurrency = (currency: Currency) =>
    chosen.filter((v) => v.currency === currency).reduce((sum, v) => sum + vendorTotal(v), 0);
  const myrSum = byCurrency("MYR");
  const sgdSum = byCurrency("SGD");
  const totalSgd = chosen.reduce((sum, v) => sum + toSgd(vendorTotal(v), v.currency, myrToSgd), 0);
  const downpaymentsSgd = chosen.reduce((sum, v) => sum + toSgd(v.downpayment || 0, v.currency, myrToSgd), 0);

  return (
    <Modal title="Cost calculator" onClose={onClose} className="calculator-modal">
      <p className="page-subtitle calculator-intro">
        Tick the vendors you're considering to see what they'd add up to. This is just an estimate — nothing is saved
        or added to your budget.
      </p>

      {vendors.length === 0 ? (
        <p className="empty-hint">Add some vendors first.</p>
      ) : (
        <div className="calculator-list">
          {groups.map((group) => {
            const ids = group.vendors.map((v) => v.id);
            const allOn = ids.every((id) => selected.has(id));
            return (
              <div className="calculator-group" key={group.title}>
                <label className="calculator-group-header">
                  <input type="checkbox" checked={allOn} onChange={() => toggleGroup(ids)} />
                  <span>{group.title}</span>
                </label>
                {group.vendors.map((v) => (
                  <label className={`calculator-row ${selected.has(v.id) ? "on" : ""}`} key={v.id}>
                    <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                    <span className="calculator-name">
                      {v.name}
                      <span className={`status-pill status-${v.status}`}>{STATUS_LABEL[v.status] ?? v.status}</span>
                    </span>
                    <span className="calculator-amount">{formatMoney(vendorTotal(v), v.currency)}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="calculator-summary">
        <div className="calculator-summary-row">
          <span>
            {chosen.length} {chosen.length === 1 ? "vendor" : "vendors"} selected
          </span>
          {chosen.length > 0 && (
            <button type="button" className="link-btn" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          )}
        </div>
        {myrSum > 0 && sgdSum > 0 && (
          <div className="calculator-summary-row muted">
            <span>In RM / in S$</span>
            <span>
              {formatMoney(myrSum, "MYR")} + {formatMoney(sgdSum, "SGD")}
            </span>
          </div>
        )}
        {downpaymentsSgd > 0 && (
          <div className="calculator-summary-row muted">
            <span>Downpayments already paid</span>
            <span>{formatSgd(downpaymentsSgd)}</span>
          </div>
        )}
        <div className="calculator-summary-row total">
          <span>Estimated total</span>
          <span>
            {formatSgd(totalSgd)}
            {myrSum > 0 && <span className="calculator-alt"> ≈ {formatMoney(totalSgd / myrToSgd, "MYR")}</span>}
          </span>
        </div>
      </div>
    </Modal>
  );
}
