import { useEffect, useState, useRef } from "react";
import { getInvoiceUploadHistory, getPOUploadHistory } from "../services/documentService";
import type { UploadHistoryItem } from "../../../types/history";


interface UploadHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  docType: "invoice" | "po";
  docId: string;
  vendorName: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getFilename(url: string) {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1]) || url;
  } catch {
    return url.split("/").pop() || url;
  }
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 p-4 animate-pulse">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="w-0.5 flex-1 bg-gray-100 min-h-8" />
      </div>
      <div className="flex-1 pb-4">
        <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
        <div className="h-10 bg-gray-100 rounded-lg mb-2" />
        <div className="h-10 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

export default function UploadHistoryDrawer({ open, onClose, docType, docId, vendorName }: UploadHistoryDrawerProps) {
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setHistory([]);
    setError(null);
    setLoading(true);

    const fetch = docType === "invoice"
      ? getInvoiceUploadHistory(docId)
      : getPOUploadHistory(docId);

    fetch
      .then((res) => setHistory(Array.isArray(res) ? res : []))
      .catch(() => setError("Failed to load history. Please try again."))
      .finally(() => setLoading(false));
  }, [open, docId, docType]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const accentColor = docType === "invoice" ? "blue" : "violet";
  const accentClasses = {
    blue: {
      border: "border-t-blue-600",
      badge: "bg-blue-50 text-blue-600",
      dot: "bg-blue-500 ring-blue-100",
      link: "text-blue-600 hover:text-blue-800",
      count: "bg-blue-100 text-blue-700",
    },
    violet: {
      border: "border-t-violet-600",
      badge: "bg-violet-50 text-violet-600",
      dot: "bg-violet-500 ring-violet-100",
      link: "text-violet-600 hover:text-violet-800",
      count: "bg-violet-100 text-violet-700",
    },
  }[accentColor];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full z-50 w-96 max-w-[90vw] bg-white shadow-2xl flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className={`border-t-4 ${accentClasses.border} px-5 pt-5 pb-4 border-b border-gray-100 shrink-0`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${accentClasses.badge}`}>
                {docType === "invoice" ? "🧾" : "📋"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{docId}</p>
                <p className="text-xs text-gray-400 truncate">{vendorName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none shrink-0 transition-colors mt-0.5"
            >✕</button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Upload History</h2>
            {!loading && (history?.length ?? 0) > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${accentClasses.count}`}>
                {history.length} version{history.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col">
              {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 px-6 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm text-gray-500">{error}</p>
              <button
                onClick={() => {
                  setLoading(true); setError(null);
                  const fetch = docType === "invoice" ? getInvoiceUploadHistory(docId) : getPOUploadHistory(docId);
                  fetch.then(r => setHistory(Array.isArray(r) ? r : [])).catch(() => setError("Failed again.")).finally(() => setLoading(false));
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (history?.length ?? 0) === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
              <span className="text-4xl opacity-40">📂</span>
              <p className="text-sm font-medium text-gray-500">No upload history yet</p>
              <p className="text-xs text-gray-400">This document hasn't been re-uploaded or overridden.</p>
            </div>
          )}

          {!loading && !error && (history?.length ?? 0) > 0 && (
            <div className="px-5 py-4">
              {/* Timeline */}
              <div className="flex flex-col">
                {history.map((item, idx) => (
                  <div key={item.id} className="flex gap-4">
                    {/* Timeline spine */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-3 h-3 rounded-full ring-4 shrink-0 mt-1 ${accentClasses.dot}`} />
                      {idx !== (history?.length ?? 0) - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-100 my-1 min-h-6" />
                      )}
                    </div>

                    {/* Card */}
                    <div className={`flex-1 pb-5 ${idx === history.length - 1 ? "" : ""}`}>
                      {/* Timestamp */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <p className="text-xs font-semibold text-gray-700">{formatDate(item.action_date)}</p>
                        <p className="text-xs text-gray-400">{formatTime(item.action_date)}</p>
                        {idx === 0 && (
                          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">Latest</span>
                        )}
                      </div>

                      {/* File cards */}
                      <div className="flex flex-col gap-2">
                        {/* New file */}
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-start gap-2.5">
                            <span className="text-base shrink-0 mt-0.5">
                              {/\.(png|jpe?g|webp)$/i.test(item.new_file_url) ? "🖼️" : "📄"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-400 mb-0.5">New file</p>
                              <p className="text-xs font-medium text-gray-700 break-all leading-relaxed">{getFilename(item.new_file_url)}</p>
                              <a
                                href={item.new_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs font-medium underline underline-offset-2 mt-1 inline-block ${accentClasses.link}`}
                              >
                                View file ↗
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center gap-2 px-1">
                          <div className="flex-1 border-t border-dashed border-gray-200" />
                          <span className="text-xs text-gray-300">replaced</span>
                          <div className="flex-1 border-t border-dashed border-gray-200" />
                        </div>

                        {/* Old file */}
                        <div className="rounded-lg border border-gray-100 bg-white p-3 opacity-70">
                          <div className="flex items-start gap-2.5">
                            <span className="text-base shrink-0 mt-0.5 grayscale">
                              {/\.(png|jpe?g|webp)$/i.test(item.old_file_url) ? "🖼️" : "📄"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-400 mb-0.5">Previous file</p>
                              <p className="text-xs font-medium text-gray-500 break-all leading-relaxed">{getFilename(item.old_file_url)}</p>
                              <a
                                href={item.old_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-gray-400 hover:text-gray-600 underline underline-offset-2 mt-1 inline-block"
                              >
                                View file ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <p className="text-xs text-gray-400 text-center">
            Showing all {history?.length ?? 0} upload event{(history?.length ?? 0) !== 1 ? "s" : ""} · newest first
          </p>
        </div>
      </div>
    </>
  );
}