import { useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconClose } from "./Icons";

export type LightboxSlide = {
  id: string;
  src: string;
  caption: string;
};

type Props = {
  slides: LightboxSlide[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

// How far (px) a finger has to travel before a swipe counts, or how fast
// (px/ms) a shorter flick has to be.
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.4;

export default function ImageLightbox({ slides, index, onIndexChange, onClose }: Props) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touch = useRef<{ x: number; y: number; t: number; axis: "x" | "y" | null } | null>(null);
  // a swipe shouldn't also count as a tap on the backdrop (which closes)
  const justSwiped = useRef(false);

  const slide = slides[index];
  const hasPrev = index > 0;
  const hasNext = index < slides.length - 1;

  function goPrev() {
    if (hasPrev) onIndexChange(index - 1);
  }
  function goNext() {
    if (hasNext) onIndexChange(index + 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    // keep the page behind from scrolling while the viewer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // warm the cache for the neighbours so swiping doesn't flash an empty frame
  useEffect(() => {
    [slides[index - 1], slides[index + 1]].forEach((s) => {
      if (s) new Image().src = s.src;
    });
  }, [slides, index]);

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now(), axis: null };
  }

  function handleTouchMove(e: React.TouchEvent) {
    const start = touch.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (!start.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (start.axis !== "x") return;
    setDragging(true);
    // resist at the ends so it's clear there's nothing further that way
    const atEdge = (dx > 0 && !hasPrev) || (dx < 0 && !hasNext);
    setDragX(atEdge ? dx * 0.3 : dx);
  }

  function handleTouchEnd() {
    const start = touch.current;
    touch.current = null;
    if (!start || start.axis !== "x") return;
    justSwiped.current = true;
    setTimeout(() => (justSwiped.current = false), 300);
    const velocity = Math.abs(dragX) / Math.max(1, Date.now() - start.t);
    const committed = Math.abs(dragX) > SWIPE_DISTANCE || velocity > SWIPE_VELOCITY;
    if (committed && dragX < 0) goNext();
    else if (committed && dragX > 0) goPrev();
    setDragging(false);
    setDragX(0);
  }

  if (!slide) return null;

  return (
    <div
      className="lightbox-overlay"
      onClick={() => {
        if (!justSwiped.current) onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      role="dialog"
      aria-modal="true"
    >
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <IconClose size={16} />
      </button>

      {slides.length > 1 && (
        <span className="lightbox-counter">
          {index + 1} / {slides.length}
        </span>
      )}

      {hasPrev && (
        <button
          className="lightbox-nav prev"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous"
        >
          <IconChevronLeft size={20} />
        </button>
      )}
      {hasNext && (
        <button
          className="lightbox-nav next"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next"
        >
          <IconChevronRight size={20} />
        </button>
      )}

      <figure
        className="lightbox-figure"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease-out",
        }}
      >
        <img key={slide.id} src={slide.src} alt={slide.caption} draggable={false} />
        {slide.caption && (
          <figcaption className="lightbox-footer">
            <span className="lightbox-caption">{slide.caption}</span>
          </figcaption>
        )}
      </figure>
    </div>
  );
}
