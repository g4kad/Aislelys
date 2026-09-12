import { useEffect } from "react";
import { IconClose } from "./Icons";

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export default function ImageLightbox({ src, alt, onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" title="Close" onClick={onClose}>
        <IconClose size={18} />
      </button>
      <img className="lightbox-image" src={src} alt={alt || ""} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
