import { useEffect, useState } from "react";
import type { Vendor } from "../types";
import * as api from "../api";
import VendorCard from "../components/VendorCard";
import VendorFormModal from "../components/VendorFormModal";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    api
      .getVendors()
      .then(setVendors)
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
  }) {
    try {
      const created = await api.createVendor(data);
      setVendors((prev) => [created, ...prev]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdate(id: string, patch: Partial<Pick<Vendor, "name" | "category" | "contact" | "cost" | "status" | "notes">>) {
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
        info, cost, and booking status.
      </p>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn primary" onClick={() => setShowAddModal(true)}>
          + Add vendor
        </button>
      </div>

      {vendors.length === 0 ? (
        <p className="empty-hint">No vendors yet — add your first one above.</p>
      ) : (
        <div className="card-list">
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onUpdate={(patch) => handleUpdate(vendor.id, patch)}
              onDelete={() => handleDelete(vendor.id)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <VendorFormModal onClose={() => setShowAddModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
