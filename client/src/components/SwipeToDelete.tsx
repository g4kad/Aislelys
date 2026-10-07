import { useEffect, useRef, useState } from "react";
import { IconTrash } from "./Icons";

type Props = {
  onDelete: () => void;
  // an expanded card has its own delete action (via Edit), so swipe is
  // turned off there to keep the two delete paths from overlapping
  disabled?: boolean;
  children: React.ReactNode;
};

// The delete button sits in its own small rounded box, separated from the
// card by a gap — both widths in px, must match the CSS below.
const ACTION_WIDTH = 40;
const GAP = 8;
const OPEN_DISTANCE = ACTION_WIDTH + GAP;

export default function SwipeToDelete({ onDelete, disabled, children }: Props) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const touch = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  // a swipe shouldn't also register as the tap that expands the card
  const justSwiped = useRef(false);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setDragX(0);
    }
  }, [disabled]);

  function handleTouchStart(e: React.TouchEvent) {
    if (disabled || e.touches.length !== 1) return;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, axis: null };
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
    const base = open ? -OPEN_DISTANCE : 0;
    setDragX(Math.min(0, Math.max(-OPEN_DISTANCE, base + dx)));
  }

  function handleTouchEnd() {
    const start = touch.current;
    touch.current = null;
    setDragging(false);
    if (!start || start.axis !== "x") return;
    justSwiped.current = true;
    setTimeout(() => (justSwiped.current = false), 300);
    const shouldOpen = dragX <= -OPEN_DISTANCE / 2;
    setOpen(shouldOpen);
    setDragX(shouldOpen ? -OPEN_DISTANCE : 0);
  }

  function close() {
    setOpen(false);
    setDragX(0);
  }

  return (
    <div className={`swipe-row${dragX !== 0 ? " swiping" : ""}`}>
      <div className="swipe-delete-action">
        <button
          type="button"
          className="swipe-delete-btn"
          onClick={() => {
            close();
            onDelete();
          }}
          aria-label="Delete"
        >
          <IconTrash size={15} />
        </button>
      </div>
      <div
        className="swipe-content"
        style={{
          // the content's own width recedes to reveal the fixed delete
          // button behind it, rather than sliding (and clipping) its text
          width: `calc(100% - ${-dragX}px)`,
          transition: dragging ? "none" : "width 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClickCapture={(e) => {
          if (justSwiped.current || open) {
            e.preventDefault();
            e.stopPropagation();
            if (open) close();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
