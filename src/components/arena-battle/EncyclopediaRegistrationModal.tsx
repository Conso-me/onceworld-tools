import { useState, useCallback, useRef, useEffect } from "react";
import { getAllMonsterNames } from "../../data/monsters";
import { computeDHashFromRegion, hammingDistance, hashToHex, hexToHash } from "../../utils/imageHash";
import { saveTemplates, clearAllTemplates, getAllTemplates, exportTemplates, importTemplates, type MonsterTemplate } from "../../utils/monsterTemplateDB";
import { useMonsterTemplates } from "../../hooks/useMonsterTemplates";

interface CroppedIcon {
  dataUrl: string;
  hash: string;
  assignedName: string;
}

interface Props {
  onClose: () => void;
}

// ── ユーティリティ ──────────────────────────────────────────────────────────

function createThumbnail(canvas: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number): string {
  const c = document.createElement("canvas");
  c.width = 48; c.height = 48;
  c.getContext("2d")!.drawImage(canvas, sx, sy, sw, sh, 0, 0, 48, 48);
  return c.toDataURL("image/png");
}

function isDuplicateHash(hash: string, existing: CroppedIcon[]): boolean {
  const h = hexToHash(hash);
  for (const icon of existing) {
    if (hammingDistance(h, hexToHash(icon.hash)) <= 5) return true;
  }
  return false;
}

function findDuplicateOf(hash: string, ...lists: CroppedIcon[][]): string | null {
  const h = hexToHash(hash);
  for (const list of lists) {
    for (const icon of list) {
      const dist = hammingDistance(h, hexToHash(icon.hash));
      if (dist <= 5) return `${icon.assignedName}(dist=${dist},hash=${icon.hash})`;
    }
  }
  return null;
}

// ── 図鑑グリッド自動検出 ──────────────────────────────────────────────────────

