import { useEffect, useState } from "react";
import type { BudgetCategory, Currency, Vendor, VendorCategory } from "../types";
import * as api from "../api";
import VendorsBoard from "../components/VendorsBoard";
import VendorFormModal from "../components/VendorFormModal";
import { SECTION_COLORS } from "../palette";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    Promise.all([api.getVendors(), api.getVendorCategories(), api.getBudgetCategories()])
      .then(([v, c, b]) => {
        setVendors(v);
        setCategories(c);
        setBudgetCategories(b);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: {
    name: string;
    category: string;
    contact: string;
    cost: number;
    status: string;
    notes: string;
    currency: Currency;
    budgetCategory: string;
    downpayment: number;
  }) {
    try {
      const created = await api.createVendor(data);
      setVendors((prev) => [created, ...prev]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdate(id: string, patch: Partial<Pick<Vendor, "name" | "category" | "contact" | "cost" | "status" | "notes" | "currency" | "budgetCategory" | "downpayment">>) {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    try {
      await api.updateVendor(id, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    setVendors((prev) => prev.filter((v) => v.id !== id));
    try {
      await api.deleteVendor(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateCategory(title: string, color?: string) {
    const finalColor = color || SECTION_COLORS[categories.length % SECTION_COLORS.length].value;
    const created = await api.createVendorCategory(title, finalColor);
    setCategories((prev) => [created, ...prev]);
    return created;
  }

  async function handleUpdateCategory(id: string, patch: Partial<Pick<VendorCategory, "title" | "color">>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      await api.updateVendorCategory(id, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.deleteVendorCategory(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <p className="empty-hint">Loading…</p>;

  return (
    <div className="vendors-page">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <div className="board-region-header">
        <h2 className="board-region-title">Vendors</h2>
      </div>

      <p className="page-subtitle">
        Keep track of every vendor — venue, catering, photography, and more — along with their contact
        info, cost, and booking status. Booked and paid vendors show up on your budget automatically.
      </p>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn primary btn-add-primary" onClick={() => setShowAddModal(true)}>
          + Add vendor
        </button>
      </div>

      <VendorsBoard
        vendors={vendors}
        categories={categories}
        budgetCategories={budgetCategories}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {showAddModal && (
        <VendorFormModal
          categories={categories}
          budgetCategories={budgetCategories}
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
          onCreateCategory={handleCreateCategory}
        />
      )}
    </div>
  );
}
