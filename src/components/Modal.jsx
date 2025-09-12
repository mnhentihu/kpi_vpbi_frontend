import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  size = "md", // sm, md, lg
  hideCloseButton = false,
}) {
  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // Ukuran modal
  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-3xl",
  }[size];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Box */}
          <motion.div
            className={`relative w-full ${sizeClass} bg-white rounded-2xl shadow-lg flex flex-col max-h-[90vh]`}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold">{title}</h3>
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Body (scrollable) */}
            <div className="p-5 overflow-y-auto flex-1">{children}</div>

            {/* Footer (optional) */}
            {footer && (
              <div className="px-5 py-4 border-t shrink-0">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
