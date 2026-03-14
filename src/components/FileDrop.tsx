import { ChangeEvent } from 'react';

type FileDropProps = {
  title: string;
  accept: string;
  fileName?: string;
  onChange: (file: File | null) => void;
  onRemove?: () => void;
};

export function FileDrop({ title, accept, fileName, onChange, onRemove }: FileDropProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null);
  };

  return (
    <label className="file-drop">
      <span className="file-drop__title">{title}</span>
      <input type="file" accept={accept} onChange={handleChange} />
      {fileName ? (
        <span className="file-drop__file-row">
          <span className="file-drop__file-name">{fileName}</span>
          <button
            type="button"
            className="file-drop__remove"
            onClick={(event) => {
              event.preventDefault();
              onRemove?.();
            }}
          >
            Remove
          </button>
        </span>
      ) : (
        <span className="file-drop__button">Choose file</span>
      )}
    </label>
  );
}
