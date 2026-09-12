import { useEffect, useState } from "react";
import type { InspirationCategory, InspirationItem } from "../types";
import { getYouTubeEmbedUrl, getVimeoEmbedUrl, getInstagramEmbedUrl, getHostname } from "../inspirationUtils";
import { IconClose, IconEdit, IconExternalLink, IconHeart, IconTrash } from "./Icons";
import Dropdown from "./Dropdown";
import ImageLightbox from "./ImageLightbox";
import * as api from "../api";

type Props = {
  item: InspirationItem;
  categories: InspirationCategory[];
  onToggleApproved: () => void;
  onChangeCategory: (categoryId: string | null) => void;
  onDelete: () => void;
};

export default function InspirationCard({ item, categories, onToggleApproved, onChangeCategory, onDelete }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const youtubeEmbed = getYouTubeEmbedUrl(item.url);
  const vimeoEmbed = getVimeoEmbedUrl(item.url);
  const instagramEmbed = getInstagramEmbedUrl(item.url);
  const videoEmbedUrl = youtubeEmbed || vimeoEmbed;

  // The direct URL failed to load as an image — try resolving a preview image
  // (e.g. Pinterest pin links, which are pages, not direct image files).
  useEffect(() => {
    if (!imgFailed || videoEmbedUrl || instagramEmbed || resolvedUrl || resolveFailed) return;
    let cancelled = false;
    setResolving(true);
    api
      .resolvePreviewImage(item.url)
      .then((imageUrl) => {
        if (cancelled) return;
        if (imageUrl) setResolvedUrl(imageUrl);
        else setResolveFailed(true);
      })
      .catch(() => {
        if (!cancelled) setResolveFailed(true);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [imgFailed, videoEmbedUrl, instagramEmbed, resolvedUrl, resolveFailed, item.url]);

  function handleImageError() {
    if (resolvedUrl) {
      // the resolved preview image itself failed to load
      setResolvedUrl(null);
      setResolveFailed(true);
    } else {
      setImgFailed(true);
    }
  }

  const displayImageUrl = imgFailed ? resolvedUrl : item.url;
  const isPlainImage = !videoEmbedUrl && !instagramEmbed && !!displayImageUrl;

  const categoryOptions = [
    { value: "", label: "No category" },
    ...categories.map((c) => ({ value: c.id, label: c.title })),
  ];

  function applyCategory(value: string) {
    onChangeCategory(value || null);
    setEditingCategory(false);
  }

  if (isPlainImage) {
    return (
      <div className="pin-card">
        <div className="pin-image-wrap">
          <img
            src={displayImageUrl ?? undefined}
            alt={item.caption || ""}
            onError={handleImageError}
            onClick={() => setShowLightbox(true)}
            loading="lazy"
          />

          {showLightbox && displayImageUrl && (
            <ImageLightbox src={displayImageUrl} alt={item.caption} onClose={() => setShowLightbox(false)} />
          )}

          <div className={`pin-overlay ${editingCategory ? "force-visible" : ""}`}>
            <button
              className={`pin-save-btn ${item.approved ? "saved" : ""}`}
              onClick={onToggleApproved}
            >
              <IconHeart filled={item.approved} size={14} />
              {item.approved ? "Saved" : "Save"}
            </button>

            <div className="pin-overlay-bottom">
              {editingCategory ? (
                <div className="pin-category-edit">
                  <Dropdown
                    className="pin-category-select"
                    value={item.categoryId ?? ""}
                    onChange={applyCategory}
                    placeholder="No category"
                    options={categoryOptions}
                  />
                  <button className="pin-round-btn" title="Close" onClick={() => setEditingCategory(false)}>
                    <IconClose size={11} />
                  </button>
                </div>
              ) : confirmDelete ? (
                <>
                  <button className="pin-round-btn" title="Confirm delete" onClick={onDelete}>
                    <IconTrash size={13} />
                  </button>
                  <button className="pin-round-btn" title="Cancel" onClick={() => setConfirmDelete(false)}>
                    <IconClose size={11} />
                  </button>
                </>
              ) : (
                <>
                  <button className="pin-round-btn" title="Change category" onClick={() => setEditingCategory(true)}>
                    <IconEdit size={13} />
                  </button>
                  <button className="pin-round-btn" title="Remove" onClick={() => setConfirmDelete(true)}>
                    <IconTrash size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {item.caption && <p className="pin-caption">{item.caption}</p>}
      </div>
    );
  }

  return (
    <div className="inspiration-card">
      <div className="inspiration-media">
        {videoEmbedUrl ? (
          <div className="inspiration-video-frame">
            <iframe
              src={videoEmbedUrl}
              title={item.caption || "Inspiration video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : instagramEmbed ? (
          <div className="inspiration-instagram-frame">
            <iframe
              src={instagramEmbed}
              title={item.caption || "Inspiration from Instagram"}
              scrolling="yes"
            />
          </div>
        ) : resolving ? (
          <div className="inspiration-resolving">
            <span className="empty-hint">Loading preview…</span>
          </div>
        ) : (
          <a className="inspiration-link-fallback" href={item.url} target="_blank" rel="noreferrer">
            <IconExternalLink size={20} />
            <span>{getHostname(item.url)}</span>
          </a>
        )}
      </div>

      <div className="inspiration-footer">
        {editingCategory ? (
          <div className="inspiration-category-edit">
            <Dropdown
              value={item.categoryId ?? ""}
              onChange={applyCategory}
              placeholder="No category"
              options={categoryOptions}
            />
            <button className="icon-btn" title="Close" onClick={() => setEditingCategory(false)}>
              <IconClose />
            </button>
          </div>
        ) : (
          <>
            {item.caption ? <p className="inspiration-caption">{item.caption}</p> : <span />}
            <div className="inspiration-actions">
              <button className="icon-btn" title="Change category" onClick={() => setEditingCategory(true)}>
                <IconEdit />
              </button>
              <button
                className={`icon-btn ${item.approved ? "approved" : ""}`}
                title={item.approved ? "Approved" : "Mark as approved"}
                onClick={onToggleApproved}
              >
                <IconHeart filled={item.approved} />
              </button>
              {confirmDelete ? (
                <span className="confirm-row">
                  <button className="btn small danger" onClick={onDelete}>Yes</button>
                  <button className="btn small ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </span>
              ) : (
                <button className="icon-btn danger" title="Remove" onClick={() => setConfirmDelete(true)}>
                  <IconTrash />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
