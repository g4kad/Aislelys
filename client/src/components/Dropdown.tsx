import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "./Icons";

export type DropdownOption = {
  value: string;
  label: string;
  badge?: string | number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
};

type MenuRect = { top: number; left: number; width: number };

export default function Dropdown({ value, onChange, options, placeholder = "Select…", className }: Props) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleReposition() {
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`dropdown ${className || ""}`} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="dropdown-trigger"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dropdown-value-row">
          <span className={selected ? "dropdown-value" : "dropdown-value dropdown-placeholder"}>
            {selected ? selected.label : placeholder}
          </span>
          {selected?.badge !== undefined && <span className="dropdown-badge">{selected.badge}</span>}
        </span>
        <IconChevronDown className={`dropdown-arrow ${open ? "open" : ""}`} />
      </button>

      {open && menuRect &&
        createPortal(
          <ul
            className="dropdown-menu"
            role="listbox"
            ref={menuRef}
            style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
          >
            {options.map((opt) => (
              <li key={opt.value} role="option" aria-selected={opt.value === value}>
                <button
                  type="button"
                  className={`dropdown-option ${opt.value === value ? "selected" : ""}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="dropdown-option-label">{opt.label}</span>
                  {opt.badge !== undefined && <span className="dropdown-badge">{opt.badge}</span>}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
