"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

// A square, drag-to-pan + zoom-to-scale cropper, rendered to a fixed-size
// canvas — no crop library dependency, since the app has none and this is
// the only place that needs one. Output is always a 512x512 square JPEG
// blob (the backend re-encodes to WebP and generates its own thumbnail;
// this only needs to hand over a decently-sized square).
const VIEWPORT_SIZE = 320;
const OUTPUT_SIZE = 512;

function baseScale(image: HTMLImageElement): number {
  // The scale at which the image's shorter side exactly fills the
  // viewport — zoom is always applied on top of this floor, so 1x zoom
  // never shows letterboxing.
  return VIEWPORT_SIZE / Math.min(image.width, image.height);
}

export function PhotoCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob, consent: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [consent, setConsent] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(
    null,
  );

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setImageReady(true);
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = baseScale(image) * zoom;
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (VIEWPORT_SIZE - width) / 2 + offset.x;
    const y = (VIEWPORT_SIZE - height) / 2 + offset.y;

    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
    ctx.drawImage(image, x, y, width, height);
  }, [zoom, offset]);

  useEffect(() => {
    if (!imageReady) return;
    draw();
  }, [imageReady, draw]);

  function clampOffset(next: { x: number; y: number }, currentZoom: number): { x: number; y: number } {
    const image = imageRef.current;
    if (!image) return next;
    const scale = baseScale(image) * currentZoom;
    const width = image.width * scale;
    const height = image.height * scale;
    const maxX = Math.max(0, (width - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (height - VIEWPORT_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { startX: event.clientX, startY: event.clientY, origin: offset };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    setOffset(clampOffset({ x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy }, zoom));
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragState.current = null;
  }

  function onZoomChange(nextZoom: number) {
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev, nextZoom));
  }

  function handleConfirm() {
    const image = imageRef.current;
    if (!image) return;
    const output = document.createElement("canvas");
    output.width = OUTPUT_SIZE;
    output.height = OUTPUT_SIZE;
    const ctx = output.getContext("2d");
    if (!ctx) return;

    const outputScale = OUTPUT_SIZE / VIEWPORT_SIZE;
    const scale = baseScale(image) * zoom * outputScale;
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (OUTPUT_SIZE - width) / 2 + offset.x * outputScale;
    const y = (OUTPUT_SIZE - height) / 2 + offset.y * outputScale;

    ctx.drawImage(image, x, y, width, height);
    output.toBlob(
      (blob) => {
        if (blob) onConfirm(blob, consent);
      },
      "image/jpeg",
      0.92,
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-crop-title"
    >
      <div className="w-full max-w-[400px] rounded-card border border-border bg-surface p-6">
        <h2 id="photo-crop-title" className="text-[15px] font-extrabold text-ink">
          Crop photo
        </h2>
        <p className="mt-1 text-[12px] text-ink-soft">Drag to reposition, use the slider to zoom.</p>

        <div className="mt-4 flex justify-center">
          <canvas
            ref={canvasRef}
            width={VIEWPORT_SIZE}
            height={VIEWPORT_SIZE}
            className="cursor-move touch-none rounded-full border border-border"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => onZoomChange(Number(event.target.value))}
          className="mt-4 w-full"
          aria-label="Zoom"
        />

        <label className="mt-4 flex items-start gap-2 text-[12px] text-ink-soft">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5"
          />
          I consent to this photo being stored as part of this employee&apos;s record.
        </label>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-btn border border-border px-[18px] py-[9px] text-[12.5px] font-extrabold text-ink"
          >
            Cancel
          </button>
          <Button type="button" disabled={!imageReady || !consent} onClick={handleConfirm}>
            Save photo
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
