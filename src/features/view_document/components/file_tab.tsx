import { FileX, ExternalLink, FileText, Download } from "lucide-react";

export default function InvoiceFileTab({ fileUrl }: { fileUrl?: string | null }) {
  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-3">
          <FileX className="w-7 h-7 text-sky-400" />
        </div>
        <p className="text-sm font-semibold text-gray-600">No file attached</p>
        <p className="text-xs mt-1 text-gray-400">Upload a document to view it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* File Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Attached Document</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={fileUrl}
            download
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </a>
        </div>
      </div>

      {/* File Preview */}
      <div className="rounded-xl border border-sky-100 overflow-hidden bg-sky-50/30 shadow-sm">
        <iframe
          src={fileUrl}
          title="Invoice file"
          className="w-full h-120 bg-white"
        />
      </div>
    </div>
  );
}