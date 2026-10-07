import type { ReactNode } from "react";
import { IconClose } from "./Icons";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode; // extra buttons beside the close button
};

export default function Modal({ title, onClose, children, className, headerActions }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal${className ? ` ${className}` : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <div className="modal-header-actions">
            {headerActions}
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <IconClose />
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
