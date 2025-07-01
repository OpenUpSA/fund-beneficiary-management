import React, { useState } from "react";

interface InlineEditableFieldProps {
  label: string;
  value: string;
  originalValue: string;
  multiline?: boolean;
  edited: boolean;
  onSave: (value: string) => Promise<void> | void;
  onChange?: (value: string, isEdited: boolean) => void;
  className?: string;
}

export const InlineEditableField: React.FC<InlineEditableFieldProps> = ({
  label,
  value,
  originalValue,
  multiline = false,
  edited = false,
  onSave,
  onChange,
  className = "",
}) => {
  const [editing, setEditing] = useState(edited);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    onChange?.(originalValue, false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      setEditing(false);
    } catch (e: Error | unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium">{label}</label>
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
              className="w-full p-3 border rounded min-h-[150px] text-sm text-gray-500 resize-none"
              value={value}
              onChange={(e) => onChange?.(e.target.value, true)}
              disabled={saving}
              autoFocus
            />
          ) : (
            <input
              className="w-full p-2 border rounded text-sm text-gray-500"
              value={value}
              onChange={(e) => onChange?.(e.target.value, true)}
              disabled={saving}
              autoFocus
            />
          )}
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
          <div className="flex flex-row justify-between">
            <button
              type="button"
              className="px-4 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm order-1"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-1 rounded bg-black text-white text-sm order-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      ) : (
        <div className="text-base text-gray-500 whitespace-pre-line bg-transparent rounded p-0 text-sm">
          {value || <span className="text-gray-400 italic">Click edit to add this information...</span>}
        </div>
      )}
    </div>
  );
};
