import { useEffect, useState } from "react";
import type { InspirationItem } from "../types";
import { getYouTubeEmbedUrl, getVimeoEmbedUrl, getInstagramEmbedUrl, getTikTokEmbedUrl, getHostname } from "../inspirationUtils";
import { IconClose, IconEdit, IconExternalLink, IconHeart, IconTrash } from "./Icons";
import * as api from "../api";

type Props = {
  item: InspirationItem;
  onToggleApproved: () => void;
  onEdit: () => void; // opens the caption/category pop-up
  onDelete: () => void;
  // tells the page which image (if any) this card is showing, so the viewer
  // can page through them
  onImageReady: (src: string | null) => void;
  onOpenImage: () => void;
};

export default function InspirationCard({
  item,
  onToggleApproved,
  onEdit,
  onDelete,
  onImageReady,
  onOpenImage,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolvedEmbedUrl, setResolvedEmbedUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const youtubeEmbed = getYouTubeEmbedUrl(item.url);
  const vimeoEmbed = getVimeoEmbedUrl(item.url);
  const instagramEmbed = getInstagramEmbedUrl(item.url);
  // Short TikTok share links (vm.tiktok.com, tiktok.com/t/...) — the kind
  // TikTok's own mobile share sheet hands out — don't carry a numeric video
  // id we can read directly, so getTikTokEmbedUrl returns null for those.
  // resolvedEmbedUrl fills in once the server resolves it via oEmbed below.
  const tiktokEmbed = getTikTokEmbedUrl(item.url) || resolvedEmbedUrl;
  const videoEmbedUrl = youtubeEmbed || vimeoEmbed;

  // The direct URL failed to load as an image — try resolving a preview image
  // (e.g. Pinterest pin links, which are pages, not direct image files) or,
  // for TikTok short links, a playable embed URL.
  useEffect(() => {
    if (!imgFailed || videoEmbedUrl || instagramEmbed || tiktokEmbed || resolvedUrl || resolveFailed) return;
    let cancelled = false;
    setResolving(true);
    api
      .resolvePreviewImage(item.url)
      .then((data) => {
        if (cancelled) return;
        if (data.embedUrl) setResolvedEmbedUrl(data.embedUrl);
        else if (data.imageUrl) setResolvedUrl(data.imageUrl);
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
  }, [imgFailed, videoEmbedUrl, instagramEmbed, tiktokEmbed, resolvedUrl, resolveFailed, item.url]);

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
  const isPlainImage = !videoEmbedUrl && !instagramEmbed && !tiktokEmbed && !!displayImageUrl;
  const reportedImage = isPlainImage ? displayImageUrl : null;

  useEffect(() => {
    onImageReady(reportedImage);
  }, [reportedImage, onImageReady]);

  if (isPlainImage) {
    return (
      <div className="pin-card">
        <div className="pin-image-wrap">
          <img src={displayImageUrl ?? undefined} alt={item.caption || ""} onError={handleImageError} loading="lazy" />

          {/* caption sits on the image on desktop; hidden on mobile until the viewer opens */}
          {item.caption && (
            <div className="pin-caption-overlay">
              <p className="pin-caption">{item.caption}</p>
            </div>
          )}

          <div
            className="pin-overlay"
            onClick={(e) => {
              // clicks on the card's own buttons shouldn't open the viewer
              if ((e.target as HTMLElement).closest("button, a")) return;
              onOpenImage();
            }}
          >
            <button
              className={`pin-save-btn ${item.approved ? "saved" : ""}`}
              title={item.approved ? "Approved" : "Mark as approved"}
              onClick={onToggleApproved}
            >
              <IconHeart filled={item.approved} size={15} />
            </button>

            <div className="pin-overlay-bottom">
              {confirmDelete ? (
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
                  <button className="pin-round-btn" title="Edit" onClick={onEdit}>
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
        ) : tiktokEmbed ? (
          <div className="inspiration-tiktok-frame">
            <iframe
              src={tiktokEmbed}
              title={item.caption || "Inspiration from TikTok"}
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
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
        {item.caption ? <p className="inspiration-caption">{item.caption}</p> : <span />}
        <div className="inspiration-actions">
          <button className="icon-btn" title="Edit" onClick={onEdit}>
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
      </div>
    </div>
  );
}
