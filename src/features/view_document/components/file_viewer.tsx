function FileViewer({
  fileUrl,
  id,
  vendor,
  date,
}: {
  fileUrl?: string;
  id: string;
  vendor: string;
  date: string;
}) {
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No file attached
      </div>
    );
  }

  const ext = fileUrl.split(".").pop()?.toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext || "");
  const isPdf = ext === "pdf";

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-500 flex justify-between">
        <span>{vendor} · {date}</span>

        <div className="flex gap-3 items-center">
          <span>{id}</span>

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            Open
          </a>
        </div>
      </div>

      {/* Preview */}
      {isImage && (
        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
          <img
            src={fileUrl}
            alt={id}
            className="rounded-xl max-h-full object-contain shadow-sm"
          />
        </div>
      )}

      {isPdf && (
        <iframe
          src={fileUrl}
          className="flex-1 w-full border-0"
          title="PDF Preview"
        />
      )}

      {!isImage && !isPdf && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
          <p>Preview not available</p>

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
          >
            Download File
          </a>
        </div>
      )}
    </div>
  );
}

export default FileViewer;