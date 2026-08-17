import { useState } from "react";
import type { InspirationCategory } from "../types";
import Modal from "./Modal";
import Dropdown from "./Dropdown";

type Props = {
  categories: InspirationCategory[];
  initialCategoryId: string | null;
  onClose: () => void;
  onCreate: (url: string, caption: string, categoryId: string | null) => void;
  onCreateCategory: (title: string) => Promise<InspirationCategory>;
};

export default function InspirationFormModal({
  categories,
  initialCategoryId,
  onClose,
  onCreate,
  onCreateCategory,
}: Props) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
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
    if (!url.trim()) return;
    onCreate(url.trim(), caption.trim(), categoryId || null);
    onClose();
  }

  return (
    <Modal title="Add inspiration" onClose={onClose}>
      <form className="event-form" onSubmit={handleSubmit}>
        <label>
          Link
          <input
            type="url"
            placeholder="Paste an image or video link…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            required
          />
        </label>

        <label>
          Caption
          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
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
              autoFocus
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
          <button type="submit" className="btn primary">+ Add</button>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
