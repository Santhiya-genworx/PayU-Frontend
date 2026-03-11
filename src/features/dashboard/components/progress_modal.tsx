import { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { removeFile, clearFiles, setFilesUploading, updateFile } from "../slices/dashboardSlice";
import type { ExtractedFile } from "../../../types/process";

interface ProgressModalProps {
  files: ExtractedFile[];
  submitFn: (data: any, file: File) => Promise<{ file_id: string }>;
  overrideFn: (data: any, file: File) => Promise<{ file_id: string }>;
  pollFn: (fileId: string) => Promise<{ status: string; error?: string }>;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onConfirmationRequired: (file: ExtractedFile) => void;
  confirmOverrideRef: React.MutableRefObject<(() => void) | null>;
  cancelOverrideRef: React.MutableRefObject<(() => void) | null>;
  onAllDone: () => void;
}

type UploadStatus = "pending" | "uploading" | "success" | "error" | "skipped";

interface FileStatus {
  id: string;
  fileName: string;
  status: UploadStatus;
  error?: string;
}

export default function ProgressModal({files, submitFn, overrideFn, pollFn, onClose, onError, onSuccess, onConfirmationRequired, confirmOverrideRef, cancelOverrideRef, onAllDone}: ProgressModalProps) {
  const dispatch = useDispatch();

  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>(
    files.map((f) => ({ id: f.id, fileName: f.fileName, status: "pending" }))
  );
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const gateRef = useRef<((confirmed: boolean) => void) | null>(null);

  const setStatus = (id: string, status: UploadStatus, error?: string) =>
    setFileStatuses((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, error } : f))
    );

  confirmOverrideRef.current = () => { gateRef.current?.(true);  gateRef.current = null; };
  cancelOverrideRef.current  = () => { gateRef.current?.(false); gateRef.current = null; };

  const pollProcessing = (file_id: string) =>
    new Promise<void>((resolve, reject) => {
      const check = async () => {
        try {
          const res = await pollFn(file_id);
          if (res.status === "processing") setTimeout(check, 3000);
          else if (res.status === "completed") resolve();
          else reject(new Error(res.error ?? "Upload failed"));
        } catch (err) { reject(err); }
      };
      check();
    });

  const uploadFile = async (file: ExtractedFile, override = false): Promise<void> => {
    if (!file.extractedData) return;
    setStatus(file.id, "uploading");

    try {
      const fn = override ? overrideFn : submitFn;
      const { file_id } = await fn(file.extractedData, file.file);
      await pollProcessing(file_id);

      setStatus(file.id, "success");
      onSuccess(`${file.fileName} saved successfully`);
      dispatch(removeFile(file.id));
    } catch (err: any) {
      const isDuplicate = err?.response?.status === 409 || (err?.message as string)?.startsWith("409:");

      if (isDuplicate) {
        dispatch(updateFile({ ...file, status: "confirmation_required" } as ExtractedFile));
        onConfirmationRequired(file);

        const confirmed = await new Promise<boolean>((resolve) => { gateRef.current = resolve; });

        if (confirmed) {
          dispatch(updateFile({ ...file, status: "uploading" }));
          await uploadFile(file, true);
        } else {
          setStatus(file.id, "skipped");
          dispatch(updateFile({ ...file, status: "error" }));
        }
        return;
      }

      const message = err?.message ?? "Unknown error";
      setStatus(file.id, "error", message);
      onError(`${file.fileName}: ${message}`);
      dispatch(updateFile({ ...file, status: "error" }));
    }
  };

  useEffect(() => {
    dispatch(setFilesUploading(files.map((f) => f.id)));

    const saveFiles = async () => {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setDone(true);
      setFileStatuses((prev) => {
        const allSuccess = prev.every((f) => f.status === "success");
        onAllDone();
        if (allSuccess) dispatch(clearFiles());
        return prev;
      });
    };

    saveFiles();
  }, []);

  const allSuccess = fileStatuses.every((f) => f.status === "success");
  const hasError   = fileStatuses.some((f)  => f.status === "error");

  return (
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-96 max-w-full flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h3 className="text-base font-semibold text-gray-800">{done ? allSuccess ? "All files saved!" : hasError ? "Some files failed" : "Done" : "Saving files…"}</h3>
          <button onClick={onClose} title="Close — uploads continue in background" className="text-gray-400 hover:text-gray-600 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg leading-none" >✕</button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4 flex flex-col gap-1.5">
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-500 ease-out rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400">{progress}% completed</p>
        </div>

        {/* File list */}
        <div className="px-6 flex flex-col gap-0 max-h-52 overflow-y-auto pb-4">
          {fileStatuses.map((f) => (
            <div key={f.id} className="flex justify-between items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-700 truncate flex-1">{f.fileName}</span>
              <span className="shrink-0 text-xs font-medium">
                {f.status === "pending"   && <span className="text-gray-300">—</span>}
                {f.status === "uploading" && <span className="text-amber-500 animate-pulse">Uploading…</span>}
                {f.status === "success"   && <span className="text-green-600">Saved ✓</span>}
                {f.status === "skipped"   && <span className="text-gray-400">Skipped</span>}
                {f.status === "error"     && <span className="text-red-500" title={f.error}>Failed ✗</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Error detail */}
        {hasError && (
          <div className="mx-6 mb-4 text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 flex flex-col gap-1">
            {fileStatuses.filter((f) => f.status === "error").map((f) => (
              <p key={f.id}><span className="font-medium">{f.fileName}:</span> {f.error}</p>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5">
          {done ? (
            <button onClick={onClose} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all">Close</button>
          ) : (
            <p className="text-center text-xs text-gray-400">Closing this won't stop the uploads</p>
          )}
        </div>
      </div>
    </div>
  );
}