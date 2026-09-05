import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PdfUploadModal: React.FC<PdfUploadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF policy documents (.pdf) are supported.');
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF policy documents (.pdf) are supported.');
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/policies/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to extract PDF document');
      }

      onClose();
      // Navigate to Review Extracted Policy page with parsed draft
      navigate('/owner/policies/review-upload', { state: { draft: data.draft } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-300 shadow-enterprise-lg w-full max-w-lg animate-in fade-in zoom-in-95 duration-150">
        {/* Top Accent Strip */}
        <div className="h-1.5 bg-[#8B1D2C] w-full" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#0F2042] text-white">
              <UploadCloud className="w-4 h-4 text-[#C89738]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F2042]">
                Upload Policy Document (PDF)
              </h3>
              <p className="text-[11px] text-slate-500">
                Extracts structured sections and sub-headings automatically
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-[#8B1D2C] text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#8B1D2C] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-[#8B1D2C] bg-red-50/50'
                : selectedFile
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50'
            }`}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <p className="text-[11px] text-[#8B1D2C] font-semibold hover:underline">
                  Click to select a different PDF file
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 bg-slate-200 text-slate-600 mx-auto flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#8B1D2C]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Click to browse or drag and drop your policy PDF
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Supports standardized numbered templates (up to 25MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">Template Expectation:</span>
            <p>
              Extracts numbered top-level sections (e.g. <code>1. Policy Governance and Scope</code>) and standard sub-headings (Control Area, Policy Statement, Roles & Responsibilities, Standard Procedure, Records, Controls, Exceptions, KPIs, Testing Scenarios, Compliance Notes).
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUploadAndParse}
            disabled={!selectedFile || isUploading}
            className="px-4 py-2 bg-[#8B1D2C] hover:bg-[#721623] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting Sections...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Extract & Review Structure</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
