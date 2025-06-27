import React, { useState } from "react";

interface InlineEditableFieldProps {
  label: string;
  value: string;
  fieldName: string;
  multiline?: boolean;
  onSave: (value: string) => Promise<void> | void;
  className?: string;
}

export const InlineEditableField: React.FC<InlineEditableFieldProps> = ({
  label,
  value,
  fieldName,
  multiline = false,
  onSave,
  className = "",
}) => {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = () => {
    setInputValue(value);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setInputValue(value);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(inputValue);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <label className="font-semibold text-lg">{label}</label>
        {!editing && (
          <button
            type="button"
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
            onClick={handleEdit}
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <>
          {multiline ? (
            <textarea
              className="w-full p-3 border rounded min-h-[100px] text-base"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={saving}
              autoFocus
            />
          ) : (
            <input
              className="w-full p-2 border rounded text-base"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={saving}
              autoFocus
            />
          )}
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
          <div className="flex gap-2 mt-2 justify-end">
            <button
              type="button"
              className="px-4 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-1 rounded bg-black text-white text-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      ) : (
        <div className="text-base text-gray-600 whitespace-pre-line bg-transparent rounded p-0">
          {value || <span className="text-gray-400 italic">No value</span>}
        </div>
      )}
    </div>
  );
};
