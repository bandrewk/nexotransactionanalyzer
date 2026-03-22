import { useState, type DragEvent } from "react";
import { X, Upload, Play } from "lucide-react";
import { useAppStore } from "../../stores/app-store";

type FileUploadProps = {
  onSuccess: () => void;
};

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCSV = useAppStore((s) => s.loadCSV);

  const processContent = (content: string) => {
    try {
      loadCSV(content);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process CSV file.");
    }
  };

  const handleFile = (f: File) => {
    setError(null);
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    setFile(f);
    setFileSelected(true);
    f.text().then(processContent);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    else setError("File upload failed.");
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    setError(null);
    const f = e.dataTransfer.items?.[0]?.getAsFile?.();
    if (f) handleFile(f);
    else setError("File upload failed.");
  };

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = (e: DragEvent) => { e.preventDefault(); setDragActive(false); };

  const onDemo = () => {
    setError(null);
    fetch("/nexo_demo_transactions.csv")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load demo file.");
        return res.text();
      })
      .then((content) => {
        setFileSelected(true);
        processContent(content);
      })
      .catch((e) => setError(e.message));
  };

  const onRemove = () => {
    setFile(null);
    setFileSelected(false);
    setDragActive(false);
    setError(null);
  };

  if (fileSelected) {
    return (
      <div className="max-w-[56rem] mx-auto">
        <div className="flex items-center justify-center gap-3 py-12 px-6 rounded-2xl
          bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
          <span className="text-[1.4rem] text-slate-500">Loaded</span>
          {file && <span className="text-[1.4rem] font-medium text-accent">{file.name}</span>}
          <button onClick={onRemove} className="cursor-pointer bg-transparent border-none p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <X size={16} className="text-slate-400 hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[56rem] mx-auto">
      {/* Drop zone */}
      <div
        className={`relative rounded-2xl p-12 text-center transition-all duration-300 border-2 border-dashed ${
          dragActive
            ? "border-accent bg-accent/5 dark:bg-accent/10 scale-[1.01]"
            : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className="w-[4.8rem] h-[4.8rem] rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <Upload size={22} className="text-accent" />
        </div>
        <p className="text-[1.5rem] font-medium text-slate-700 dark:text-slate-300 mb-2">
          Drop your Nexo CSV here
        </p>
        <p className="text-[1.3rem] text-slate-400 mb-6">or browse to upload</p>
        <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
          bg-accent text-white text-[1.3rem] font-semibold
          cursor-pointer hover:bg-accent-hover active:scale-[0.98]
          transition-all duration-200 shadow-[0_2px_12px_rgba(59,130,246,0.3)]">
          <input type="file" accept=".csv" onChange={onFileChange} className="hidden" />
          Choose File
        </label>
        {error && (
          <p className="text-[1.3rem] font-medium text-red-400 mt-4">{error}</p>
        )}
      </div>

      {/* Divider + Demo */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
        <span className="text-[1.2rem] text-slate-400 uppercase tracking-wider font-medium">or</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
      </div>

      <button
        onClick={onDemo}
        className="w-full py-4 rounded-xl text-[1.4rem] font-semibold
          bg-white dark:bg-white/[0.04]
          border border-slate-200 dark:border-white/10
          text-slate-700 dark:text-slate-300
          hover:border-accent/40 hover:text-accent dark:hover:text-accent
          cursor-pointer transition-all duration-200
          flex items-center justify-center gap-3"
      >
        <Play size={16} className="fill-current" />
        Try Demo
      </button>
    </div>
  );
}
