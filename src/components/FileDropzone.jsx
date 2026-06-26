import { useRef, useState } from 'react';

export default function FileDropzone({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    if (disabled) return;
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
        dragOver
          ? 'border-brand-500 bg-brand-50'
          : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50'
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      role="button"
      tabIndex={0}
    >
      <div className="mb-3 text-4xl">📁</div>
      <div className="text-sm font-medium text-slate-700">
        Drag & drop your leads file here, or <span className="text-brand-600">browse</span>
      </div>
      <div className="mt-1 text-xs text-slate-500">Accepted: .csv, .xlsx, .xls</div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
