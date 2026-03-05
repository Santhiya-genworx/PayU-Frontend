import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { removeFile, clearFiles, setFilesUploading, updateFile } from "../slices/dashboardSlice";
import type { ExtractedFile } from "../../../types/process";

interface ProgressModalProps {
  files: ExtractedFile[];
  submitFn: (data: any, file: File) => Promise<{ file_id: string }>;
  pollFn: (fileId: string) => Promise<{ status: string; error?: string }>;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

type UploadStatus = "pending" | "uploading" | "success" | "error";

interface FileStatus {
  id: string;
  fileName: string;
  status: UploadStatus;
  error?: string;
}

export default function ProgressModal({ files, submitFn, pollFn, onClose, onError, onSuccess }: ProgressModalProps) {
  const dispatch = useDispatch();

  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>(
    files.map((f) => ({ id: f.id, fileName: f.fileName, status: "pending" }))
  );
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const setStatus = (id: string, status: UploadStatus, error?: string) => {
    setFileStatuses((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, error } : f))
    );
  };

  useEffect(() => {
    dispatch(setFilesUploading(files.map((f) => f.id)));

    const saveFiles = async () => {
      let completed = 0;

      await Promise.all(
        files.map(async (file) => {
          if (!file.extractedData) return;

          setStatus(file.id, "uploading");

          try {
            const { file_id } = await submitFn(file.extractedData, file.file);

            await new Promise<void>((resolve, reject) => {
              const check = async () => {
                try {
                  const res = await pollFn(file_id);
                  if (res.status === "processing") {
                    setTimeout(check, 3000);
                  } else if (res.status === "completed") {
                    resolve();
                  } else {
                    reject(new Error(res.error ?? "Upload failed"));
                  }
                } catch (err) {
                  reject(err);
                }
              };
              check();
            });

            setStatus(file.id, "success");
            // Case 2: success — show toast, remove from panel
            onSuccess(`${file.fileName} saved successfully`);
            dispatch(removeFile(file.id));

          } catch (err: any) {
            const message = err?.message ?? "Unknown error";
            setStatus(file.id, "error", message);
            // Case 3: error — show toast, revert file to "error" in panel so user sees it
            onError(`${file.fileName}: ${message}`);
            dispatch(updateFile({ ...file, status: "error" }));
          }

          completed++;
          setProgress(Math.round((completed / files.length) * 100));
        })
      );

      setDone(true);
    };

    saveFiles();
  }, []);

  const allSuccess = fileStatuses.every((f) => f.status === "success");
  const hasError = fileStatuses.some((f) => f.status === "error");

  const handleClose = () => {
    if (done && allSuccess) {
      // All succeeded — clear remaining panel files
      dispatch(clearFiles());
    }
    // If errors remain, panel already shows them as "error" status via dispatch above
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full flex flex-col gap-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-800">
          {done
            ? allSuccess ? "All files saved!" : hasError ? "Some files failed" : "Done"
            : "Saving Files…"}
        </h3>

        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-gray-500">{progress}% completed</p>

        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {fileStatuses.map((f) => (
            <div key={f.id} className="flex justify-between items-start text-sm gap-2">
              <span className="text-gray-700 truncate flex-1">{f.fileName}</span>
              <span className="shrink-0">
                {f.status === "pending"   && <span className="text-gray-400">—</span>}
                {f.status === "uploading" && <span className="text-amber-500 animate-pulse">⏳ Uploading…</span>}
                {f.status === "success"   && <span className="text-green-600">✅</span>}
                {f.status === "error"     && <span className="text-red-500" title={f.error}>❌</span>}
              </span>
            </div>
          ))}
        </div>

        {hasError && (
          <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 flex flex-col gap-1">
            {fileStatuses.filter((f) => f.status === "error").map((f) => (
              <p key={f.id}><span className="font-medium">{f.fileName}:</span> {f.error}</p>
            ))}
          </div>
        )}

        <button
          onClick={handleClose}
          className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-all"
        >
          {done ? "Close" : "Close (uploading continues in background)"}
        </button>
      </div>
    </div>
  );
}