import { ReactNode } from "react";
import { X } from "lucide-react";

export function ModalShell({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "rgba(14,21,48,.62)", backdropFilter: "blur(3px)" }}
    >
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}
        style={{ background: "var(--neu)", borderRadius: 20, boxShadow: "var(--neu-raised), 0 40px 90px rgba(14,21,48,.45)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0"
          style={{ background: "var(--neu)", borderBottom: "1px solid var(--line)" }}
        >
          <h3 className="ac-display m-0" style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: ".04em" }}>
            {title}
          </h3>
          <button onClick={onClose} className="ac-icon-btn" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
