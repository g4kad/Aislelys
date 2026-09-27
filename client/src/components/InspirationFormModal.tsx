import { useState } from "react";
import type { InspirationCategory } from "../types";
import Modal from "./Modal";
import Dropdown from "./Dropdown";
import * as api from "../api";
import { useIsMobile } from "../useIsMobile";

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
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  function switchMode(next: "link" | "upload") {
    setMode(next);
    setUrl("");
    setPreviewUrl("");
    setUploadError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploadedUrl = await api.uploadImage(file);
      setUrl(uploadedUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

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
        <div className="btn-row inspiration-mode-toggle">
          <button
            type="button"
            className={`btn small ${mode === "link" ? "primary" : "ghost"}`}
            onClick={() => switchMode("link")}
          >
            Paste a link
          </button>
          <button
            type="button"
            className={`btn small ${mode === "upload" ? "primary" : "ghost"}`}
            onClick={() => switchMode("upload")}
          >
            Upload photo
          </button>
        </div>

        {mode === "link" ? (
          <label>
            Link
            <input
              type="url"
              placeholder="Paste an image or video link…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus={!isMobile}
              required
            />
          </label>
        ) : (
          <label>
            Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required={!url}
            />
            {uploading && <p className="empty-hint">Uploading…</p>}
            {uploadError && <p className="empty-hint">{uploadError}</p>}
            {previewUrl && !uploading && (
              <img className="inspiration-upload-preview" src={previewUrl} alt="Selected preview" />
            )}
          </label>
        )}

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
          <button type="submit" className="btn primary" disabled={uploading || !url}>+ Add</button>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