function autoDetectEncyclopediaGrid(
  img: HTMLImageElement,
): { gridX: number; gridY: number; cellW: number; cellH: number } | null {
  const maxW = 500;
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // 高彩度ピクセルを検出（色相不問 → 全色のボーダーを捕捉）
  const isBorder = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max > 0 ? (max - min) / max : 0;
    if (sat > 0.35 && max > 80) {
      isBorder[i / 4] = 1;
    }
  }

  const yStart = Math.round(h * 0.08);
  const yEnd = Math.round(h * 0.96);

  // ── 垂直プロジェクション → gridX, cellW ──────────────────────────
  const vProj = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    for (let y = yStart; y < yEnd; y++) {
      vProj[x] += isBorder[y * w + x];
    }
  }

  const smoothed = smoothArray(vProj, 3);
  const maxVal = Math.max(...smoothed);
  if (maxVal === 0) return null;
  const threshold = maxVal * 0.3;

  // 全ピークを検出
  const peaks: number[] = [];
  for (let x = 2; x < w - 2; x++) {
    if (smoothed[x] > threshold && smoothed[x] >= smoothed[x - 1] && smoothed[x] >= smoothed[x + 1]) {
      peaks.push(x);
    }
  }
  if (peaks.length < 2) return null;

  // 近接ピーク(5px以内)を統合（最大値を残す）
  const dedupedPeaks: number[] = [];
  for (const p of peaks) {
    if (dedupedPeaks.length > 0 && p - dedupedPeaks[dedupedPeaks.length - 1] < 5) {
      if (smoothed[p] > smoothed[dedupedPeaks[dedupedPeaks.length - 1]]) {
        dedupedPeaks[dedupedPeaks.length - 1] = p;
      }
    } else {
      dedupedPeaks.push(p);
    }
  }
  if (dedupedPeaks.length < 2) return null;

  // autocorrelation で大まかな cellW を推定
  const minLag = Math.round(w * 0.08);
  const maxLag = Math.round(w * 0.4);
  let bestLag = minLag;
  let bestCorr = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let x = 0; x < w - lag; x++) {
      corr += smoothed[x] * smoothed[x + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const gridXScaled = dedupedPeaks[0];
  const cellWScaled = bestLag;

  // (ピーク重複除去は gridX 検出の安定化のみに使用。cellW は autocorrelation のまま)

  // ── 水平プロジェクション → gridY, cellH ──────────────────────────
  const xR = Math.min(w, gridXScaled + cellWScaled * 4 + 5);
  const hProj = new Float64Array(h);
  for (let y = yStart; y < yEnd; y++) {
    for (let x = gridXScaled; x < xR; x++) {
      hProj[y] += isBorder[y * w + x];
    }
  }

  const hSmoothed = smoothArray(hProj, 3);
  const hMaxVal = Math.max(...hSmoothed);
  const hThreshold = hMaxVal * 0.3;

  // 上端ピーク = gridY
  let gridYScaled = -1;
  for (let y = yStart; y < yEnd; y++) {
    if (hSmoothed[y] > hThreshold && hSmoothed[y] >= hSmoothed[y - 1] && hSmoothed[y] >= hSmoothed[y + 1]) {
      gridYScaled = y;
      break;
    }
  }
  if (gridYScaled < 0) gridYScaled = yStart;

  // 2本目のピーク → 差分 = cellH
  let cellHScaled = cellWScaled; // フォールバック: 正方形
  const minRowGap = Math.round(cellWScaled * 0.9); // セルは幅以上の高さがあるため
  for (let y = gridYScaled + minRowGap; y < yEnd; y++) {
    if (hSmoothed[y] > hThreshold && hSmoothed[y] >= hSmoothed[y - 1] && hSmoothed[y] >= hSmoothed[y + 1]) {
      cellHScaled = y - gridYScaled;
      break;
    }
  }

  const cellW = Math.round(cellWScaled / scale);
  const cellH = Math.round(cellHScaled / scale);
  const gridX = Math.round(gridXScaled / scale);
  const gridY = Math.round(gridYScaled / scale);

  console.log(`[autoDetect] peaks=${dedupedPeaks.length}, cellW=${cellW}, cellH=${cellH}, grid=(${gridX},${gridY})`);
  return { gridX, gridY, cellW, cellH };
}

function smoothArray(arr: Float64Array, r: number): Float64Array {
  const out = new Float64Array(arr.length);
  for (let i = r; i < arr.length - r; i++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += arr[i + k];
    out[i] = s / (2 * r + 1);
  }
  return out;
}

// ── ドラッグ種別 ─────────────────────────────────────────────────────────────

type DragType = "move" | "width" | "height" | null;
const HANDLE_R = 7;

// ── コンポーネント ────────────────────────────────────────────────────────

export function EncyclopediaRegistrationModal({ onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [icons, setIcons] = useState<CroppedIcon[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // グリッドパラメータ
  const gridDetectedRef = useRef(false);
  const [gridX, setGridX] = useState(0);
  const [gridY, setGridY] = useState(0);
  const [cellW, setCellW] = useState(0);
  const [cellH, setCellH] = useState(0);
  const [padTop, setPadTop] = useState(4);
  const [padBottom, setPadBottom] = useState(4);
  const [padLeft, setPadLeft] = useState(4);
  const [padRight, setPadRight] = useState(4);

  const [startIndex, setStartIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingAutoProcess, setPendingAutoProcess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawPreviewRef = useRef<() => void>(() => {});
  const { templateCount } = useMonsterTemplates();
  const monsterNames = useRef<string[]>([]);

  // ドラッグ状態
  const dragRef = useRef<{
    type: DragType;
    startMouseX: number;
    startMouseY: number;
    startGridX: number;
    startGridY: number;
    startCellW: number;
    startCellH: number;
  } | null>(null);

  useEffect(() => { monsterNames.current = getAllMonsterNames(); }, []);

  // 既存テンプレート数から開始番号を自動設定
  useEffect(() => {
    getAllTemplates().then((t) => {
      if (t.length > 0 && icons.length === 0) {
        setStartIndex(t.length);
      }
    });
  }, []);

  // ── プレビュー描画 ─────────────────────────────────────────────────────

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || img.width === 0) return;

    const dw = canvas.width;
    const scale = dw / img.width;
    const dh = Math.round(img.height * scale);
    canvas.height = dh;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, dw, dh);

    const gx = gridX * scale, gy = gridY * scale;
    const cw = cellW * scale, ch = cellH * scale;
    const rows = ch > 0 ? Math.floor((img.height * scale - gy) / ch) : 0;
    const gridRight = gx + cw * 4;
    const gridBottom = gy + ch * rows;

    // 除外領域
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.fillRect(0, 0, dw, gy);
    ctx.fillRect(0, gridBottom, dw, dh - gridBottom);
    ctx.fillRect(0, gy, gx, gridBottom - gy);
    ctx.fillRect(gridRight, gy, dw - gridRight, gridBottom - gy);

    // グリッド線
    ctx.strokeStyle = "rgba(99, 102, 241, 0.8)";
    ctx.lineWidth = 1.5;
    for (let r = 0; r <= rows; r++) {
      const y = gy + r * ch;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gridRight, y); ctx.stroke();
    }
    for (let c = 0; c <= 4; c++) {
      const x = gx + c * cw;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gridBottom); ctx.stroke();
    }

    // 切り出し範囲（黄色点線）
    const pl = padLeft * scale, pr = padRight * scale;
    const pt = padTop * scale, pb = padBottom * scale;
    if (pl > 0 || pr > 0 || pt > 0 || pb > 0) {
      ctx.strokeStyle = "rgba(234, 179, 8, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.strokeRect(gx + c * cw + pl, gy + r * ch + pt, cw - pl - pr, ch - pt - pb);
        }
      }
      ctx.setLineDash([]);
    }

    // ハンドル
    const drawHandle = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, HANDLE_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    };
    drawHandle(gx, gy, "rgba(99, 102, 241, 0.9)");
    drawHandle(gridRight, gy + (gridBottom - gy) / 2, "rgba(16, 185, 129, 0.9)");
    drawHandle(gx + (gridRight - gx) / 2, gridBottom, "rgba(245, 158, 11, 0.9)");
  }, [gridX, gridY, cellW, cellH, padTop, padBottom, padLeft, padRight]);

  drawPreviewRef.current = drawPreview;
  useEffect(() => { drawPreview(); }, [drawPreview]);

  // ── マウスイベント ─────────────────────────────────────────────────────

  const getImgCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cssToCanvas = canvas.width / rect.width;
    const canvasToImg = imgRef.current!.width / canvas.width;
    return {
      x: (e.clientX - rect.left) * cssToCanvas * canvasToImg,
      y: (e.clientY - rect.top) * cssToCanvas * canvasToImg,
    };
  }, []);

  const detectHandle = useCallback((mx: number, my: number): DragType => {
    const canvas = canvasRef.current!;
    const img = imgRef.current!;
    const hitR = (HANDLE_R / (canvas.width / img.width)) * 2;

    const rows = cellH > 0 ? Math.floor((img.height - gridY) / cellH) : 0;
    const gridRight = gridX + cellW * 4;
    const gridBottom = gridY + cellH * rows;

    if (Math.hypot(mx - gridX, my - gridY) < hitR) return "move";
    if (Math.hypot(mx - gridRight, my - (gridY + gridBottom) / 2) < hitR) return "width";
    if (Math.hypot(mx - (gridX + gridRight) / 2, my - gridBottom) < hitR) return "height";
    if (mx >= gridX && mx <= gridRight && my >= gridY && my <= gridBottom) return "move";
    return null;
  }, [gridX, gridY, cellW, cellH]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imgRef.current) return;
    const { x, y } = getImgCoords(e);
    const type = detectHandle(x, y);
    if (!type) return;
    e.preventDefault();
    dragRef.current = {
      type, startMouseX: x, startMouseY: y,
      startGridX: gridX, startGridY: gridY, startCellW: cellW, startCellH: cellH,
    };
  }, [getImgCoords, detectHandle, gridX, gridY, cellW, cellH]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imgRef.current) return;
    const { x, y } = getImgCoords(e);
    const d = dragRef.current;
    if (d && d.type) {
      const dx = x - d.startMouseX;
      const dy = y - d.startMouseY;
      if (d.type === "move") {
        setGridX(Math.max(0, d.startGridX + dx));
        setGridY(Math.max(0, d.startGridY + dy));
      } else if (d.type === "width") {
        setCellW(Math.max(20, Math.round(d.startCellW + dx / 4)));
      } else if (d.type === "height") {
        const rows = d.startCellH > 0 ? Math.floor((imgRef.current!.height - d.startGridY) / d.startCellH) : 1;
        setCellH(Math.max(20, Math.round(d.startCellH + dy / Math.max(1, rows))));
      }
      return;
    }
    const canvas = canvasRef.current!;
    const handle = detectHandle(x, y);
    canvas.style.cursor = handle === "move" ? "move" : handle === "width" ? "ew-resize" : handle === "height" ? "ns-resize" : "default";
  }, [getImgCoords, detectHandle]);

  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // ── ファイル選択 → 自動検出 → 自動切り出し ─────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setFile(f);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(f);
    setImageUrl(url);
    setError(null);
    setSavedMessage(null);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;

      // 既に検出済みなら gridY のみ再検出（スクロール位置が変わるため）
      if (gridDetectedRef.current) {
        const detected = autoDetectEncyclopediaGrid(img);
        if (detected) setGridY(detected.gridY);
        setPendingAutoProcess(true);
      } else {
        // 初回: 自動検出を試行
        const detected = autoDetectEncyclopediaGrid(img);
        if (detected) {
          setGridX(detected.gridX);
          setGridY(detected.gridY);
          setCellW(detected.cellW);
          setCellH(detected.cellH);
          setPadTop(Math.round(detected.cellH * 0.12));
          setPadBottom(Math.round(detected.cellH * 0.50));
          setPadLeft(Math.round(detected.cellW * 0.06));
          setPadRight(Math.round(detected.cellW * 0.45));
          gridDetectedRef.current = true;
          setPendingAutoProcess(true);
        } else {
          // フォールバック: デフォルト値
          const x = Math.round(img.width * 0.02);
          const y = Math.round(img.height * 0.15);
          const w = Math.round((img.width * 0.93) / 4);
          setGridX(x); setGridY(y); setCellW(w); setCellH(w);
        }
      }

      requestAnimationFrame(() => drawPreviewRef.current());
    };
    img.src = url;
  }, [imageUrl]);

  // ── 切り出し処理（追加方式） ─────────────────────────────────────────

  const processImage = useCallback(async () => {
    const img = imgRef.current;
    if (!img || cellW <= 0 || cellH <= 0) return;
    setIsProcessing(true);
    setError(null);
    setSavedMessage(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // DB保存済みテンプレートを取得し、重複チェック用に変換
      const dbTemplates = await getAllTemplates();
      const dbIcons: CroppedIcon[] = dbTemplates.map((t) => ({
        dataUrl: "",
        hash: t.hash,
        assignedName: t.name,
      }));

      const names = monsterNames.current;
      const rows = Math.floor((img.height - gridY) / cellH);
      const newIcons: CroppedIcon[] = [];
      let skippedRegistered = 0;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 4; col++) {
          const cx = gridX + col * cellW + padLeft;
          const cy = gridY + row * cellH + padTop;
          const cw = cellW - padLeft - padRight;
          const ch = cellH - padTop - padBottom;

          if (cx < 0 || cy < 0 || cx + cw > img.width || cy + ch > img.height || cw <= 0 || ch <= 0) {
            console.log(`[crop] SKIP row=${row} col=${col} reason=bounds cx=${cx} cy=${cy} cw=${cw} ch=${ch} imgW=${img.width} imgH=${img.height}`);
            continue;
          }

          // ボーダー/暗背景の影響を排除するため中央70%からハッシュ計算
          const hm = Math.round(cw * 0.15);
          const vm = Math.round(ch * 0.15);
          const hash = computeDHashFromRegion(ctx, cx + hm, cy + vm, cw - 2 * hm, ch - 2 * vm);
          const hashHex = hashToHex(hash);

          // DB保存済みテンプレートとの照合
          const dbDup = findDuplicateOf(hashHex, dbIcons);
          if (dbDup) {
            console.log(`[crop] SKIP row=${row} col=${col} reason=already-registered matchedWith=${dbDup}`);
            skippedRegistered++;
            continue;
          }

          // 同一セッション内の重複チェック
          const dupTarget = findDuplicateOf(hashHex, icons, newIcons);
          if (dupTarget) {
            console.log(`[crop] SKIP row=${row} col=${col} reason=duplicate hash=${hashHex} matchedWith=${dupTarget}`);
            continue;
          }

          const dataUrl = createThumbnail(canvas, cx, cy, cw, ch);
          const nameIdx = startIndex + icons.length + newIcons.length;
          const assignedName = nameIdx < names.length ? names[nameIdx] : `不明 ${nameIdx + 1}`;
          newIcons.push({ dataUrl, hash: hashHex, assignedName });
        }
      }

      if (newIcons.length === 0) {
        setError(skippedRegistered > 0
          ? `新しいアイコンが検出できませんでした（${skippedRegistered}体は登録済み）`
          : "新しいアイコンが検出できませんでした（すべて登録済みか空セルです）");
      } else {
        setIcons((prev) => [...prev, ...newIcons]);
        if (skippedRegistered > 0) {
          setSavedMessage(`${skippedRegistered}体スキップ（登録済み）、${newIcons.length}体新規追加`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  }, [gridX, gridY, cellW, cellH, padTop, padBottom, padLeft, padRight, startIndex, icons]);

  // 自動切り出し: state更新後の次のレンダーで実行
  useEffect(() => {
    if (pendingAutoProcess && imgRef.current && cellW > 0 && cellH > 0) {
      setPendingAutoProcess(false);
      processImage();
    }
  }, [pendingAutoProcess, processImage, cellW, cellH]);

  // ── アイコン操作 ─────────────────────────────────────────────────────

  const updateIconName = useCallback((index: number, name: string) => {
    setIcons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], assignedName: name };
      return next;
    });
  }, []);

  const removeIcon = useCallback((index: number) => {
    setIcons((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const names = monsterNames.current;
      for (let i = index; i < next.length; i++) {
        const nameIdx = startIndex + i;
        next[i] = { ...next[i], assignedName: nameIdx < names.length ? names[nameIdx] : `不明 ${nameIdx + 1}` };
      }
      return next;
    });
  }, [startIndex]);

  const resetIcons = useCallback(() => {
    setIcons([]);
    getAllTemplates().then((t) => setStartIndex(t.length));
  }, []);

  const handleSave = useCallback(async () => {
    if (icons.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const templates: MonsterTemplate[] = icons.map((icon) => ({
        name: icon.assignedName,
        hash: icon.hash,
        imageDataUrl: icon.dataUrl,
        registeredAt: Date.now(),
      }));
      await saveTemplates(templates);
      const allSaved = await getAllTemplates();
      setStartIndex(allSaved.length);
      setSavedMessage(`${templates.length}体を登録しました`);
      setIcons([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [icons]);

  const handleClearAll = useCallback(async () => {
    await clearAllTemplates();
    setConfirmClear(false);
    setIcons([]);
    setStartIndex(0);
  }, []);

  const handleExport = useCallback(async () => {
    const json = await exportTemplates();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monster-templates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const count = await importTemplates(text);
      setSavedMessage(`${count}体のテンプレートをインポートしました`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "インポートに失敗しました");
    }
    e.target.value = "";
  }, []);

  // ── レンダリング ─────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">図鑑からテンプレート登録</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{templateCount + icons.length}/109</span>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              ×
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          図鑑スクリーンショットをアップロードすると自動でモンスターを切り出します。
        </p>

        {/* データ管理 */}
        <input ref={importInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
          <span className="text-xs text-gray-500">{templateCount}件登録済み</span>
          <div className="flex items-center gap-1.5">
            {templateCount > 0 && (
              <button onClick={handleExport}
                className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200">
                エクスポート
              </button>
            )}
            <button onClick={() => importInputRef.current?.click()}
              className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200">
              インポート
            </button>
            {templateCount > 0 && (
              <>
                {confirmClear ? (
                  <>
                    <span className="text-xs text-red-500">全削除?</span>
                    <button onClick={handleClearAll}
                      className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600">OK</button>
                    <button onClick={() => setConfirmClear(false)}
                      className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300">やめる</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmClear(true)}
                    className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 border border-red-200">
                    全削除
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ファイル選択 */}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

        {imageUrl ? (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
            <span className="text-sm text-gray-700 truncate">{file?.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => inputRef.current?.click()}
                className="text-xs bg-white px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">
                次の画像
              </button>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                No.
                <input type="number" min={0} max={108} value={startIndex + 1}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 1) setStartIndex(v - 1);
                  }}
                  className="w-14 px-1.5 py-0.5 text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </label>
            </div>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">
            図鑑スクリーンショットを選択
          </button>
        )}

        {isProcessing && (
          <div className="text-xs text-gray-500 text-center py-2">自動切り出し中...</div>
        )}

        {/* 詳細設定（折りたたみ） */}
        {imageUrl && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50"
            >
              <span>詳細設定（グリッド調整・余白）</span>
              <span>{showDetails ? "▲" : "▼"}</span>
            </button>

            {showDetails && (
              <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
                <div className="flex items-center gap-2 pt-2 text-xs text-gray-500">
                  <button
                    onClick={() => {
                      if (!imgRef.current) return;
                      const detected = autoDetectEncyclopediaGrid(imgRef.current);
                      if (detected) {
                        setGridX(detected.gridX); setGridY(detected.gridY);
                        setCellW(detected.cellW); setCellH(detected.cellH);
                        setPadTop(Math.round(detected.cellH * 0.12));
                        setPadBottom(Math.round(detected.cellH * 0.50));
                        setPadLeft(Math.round(detected.cellW * 0.06));
                        setPadRight(Math.round(detected.cellW * 0.45));
                        gridDetectedRef.current = true;
                      } else {
                        setError("グリッドを自動検出できませんでした");
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200"
                  >
                    自動検出
                  </button>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500"></span>移動
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>幅
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>高さ
                  </span>
                </div>
                <canvas
                  ref={canvasRef}
                  width={400}
                  className="w-full max-w-sm mx-auto rounded-xl border border-gray-200 select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto text-xs text-gray-600">
                  {([["上", padTop, setPadTop], ["下", padBottom, setPadBottom], ["左", padLeft, setPadLeft], ["右", padRight, setPadRight]] as const).map(([label, val, setter]) => (
                    <label key={label} className="flex items-center gap-1">
                      <span>{label}</span>
                      <input type="number" min={0} max={200} value={val}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 0) setter(Math.min(v, 200)); }}
                        className="w-12 px-1 py-0.5 text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </label>
                  ))}
                </div>
                <button onClick={processImage} disabled={isProcessing}
                  className={`w-full py-2 rounded-xl text-sm font-bold transition-colors ${
                    !isProcessing ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}>
                  {isProcessing ? "処理中..." : "再切り出し"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 切り出し結果 */}
        {icons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">
                切り出し済み ({icons.length}体)
              </span>
              <button onClick={resetIcons} className="text-xs text-gray-400 hover:text-red-500">リセット</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[35vh] overflow-y-auto">
              {icons.map((icon, i) => (
                <div key={i} className="relative border border-gray-200 rounded-lg p-1.5 bg-gray-50 group">
                  <button onClick={() => removeIcon(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                  <img src={icon.dataUrl} alt={icon.assignedName} className="w-12 h-12 mx-auto rounded" />
                  <input type="text" value={icon.assignedName}
                    onChange={(e) => updateIconName(i, e.target.value)}
                    className="w-full mt-1 text-xs text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {savedMessage && <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2">{savedMessage}</div>}
        {error && <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</div>}

        {/* 保存 */}
        {icons.length > 0 && (
          <button onClick={handleSave} disabled={isSaving}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
              !isSaving ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}>
            {isSaving ? "保存中..." : `${icons.length}体のテンプレートを保存`}
          </button>
        )}
      </div>
    </div>
  );
}
