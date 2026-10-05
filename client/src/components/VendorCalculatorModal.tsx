import { useEffect, useMemo, useState } from "react";
import type { Currency, Vendor, VendorCategory } from "../types";
import Modal from "./Modal";
import * as api from "../api";
import { convertCurrency, DEFAULT_RATES, extrasTotal, formatHome, formatMoney } from "../money";

type Props = {
  vendors: Vendor[];
  categories: VendorCategory[];
  onClose: () => void;
};

function vendorTotal(v: Vendor) {
  return v.cost + extrasTotal(v.extras);
}

// A scratchpad for "what if we went with these?" — tick vendors to see what
// they'd add up to. Nothing here is saved or touches the budget.
export default function VendorCalculatorModal({ vendors, categories, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [homeCurrency, setHomeCurrency] = useState<Currency>("SGD");
  const [rates, setRates] = useState<Record<Currency, number>>(DEFAULT_RATES);

  useEffect(() => {
    api.getBudget().then((b) => setHomeCurrency(b.homeCurrency)).catch(() => {});
    api
      .getExchangeRate()
      .then((rate) => setRates(rate.rates))
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
  const currenciesUsed = Array.from(new Set(chosen.map((v) => v.currency)));
  const totalHome = chosen.reduce((sum, v) => sum + convertCurrency(vendorTotal(v), v.currency, homeCurrency, rates), 0);

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
                    <span className="calculator-name">{v.name}</span>
                    <span className="calculator-amount">{formatMoney(vendorTotal(v), v.currency)}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="calculator-summary">
        {currenciesUsed.length > 1 && (
          <div className="calculator-summary-row muted">
            <span>By currency</span>
            <span>
              {currenciesUsed.map((c) => formatMoney(byCurrency(c), c)).join(" + ")}
            </span>
          </div>
        )}
        <div className="calculator-summary-row total">
          <span>Total</span>
          <span>{formatHome(totalHome, homeCurrency)}</span>
        </div>
        <div className="calculator-summary-row calculator-selected">
          <span>{chosen.length} selected</span>
          {chosen.length > 0 && (
            <button type="button" className="link-btn" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
