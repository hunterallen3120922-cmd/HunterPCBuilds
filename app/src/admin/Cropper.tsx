import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Crop } from "./resize";

/** Crop shapes to pick from. "Card" is the shape of the home carousel and Past builds cards. */
const SHAPES: { label: string; ratio: number | null | "original" }[] = [
  { label: "Free", ratio: null },
  { label: "Card 4:3", ratio: 4 / 3 },
  { label: "Tall 3:4", ratio: 3 / 4 },
  { label: "Square", ratio: 1 },
  { label: "Original", ratio: "original" },
];

type Corner = "nw" | "ne" | "sw" | "se";
type Drag = { kind: "move" | Corner; x0: number; y0: number; start: Crop };

/**
 * Crop a photo before it goes on the site: drag the box to move it, drag a corner to resize, pick a shape.
 * Live previews show how it will look on a Past builds / home carousel card and in the PC Builds slideshow.
 */
export default function Cropper({ img, name, onDone, onSkip }: {
  img: ImageBitmap; name: string; onDone: (crop: Crop) => void; onSkip: () => void;
}) {
  const W = img.width, H = img.height;
  const full: Crop = { x: 0, y: 0, w: W, h: H };
  const dialog = useRef<HTMLDialogElement>(null);
  const [crop, setCrop] = useState<Crop>(full);
  const [shape, setShape] = useState(0);
  const ratio = SHAPES[shape].ratio === "original" ? W / H : (SHAPES[shape].ratio as number | null);

  // Size the photo to fit the window
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    if (!box) return;
    const ro = new ResizeObserver(() => setBoxW(box.clientWidth));
    ro.observe(box);
    return () => ro.disconnect();
  }, [box]);
  const scale = boxW ? Math.min(boxW / W, Math.min(window.innerHeight * 0.55, 560) / H) : 0;

  useEffect(() => { dialog.current?.showModal(); }, []);

  // Draw the photo
  const main = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = main.current;
    if (!c || !scale) return;
    c.width = Math.round(W * scale);
    c.height = Math.round(H * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  }, [img, scale, W, H]);

  // Live previews
  const card = useRef<HTMLCanvasElement>(null);
  const slide = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cc = card.current, sc = slide.current;
    if (cc) { // card: 4:3, the whole crop shown, with a blurred copy filling the bars (like the site's Photo)
      const ctx = cc.getContext("2d")!;
      const W = cc.width, H = cc.height, cr = crop.w / crop.h;
      const coverW = cr > W / H ? H * cr : W, coverH = cr > W / H ? H : W / cr;
      ctx.clearRect(0, 0, W, H);
      ctx.filter = "blur(8px) brightness(.55)";
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, (W - coverW * 1.1) / 2, (H - coverH * 1.1) / 2, coverW * 1.1, coverH * 1.1);
      ctx.filter = "none";
      const fitW = cr > W / H ? W : H * cr, fitH = cr > W / H ? W / cr : H;
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, (W - fitW) / 2, (H - fitH) / 2, fitW, fitH);
    }
    if (sc) { // slideshow: the frame takes the photo's own shape
      const s = Math.min(150 / crop.w, 150 / crop.h);
      sc.width = Math.round(crop.w * s);
      sc.height = Math.round(crop.h * s);
      sc.getContext("2d")!.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, sc.width, sc.height);
    }
  }, [img, crop]);

  // Largest box of the chosen shape, centred where the current box is
  const pickShape = (i: number) => {
    setShape(i);
    const r = SHAPES[i].ratio === "original" ? W / H : (SHAPES[i].ratio as number | null);
    if (!r) return;
    const w = Math.min(W, H * r), h = w / r;
    const cx = crop.x + crop.w / 2, cy = crop.y + crop.h / 2;
    setCrop({ w, h, x: clamp(cx - w / 2, 0, W - w), y: clamp(cy - h / 2, 0, H - h) });
  };

  const drag = useRef<Drag | null>(null);
  const down = (kind: Drag["kind"]) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, x0: e.clientX, y0: e.clientY, start: crop };
  };
  const move = (e: ReactPointerEvent) => {
    const g = drag.current;
    if (!g || !scale) return;
    const dx = (e.clientX - g.x0) / scale, dy = (e.clientY - g.y0) / scale;
    const s = g.start;
    if (g.kind === "move") {
      setCrop({ ...s, x: clamp(s.x + dx, 0, W - s.w), y: clamp(s.y + dy, 0, H - s.h) });
      return;
    }
    const east = g.kind.includes("e"), south = g.kind.includes("s");
    const ax = east ? s.x : s.x + s.w, ay = south ? s.y : s.y + s.h; // the corner that stays put
    const min = Math.max(24, Math.min(W, H) * 0.06);
    const maxW = east ? W - ax : ax, maxH = south ? H - ay : ay;
    const mx = (east ? s.x + s.w : s.x) + dx, my = (south ? s.y + s.h : s.y) + dy; // where the dragged corner is now
    let w = Math.max(min, east ? mx - ax : ax - mx);
    let h = Math.max(min, south ? my - ay : ay - my);
    if (ratio) {
      if (w / ratio < h) w = h * ratio;
      w = Math.min(w, maxW, maxH * ratio);
      h = w / ratio;
    } else {
      w = Math.min(w, maxW);
      h = Math.min(h, maxH);
    }
    setCrop({ w, h, x: east ? ax : ax - w, y: south ? ay : ay - h });
  };
  const up = () => { drag.current = null; };

  const px = (v: number) => `${v * scale}px`;
  const outW = Math.round(Math.min(1, 1600 / Math.max(crop.w, crop.h)) * crop.w);
  const outH = Math.round(Math.min(1, 1600 / Math.max(crop.w, crop.h)) * crop.h);

  return (
    <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); onSkip(); }}
      className="m-auto w-[min(96vw,60rem)] rounded-card border border-line bg-card p-0 text-ink">
      <div className="max-h-[94vh] overflow-y-auto p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl">Crop photo</h2>
          <span className="truncate text-[.8rem] text-muted">{name}</span>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Crop shape">
          {SHAPES.map((s, i) => (
            <button key={s.label} type="button" onClick={() => pickShape(i)} aria-pressed={shape === i}
              className={`rounded-full border px-3 py-1 text-[.8rem] ${shape === i ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-muted hover:text-ink"}`}>
              {s.label}
            </button>
          ))}
          <button type="button" onClick={() => { setShape(0); setCrop(full); }} className="ml-auto text-[.8rem] text-muted underline hover:text-ink">Reset</button>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_11rem]">
          <div ref={setBox} className="flex justify-center">
            <div className="relative select-none overflow-hidden rounded-md" style={{ width: px(W), height: px(H) }}
              onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
              <canvas ref={main} className="block" style={{ width: px(W), height: px(H) }} />
              {scale > 0 && (
                <div onPointerDown={down("move")} aria-label="Crop area: drag to move"
                  className="absolute cursor-move touch-none border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,.6)]"
                  style={{ left: px(crop.x), top: px(crop.y), width: px(crop.w), height: px(crop.h) }}>
                  {/* rule-of-thirds guides */}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33.2%,rgba(255,255,255,.25)_33.3%,transparent_33.5%,transparent_66.5%,rgba(255,255,255,.25)_66.6%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,rgba(255,255,255,.25)_33.3%,transparent_33.5%,transparent_66.5%,rgba(255,255,255,.25)_66.6%,transparent_66.8%)]" />
                  {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
                    <div key={c} onPointerDown={down(c)} aria-label={`Resize from ${c} corner`}
                      className={`absolute h-5 w-5 touch-none rounded-sm border-2 border-white bg-accent ${c[0] === "n" ? "-top-2.5" : "-bottom-2.5"} ${c[1] === "w" ? "-left-2.5" : "-right-2.5"} ${c === "nw" || c === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-row flex-wrap gap-4 md:flex-col">
            <div>
              <p className="mb-1.5 text-[.75rem] text-muted">Past builds &amp; home carousel</p>
              <canvas ref={card} width={160} height={120} className="block rounded-md border border-line" />
            </div>
            <div>
              <p className="mb-1.5 text-[.75rem] text-muted">PC Builds slideshow</p>
              <div className="grid h-[150px] w-[160px] place-items-center rounded-md border border-line bg-bg2">
                <canvas ref={slide} className="block rounded-sm" />
              </div>
            </div>
            <p className="text-[.72rem] text-muted">Saved at {outW} × {outH}</p>
          </div>
        </div>

        <p className="mt-3 text-[.8rem] text-muted">Drag the box to move it, drag a corner to resize.</p>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={onSkip}>Don't add this photo</button>
          <button type="button" className="btn btn-ghost" onClick={() => onDone(full)}>Use whole photo</button>
          <button type="button" className="btn" onClick={() => onDone(crop)}>Use crop</button>
        </div>
      </div>
    </dialog>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
