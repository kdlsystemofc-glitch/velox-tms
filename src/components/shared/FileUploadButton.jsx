import React, { useRef, useState } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { compressImage } from "@/utils/compressImage";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, X, Loader2, Upload } from "lucide-react";

export default function FileUploadButton({ onUpload, label = "Anexar arquivo", accept = "*", capture, preview = true, className = "" }) {
  const inputRef = useRef(null);
  const { uploadFile, uploading } = useFileUpload();
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleChange = async (e) => {
    const original = e.target.files?.[0];
    if (!original) return;
    setFileName(original.name);
    if (preview && original.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(original));
    }
    // Comprime imagens antes de enviar (uploads mais rápidos em 4G)
    const file = await compressImage(original);
    const url = await uploadFile(file);
    if (url) {
      setUploadedUrl(url);
      onUpload(url);
    }
  };

  const handleRemove = () => {
    setUploadedUrl(null);
    setFileName(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
    onUpload(null);
  };

  if (uploadedUrl) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="w-10 h-10 object-cover rounded border" />
        ) : (
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-300 flex-shrink-0" />
        )}
        <span className="flex-1 truncate text-xs text-muted-foreground">{fileName}</span>
        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-300 flex-shrink-0" />
        <button onClick={handleRemove} className="text-muted-foreground hover:text-red-500">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={accept} capture={capture} className="hidden" onChange={handleChange} />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="gap-2 text-xs">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? "Enviando..." : label}
      </Button>
    </div>
  );
}