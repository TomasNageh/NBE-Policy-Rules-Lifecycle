import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  PlusCircle, 
  FileText, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Tag, 
  Hash 
} from 'lucide-react';
import { CreatePolicyInput } from '../../types/policy';

interface NewPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  'Retail Banking & Consumer Credit',
  'Corporate Credit & Wholesale Banking',
  'Regulatory Compliance & AML/CFT',
  'Enterprise Risk Management',
  'Information Security & Cybersecurity',
  'Operational Risk & Business Continuity',
  'Treasury, Financial Markets & ALM',
  'Human Capital & Code of Conduct',
];

export const NewPolicyModal: React.FC<NewPolicyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();

  const [documentCode, setDocumentCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateCode = (cat: string) => {
    const prefixMap: Record<string, string> = {
      'Retail Banking & Consumer Credit': 'RET',
      'Corporate Credit & Wholesale Banking': 'CORP',
      'Regulatory Compliance & AML/CFT': 'COMP',
      'Enterprise Risk Management': 'RISK',
      'Information Security & Cybersecurity': 'SEC',
      'Operational Risk & Business Continuity': 'OPS',
      'Treasury, Financial Markets & ALM': 'TRS',
      'Human Capital & Code of Conduct': 'HR',
    };
    const prefix = prefixMap[cat] || 'GEN';
    const randomNum = Math.floor(100 + Math.random() * 900);
    setDocumentCode(`POL-${prefix}-2026-${randomNum}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload: CreatePolicyInput = {
      title: title.trim(),
      documentCode: documentCode.trim().toUpperCase(),
      category: category.trim(),
      description: description.trim() || undefined,
    };

    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create policy document');
      }

      onClose();
      if (onSuccess) onSuccess();
      navigate(`/user/policies/${data.policy.id}/edit`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-300 shadow-enterprise-lg w-full max-w-xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Red Accent Strip */}
        <div className="h-1.5 bg-[#8B1D2C] w-full" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#0F2042] text-white">
              <FileText className="w-4 h-4 text-[#C89738]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F2042]">
                Create New Policy Document
              </h3>
              <p className="text-[11px] text-slate-500">
                Initializes a Version 1.0 working draft for policy authoring
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Document Code with Generator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Document Code (Unique Identifier) *
              </label>
              <button
                type="button"
                onClick={() => handleGenerateCode(category)}
                className="text-[11px] text-[#8B1D2C] hover:text-[#6B1421] font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Generate Code
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={documentCode}
                onChange={(e) => setDocumentCode(e.target.value)}
                placeholder="e.g. POL-RET-2026-001"
                className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1D2C] focus:border-[#8B1D2C]"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Format: POL-[DEPT]-[YEAR]-[NUMBER]
            </p>
          </div>

          {/* Policy Title */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Official Policy Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Consumer Credit Due Diligence & Underwriting Policy"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1D2C] focus:border-[#8B1D2C]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Governance Category *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  handleGenerateCode(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1D2C] focus:border-[#8B1D2C]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Executive Summary & Scope
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of the policy purpose, objectives, and affected business units..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1D2C] focus:border-[#8B1D2C]"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !documentCode}
              className="px-4 py-2 text-xs font-semibold bg-[#8B1D2C] hover:bg-[#721623] text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Draft...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Initialize & Open Editor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
