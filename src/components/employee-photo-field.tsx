"use client";

import { useRef, useState } from "react";

import { PhotoCropModal } from "@/components/photo-crop-modal";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Shared by the new-employee form (upload deferred until the employee
// exists) and the edit drawer (upload immediate) — both just hand this a
// name to render initials from, an optional current photo, and callbacks.
export function EmployeePhotoField({
  name,
  previewUrl,
  onSelect,
  onRemove,
  busy,
}: {
  name: string;
  previewUrl: string | null;
  onSelect: (blob: Blob, consent: boolean) => void;
  onRemove?: () => void;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPendingFile(file);
    event.target.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || "?"} src={previewUrl} size="lg" />
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {previewUrl ? "Change photo" : "Upload photo"}
          </Button>
          {previewUrl && onRemove ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={onRemove}>
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChosen}
        />
      </div>

      {pendingFile ? (
        <PhotoCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={(blob, consent) => {
            setPendingFile(null);
            onSelect(blob, consent);
          }}
        />
      ) : null}
    </div>
  );
}
