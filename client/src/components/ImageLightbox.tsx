import { useEffect } from "react";
import { IconClose, IconExternalLink } from "./Icons";

type Props = {
  src: string;
  caption: string;
  originalUrl: string;
  onClose: () => void;
};

export default function ImageLightbox({ src, caption, originalUrl, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // keep the page behind from scrolling while the image is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <IconClose size={16} />
      </button>
      <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={caption} />
        <figcaption className="lightbox-footer">
          {caption ? <span className="lightbox-caption">{caption}</span> : <span />}
          <a className="lightbox-original" href={originalUrl} target="_blank" rel="noreferrer">
            <IconExternalLink size={13} />
            Open original
          </a>
        </figcaption>
      </figure>
    </div>
  );
}
