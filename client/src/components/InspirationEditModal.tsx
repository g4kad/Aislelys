import { useState } from "react";
import type { InspirationCategory, InspirationItem } from "../types";
import Modal from "./Modal";
import Dropdown from "./Dropdown";
import { useIsMobile } from "../useIsMobile";

type Props = {
  item: InspirationItem;
  categories: InspirationCategory[];
  onClose: () => void;
  onSave: (patch: { caption: string; categoryId: string | null }) => void;
  onCreateCategory: (title: string) => Promise<InspirationCategory>;
};

export default function InspirationEditModal({ item, categories, onClose, onSave, onCreateCategory }: Props) {
  const isMobile = useIsMobile();
  const [caption, setCaption] = useState(item.caption);
  const [categoryId, setCategoryId] = useState(item.categoryId ?? "");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");

  async function handleAddCategory() {
    if (!newCategoryTitle.trim()) return;
    const category = await onCreateCategory(newCategoryTitle.trim());
    setCategoryId(category.id);
    setNewCategoryTitle("");
    setCreatingCategory(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ caption: caption.trim(), categoryId: categoryId || null });
    onClose();
  }

  return (
    <Modal title="Edit inspiration" onClose={onClose}>
      <form className="event-form" onSubmit={handleSubmit}>
        <label>
          Caption
          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            autoFocus={!isMobile}
          />
        </label>

        <label>
          Category
          <Dropdown
            value={categoryId}
            onChange={setCategoryId}
            placeholder="No category"
            options={[
              { value: "", label: "No category" },
              ...categories.map((cat) => ({ value: cat.id, label: cat.title })),
            ]}
          />
        </label>

        {!creatingCategory ? (
          <button type="button" className="link-btn" onClick={() => setCreatingCategory(true)}>
            + Add category
          </button>
        ) : (
          <div className="inline-create-box">
            <input
              type="text"
              placeholder="Category name…"
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              autoFocus={!isMobile}
            />
            <div className="btn-row">
              <button type="button" className="btn small" onClick={handleAddCategory}>
                Add category
              </button>
              <button type="button" className="btn small ghost" onClick={() => setCreatingCategory(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="btn-row">
          <button type="submit" className="btn primary">Save</button>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
