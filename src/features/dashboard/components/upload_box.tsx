import { useRef, useState } from "react";

interface UploadProps {
  type: "Invoice" | "Purchase Order";
  accentClass: string;
  iconBg: string;
  icon: string;
  accept: string;
  onUpload?: (files: File[]) => void;
}

function UploadBox({ type, accentClass, iconBg, icon, accept, onUpload }: UploadProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => { setFiles((prev) => [...prev, ...incoming]); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) addFiles(Array.from(e.target.files)); };

  const removeFile = (index: number) => { setFiles((prev) => prev.filter((_, i) => i !== index)); };

  const handleUploadClick = async () => {
    if (files.length === 0 || !onUpload) return;
    setUploading(true);
    try {
      await onUpload(files);    
      setFiles([]);             
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${accentClass} p-5 flex flex-col gap-3`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${iconBg}`}>{icon}</div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{type}</p>
          <p className="text-xs text-gray-400">Upload {type.toLowerCase()} files</p>
        </div>
      </div>

      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
        onClick={() => inputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-colors
          ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`} >
        <span className="text-2xl mb-2">📂</span>
        <p className="text-sm font-medium text-gray-600">Drag & drop or <span className="text-blue-600 underline underline-offset-2">browse</span></p>
        <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG up to 10 MB</p>
        <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={handleChange} />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
          {files.map((file, i) => (
            <li key={i} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-1.5 text-xs">
              <span className="text-gray-700 truncate max-w-[70%]">📄 {file.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-red-400 hover:text-red-600 font-bold leading-none" title="Remove">×</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button onClick={handleUploadClick} disabled={files.length === 0 || uploading} className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
          files.length > 0 && !uploading ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`} >
        {uploading ? "Uploading…" : files.length > 0 ? `Upload ${files.length} file${files.length > 1 ? "s" : ""}` : "No files selected"}</button>
    </div>
  );
}

export default UploadBox;