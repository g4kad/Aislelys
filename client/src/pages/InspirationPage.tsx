import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InspirationCategory, InspirationItem } from "../types";
import * as api from "../api";
import InspirationCard from "../components/InspirationCard";
import InspirationFormModal from "../components/InspirationFormModal";
import ImageLightbox, { type LightboxSlide } from "../components/ImageLightbox";
import Dropdown from "../components/Dropdown";
import { IconCheck, IconClose, IconTrash } from "../components/Icons";
import { useIsMobile } from "../useIsMobile";

export default function InspirationPage() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [categories, setCategories] = useState<InspirationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);
  const addCategoryRef = useRef<HTMLFormElement>(null);
  const isMobile = useIsMobile(480);
  // image URL each card is actually displaying (after any preview resolving),
  // keyed by item id — only plain images go in the viewer
  const [imageSrcs, setImageSrcs] = useState<Record<string, string>>({});
  const [lightboxItemId, setLightboxItemId] = useState<string | null>(null);

  const handleImageReady = useCallback((id: string, src: string | null) => {
    setImageSrcs((prev) => {
      if ((prev[id] ?? null) === src) return prev;
      const next = { ...prev };
      if (src) next[id] = src;
      else delete next[id];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!showAddCategory) return;
    function handlePointerDown(e: PointerEvent) {
      if (addCategoryRef.current && !addCategoryRef.current.contains(e.target as Node)) {
        setShowAddCategory(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowAddCategory(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showAddCategory]);

  useEffect(() => {
    Promise.all([api.getInspirationItems(), api.getInspirationCategories()])
      .then(([i, c]) => {
        setItems(i);
        setCategories(c);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (selectedCategoryId !== null && i.categoryId !== selectedCategoryId) return false;
      if (approvedOnly && !i.approved) return false;
      return true;
    });
  }, [items, selectedCategoryId, approvedOnly]);

  const lightboxSlides = useMemo<LightboxSlide[]>(
    () =>
      filteredItems
        .filter((i) => imageSrcs[i.id])
        .map((i) => ({ id: i.id, src: imageSrcs[i.id], caption: i.caption })),
    [filteredItems, imageSrcs]
  );
  const lightboxIndex = lightboxSlides.findIndex((s) => s.id === lightboxItemId);

  const approvedCountFor = useMemo(() => {
    return (categoryId: string | null) =>
      items.filter((i) => (categoryId === null ? true : i.categoryId === categoryId) && i.approved).length;
  }, [items]);

  const totalCountFor = useMemo(() => {
    return (categoryId: string | null) =>
      items.filter((i) => (categoryId === null ? true : i.categoryId === categoryId)).length;
  }, [items]);

  const categoryBadgeCountFor = approvedOnly ? approvedCountFor : totalCountFor;

  async function handleAddItem(url: string, caption: string, categoryId: string | null) {
    try {
      const created = await api.createInspirationItem(url, caption, categoryId);
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryTitle.trim()) return;
    try {
      const created = await api.createInspirationCategory(newCategoryTitle.trim());
      setCategories((prev) => [...prev, created]);
      setNewCategoryTitle("");
      setShowAddCategory(false);
      setSelectedCategoryId(created.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateCategory(title: string): Promise<InspirationCategory> {
    const created = await api.createInspirationCategory(title);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  async function handleDeleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setItems((prev) => prev.map((i) => (i.categoryId === id ? { ...i, categoryId: null } : i)));
    if (selectedCategoryId === id) setSelectedCategoryId(null);
    setConfirmDeleteCategoryId(null);
    try {
      await api.deleteInspirationCategory(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleApproved(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const approved = !target.approved;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, approved } : i)));
    try {
      await api.updateInspirationItem(id, { approved });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.deleteInspirationItem(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleChangeItemCategory(id: string, categoryId: string | null) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, categoryId } : i)));
    try {
      await api.updateInspirationItem(id, { categoryId });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <p className="empty-hint">Loading…</p>;

  return (
    <div className="inspiration-page">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <div className="guest-list-header">
        <h2 className="board-region-title">Inspiration</h2>
        <button
          type="button"
          className={`guest-total-pill approved-filter-pill ${approvedOnly ? "active" : ""}`}
          onClick={() => setApprovedOnly((v) => !v)}
          aria-pressed={approvedOnly}
        >
          {approvedCountFor(selectedCategoryId)} approved
        </button>
      </div>

      <p className="page-subtitle">
        Paste a link to an image or video — from Pinterest, Instagram, YouTube, or anywhere else — to save it
        here for inspiration or approval.
      </p>

      {isMobile ? (
        <div className="category-mobile-bar">
          {confirmDeleteCategoryId && confirmDeleteCategoryId === selectedCategoryId ? (
            <span className="confirm-row category-mobile-confirm">
              Delete this category?
              <button className="btn small danger" onClick={() => handleDeleteCategory(confirmDeleteCategoryId)}>
                Yes
              </button>
              <button className="btn small ghost" onClick={() => setConfirmDeleteCategoryId(null)}>
                Cancel
              </button>
            </span>
          ) : (
            <>
              <Dropdown
                className="category-mobile-select"
                value={selectedCategoryId ?? ""}
                onChange={(v) => setSelectedCategoryId(v || null)}
                options={[
                  { value: "", label: "All", badge: categoryBadgeCountFor(null) },
                  ...categories.map((cat) => ({
                    value: cat.id,
                    label: cat.title,
                    badge: categoryBadgeCountFor(cat.id),
                  })),
                ]}
              />
              {selectedCategoryId && (
                <button
                  className="icon-btn danger category-mobile-delete"
                  title="Delete category"
                  onClick={() => setConfirmDeleteCategoryId(selectedCategoryId)}
                >
                  <IconTrash size={14} />
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="category-tabs">
          <span className={`category-tab-group ${selectedCategoryId === null ? "active" : ""}`}>
            <button className="category-tab" onClick={() => setSelectedCategoryId(null)}>
              All <span className="category-tab-count">{categoryBadgeCountFor(null)}</span>
            </button>
          </span>

          {categories.map((cat) => (
            <span
              key={cat.id}
              className={`category-tab-group ${selectedCategoryId === cat.id ? "active" : ""}`}
            >
              <button className="category-tab" onClick={() => setSelectedCategoryId(cat.id)}>
                {cat.title} <span className="category-tab-count">{categoryBadgeCountFor(cat.id)}</span>
              </button>
              {confirmDeleteCategoryId === cat.id ? (
                <span className="category-tab-confirm">
                  <button title="Confirm delete" onClick={() => handleDeleteCategory(cat.id)}>
                    <IconCheck size={11} />
                  </button>
                  <button title="Cancel" onClick={() => setConfirmDeleteCategoryId(null)}>
                    <IconClose size={11} />
                  </button>
                </span>
              ) : (
                <button
                  className="category-tab-remove"
                  title={`Delete ${cat.title}`}
                  onClick={() => setConfirmDeleteCategoryId(cat.id)}
                >
                  <IconClose size={10} />
                </button>
              )}
            </span>
          ))}

          {showAddCategory ? (
            <form className="category-add-inline" ref={addCategoryRef} onSubmit={handleAddCategory}>
              <input
                type="text"
                placeholder="Category name…"
                value={newCategoryTitle}
                onChange={(e) => setNewCategoryTitle(e.target.value)}
                autoFocus
              />
              <button className="btn small primary" type="submit">Add</button>
              <button className="btn small ghost" type="button" onClick={() => setShowAddCategory(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <button className="category-tab-add" onClick={() => setShowAddCategory(true)}>
              + Category
            </button>
          )}
        </div>
      )}

      <div className="inspiration-add-row">
        <button className="btn primary small btn-add-primary" onClick={() => setShowAddModal(true)}>
          + Add
        </button>
      </div>

      {showAddModal && (
        <InspirationFormModal
          categories={categories}
          initialCategoryId={selectedCategoryId}
          onClose={() => setShowAddModal(false)}
          onCreate={handleAddItem}
          onCreateCategory={handleCreateCategory}
        />
      )}

      {filteredItems.length === 0 ? (
        <p className="empty-hint">
          {items.length === 0
            ? "No inspiration saved yet — paste a link above to get started."
            : approvedOnly
            ? "No approved items here yet."
            : "No items in this category yet."}
        </p>
      ) : (
        <div className="inspiration-grid">
          {filteredItems.map((item) => (
            <InspirationCard
              key={item.id}
              item={item}
              categories={categories}
              onToggleApproved={() => handleToggleApproved(item.id)}
              onChangeCategory={(categoryId) => handleChangeItemCategory(item.id, categoryId)}
              onDelete={() => handleDelete(item.id)}
              onImageReady={(src) => handleImageReady(item.id, src)}
              onOpenImage={() => setLightboxItemId(item.id)}
            />
          ))}
        </div>
      )}

      {lightboxIndex >= 0 && (
        <ImageLightbox
          slides={lightboxSlides}
          index={lightboxIndex}
          onIndexChange={(i) => setLightboxItemId(lightboxSlides[i].id)}
          onClose={() => setLightboxItemId(null)}
        />
      )}
    </div>
  );
}
