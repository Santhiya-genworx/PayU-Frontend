import { useEffect, useState } from "react";
import { Upload, Loader2, FileText, Clock, ArrowRight } from "lucide-react";
import { getInvoiceUploadHistory } from "../services/documentService";
import logger from "../../../utils/logger";

interface UploadHistory {
  id: number;
  invoice_id: string;
  old_file_url: string;
  new_file_url: string;
  action_date: string;
}

function getFilename(url: string) {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1]) || url;
  } catch {
    return url.split("/").pop() || url;
  }
}

export default function InvoiceHistoryTab({ invoiceId }: { invoiceId: string }) {
  const [history, setHistory] = useState<UploadHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getInvoiceUploadHistory(invoiceId);
        setHistory(data || []);
      } catch (error) {
        logger.error("Failed to fetch upload history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mb-2 text-amber-500" />
        <p className="text-sm">Loading history...</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
          <Upload className="w-7 h-7 text-amber-400" />
        </div>
        <p className="text-sm font-semibold text-gray-600">No upload history</p>
        <p className="text-xs mt-1 text-gray-400">This document hasn't been updated yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upload History</p>
        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          {history.length} version{history.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {history.map((entry, idx) => (
          <div key={entry.id} className="relative">
            {/* Timeline connector */}
            {idx < history.length - 1 && (
              <div className="absolute left-4 top-14 bottom-0 w-0.5 bg-amber-100 translate-x-[-0.5px]" />
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Entry header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-linear-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-800">
                    {new Date(entry.action_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-[11px] text-amber-600">
                    {new Date(entry.action_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </p>
                </div>
                {idx === 0 && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Latest</span>
                )}
              </div>

              {/* File cards */}
              <div className="p-3 space-y-2">
                {/* New file */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">New File</p>
                    <p className="text-xs text-gray-700 truncate">{getFilename(entry.new_file_url)}</p>
                  </div>
                  <a href={entry.new_file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 shrink-0 underline underline-offset-2">
                    Open ↗
                  </a>
                </div>

                {/* Replaced arrow */}
                <div className="flex items-center gap-2 px-2">
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <ArrowRight className="w-3 h-3" />
                    <span>replaced</span>
                  </div>
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                </div>

                {/* Old file */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100 opacity-70">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Previous File</p>
                    <p className="text-xs text-gray-500 truncate">{getFilename(entry.old_file_url)}</p>
                  </div>
                  <a href={entry.old_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600 shrink-0 underline underline-offset-2">
                    Open ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}