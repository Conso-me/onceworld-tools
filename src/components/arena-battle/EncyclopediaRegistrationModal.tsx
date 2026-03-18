import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { getAllMonsterNames } from "../../data/monsters";
import { computeDHashFromRegion, hashToHex } from "../../utils/imageHash";
import {
  saveTemplates,
  saveTemplate,
  deleteTemplate,
  clearAllTemplates,
  getAllTemplates,
  exportTemplates,
  importTemplates,
  type MonsterTemplate,
} from "../../utils/monsterTemplateDB";
import { useMonsterTemplates } from "../../hooks/useMonsterTemplates";
import staticTemplatesJson from "../../../docs/data/monsterTemplates.json";

interface Props {
  onClose: () => void;
}

const DEFAULT_CROP_RATIO = { x: 0.03, y: 0.13, w: 0.37, h: 0.27 };

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

interface BatchItem {
  name: string;
  hash: string;
  imageDataUrl: string;
}

export function EncyclopediaRegistrationModal({ onClose }: Props) {
  // ── タブ・ステップ ──
  const [tab, setTab] = useState<"batch" | "registry">("batch");
  const [batchStep, setBatchStep] = useState<1 | 2>(1);

  // ── クロップ比率（0〜1）──
  const [cropRatioX, setCropRatioX] = useState(DEFAULT_CROP_RATIO.x);
  const [cropRatioY, setCropRatioY] = useState(DEFAULT_CROP_RATIO.y);
  const [cropRatioW, setCropRatioW] = useState(DEFAULT_CROP_RATIO.w);
  const [cropRatioH, setCropRatioH] = useState(DEFAULT_CROP_RATIO.h);

  // ── Step 1: 基準画像 ──
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageLoadKey, setImageLoadKey] = useState(0);

  // ── Step 2: バッチ処理 ──
  const [files, setFiles] = useState<File[]>([]);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [saving, setSaving] = useState(false);

  // ── 開始番号 ──
  const [startIndex, setStartIndex] = useState(0);
  const [skipRegistered, setSkipRegistered] = useState(true);

  // ── 登録一覧タブ ──
  const [registryTarget, setRegistryTarget] = useState<string | null>(null);
  const [individualResult, setIndividualResult] = useState<BatchItem | null>(null);

  // ── メッセージ ──
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // ── refs ──
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const individualInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startMouseX: number;
    startMouseY: number;
    startRatioX: number;
    startRatioY: number;
    startRatioW: number;
    startRatioH: number;
  } | null>(null);

  const { templates, templateCount } = useMonsterTemplates();
  const allNames = useRef<string[]>([]);

  useEffect(() => {
    allNames.current = getAllMonsterNames();
  }, []);

  // 登録済みセット（表示・フィルタ共用）
  const registeredSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of staticTemplatesJson as { name: string }[]) set.add(t.name);
    for (const t of templates) set.add(t.name);
    return set;
  }, [templates]);

  // 未登録の先頭インデックスを初期値にする
  useEffect(() => {
    const names = allNames.current;
    const idx = names.findIndex((n) => !registeredSet.has(n));
    if (idx >= 0 && files.length === 0 && batchItems.length === 0) {
      setStartIndex(idx);
    }
  }, [registeredSet, files.length, batchItems.length]);

  // テンプレートマップ（登録一覧用）
  const templateMap = new Map<string, MonsterTemplate>();
  for (const t of templates) templateMap.set(t.name, t);

  // ── プレビュー描画 + サムネイル更新 ──

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

    const cx = cropRatioX * img.width * scale;
    const cy = cropRatioY * img.height * scale;
    const cw = cropRatioW * img.width * scale;
    const ch = cropRatioH * img.height * scale;

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, dw, cy);
    ctx.fillRect(0, cy + ch, dw, dh - cy - ch);
    ctx.fillRect(0, cy, cx, ch);
    ctx.fillRect(cx + cw, cy, dw - cx - cw, ch);

    ctx.strokeStyle = "rgba(99, 102, 241, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    const hs = 8;
    ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
    for (const [hx, hy] of [[cx, cy], [cx + cw, cy], [cx, cy + ch], [cx + cw, cy + ch]]) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }

    const skipY = cy + ch * 0.25;
    ctx.strokeStyle = "rgba(234, 179, 8, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, skipY);
    ctx.lineTo(cx + cw, skipY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(234, 179, 8, 0.8)";
    ctx.fillText("↑ skipTopLeft 25%", cx + 4, skipY - 3);

    // 48×48 サムネイルプレビュー
    const thumbCanvas = thumbCanvasRef.current;
    if (thumbCanvas) {
      const tctx = thumbCanvas.getContext("2d")!;
      tctx.clearRect(0, 0, 48, 48);
      tctx.drawImage(
        img,
        cropRatioX * img.width, cropRatioY * img.height,
        cropRatioW * img.width, cropRatioH * img.height,
        0, 0, 48, 48,
      );
    }
  }, [cropRatioX, cropRatioY, cropRatioW, cropRatioH]);

  // tab/step 切替・画像ロード時にもcanvasを再描画
  useEffect(() => { drawPreview(); }, [drawPreview, batchStep, tab, imageLoadKey]);

  // ── マウスイベント（比率ベース）──

  const getImgRatioCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const img = imgRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cssToCanvas = canvas.width / rect.width;
    const canvasX = (e.clientX - rect.left) * cssToCanvas;
    const canvasY = (e.clientY - rect.top) * cssToCanvas;
    const scale = canvas.width / img.width;
    return {
      rx: canvasX / scale / img.width,
      ry: canvasY / scale / img.height,
    };
  }, []);

  const detectHandle = useCallback((rx: number, ry: number): DragMode => {
    const hitR = 0.03;
    const cx2 = cropRatioX + cropRatioW;
    const cy2 = cropRatioY + cropRatioH;
    if (Math.hypot(rx - cropRatioX, ry - cropRatioY) < hitR) return "nw";
    if (Math.hypot(rx - cx2, ry - cropRatioY) < hitR) return "ne";
    if (Math.hypot(rx - cropRatioX, ry - cy2) < hitR) return "sw";
    if (Math.hypot(rx - cx2, ry - cy2) < hitR) return "se";
    if (rx >= cropRatioX && rx <= cx2 && ry >= cropRatioY && ry <= cy2) return "move";
    return null;
  }, [cropRatioX, cropRatioY, cropRatioW, cropRatioH]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imgRef.current) return;
    const { rx, ry } = getImgRatioCoords(e);
    const mode = detectHandle(rx, ry);
    if (!mode) return;
    e.preventDefault();
    dragRef.current = {
      mode,
      startMouseX: rx,
      startMouseY: ry,
      startRatioX: cropRatioX,
      startRatioY: cropRatioY,
      startRatioW: cropRatioW,
      startRatioH: cropRatioH,
    };
  }, [getImgRatioCoords, detectHandle, cropRatioX, cropRatioY, cropRatioW, cropRatioH]);

  const MIN_RATIO = 0.02;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imgRef.current) return;
    const { rx, ry } = getImgRatioCoords(e);
    const d = dragRef.current;
    if (d && d.mode) {
      const dx = rx - d.startMouseX;
      const dy = ry - d.startMouseY;
      if (d.mode === "move") {
        setCropRatioX(Math.max(0, Math.min(1 - d.startRatioW, d.startRatioX + dx)));
        setCropRatioY(Math.max(0, Math.min(1 - d.startRatioH, d.startRatioY + dy)));
      } else if (d.mode === "se") {
        setCropRatioW(Math.max(MIN_RATIO, Math.min(1 - d.startRatioX, d.startRatioW + dx)));
        setCropRatioH(Math.max(MIN_RATIO, Math.min(1 - d.startRatioY, d.startRatioH + dy)));
      } else if (d.mode === "nw") {
        const newX = Math.max(0, d.startRatioX + dx);
        const newY = Math.max(0, d.startRatioY + dy);
        setCropRatioW(d.startRatioW + (d.startRatioX - newX));
        setCropRatioH(d.startRatioH + (d.startRatioY - newY));
        setCropRatioX(newX);
        setCropRatioY(newY);
      } else if (d.mode === "ne") {
        const newY = Math.max(0, d.startRatioY + dy);
        setCropRatioW(Math.max(MIN_RATIO, Math.min(1 - d.startRatioX, d.startRatioW + dx)));
        setCropRatioH(d.startRatioH + (d.startRatioY - newY));
        setCropRatioY(newY);
      } else if (d.mode === "sw") {
        const newX = Math.max(0, d.startRatioX + dx);
        setCropRatioW(d.startRatioW + (d.startRatioX - newX));
        setCropRatioH(Math.max(MIN_RATIO, Math.min(1 - d.startRatioY, d.startRatioH + dy)));
        setCropRatioX(newX);
      }
      return;
    }
    const canvas = canvasRef.current!;
    const handle = detectHandle(rx, ry);
    canvas.style.cursor =
      handle === "move" ? "move" :
      handle === "nw" || handle === "se" ? "nwse-resize" :
      handle === "ne" || handle === "sw" ? "nesw-resize" :
      "default";
  }, [getImgRatioCoords, detectHandle]);

  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // ── 画像→テンプレート変換（共通ヘルパー）──

  const processImageForTemplate = useCallback(async (file: File, name: string): Promise<BatchItem> => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      const url = URL.createObjectURL(file);
      el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
      el.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`画像読み込み失敗: ${file.name}`)); };
      el.src = url;
    });

    const cx = Math.round(img.width * cropRatioX);
    const cy = Math.round(img.height * cropRatioY);
    const cw = Math.round(img.width * cropRatioW);
    const ch = Math.round(img.height * cropRatioH);

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const hash = computeDHashFromRegion(ctx, cx, cy, cw, ch);
    const hashHex = hashToHex(hash);

    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 48;
    thumbCanvas.height = 48;
    thumbCanvas.getContext("2d")!.drawImage(canvas, cx, cy, cw, ch, 0, 0, 48, 48);
    const imageDataUrl = thumbCanvas.toDataURL("image/png");

    return { name, hash: hashHex, imageDataUrl };
  }, [cropRatioX, cropRatioY, cropRatioW, cropRatioH]);

  // ── Step 1: 基準画像選択 ──

  const handleReferenceSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError(null);
    setSavedMessage(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setCropRatioX(DEFAULT_CROP_RATIO.x);
      setCropRatioY(DEFAULT_CROP_RATIO.y);
      setCropRatioW(DEFAULT_CROP_RATIO.w);
      setCropRatioH(DEFAULT_CROP_RATIO.h);
      setImageLoadKey((k) => k + 1);
    };
    img.src = url;
  }, [previewUrl]);

  // ── クロップ確定 → Step 2 ──

  const handleConfirmCrop = useCallback(() => {
    setBatchStep(2);
  }, []);

  // ── Step 2: バッチファイル選択 ──

  const handleBatchFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    const sorted = Array.from(selected).sort((a, b) => a.name.localeCompare(b.name));
    e.target.value = "";
    setFiles(sorted);
    setBatchItems([]);
    setError(null);
    setSavedMessage(null);
  }, []);

  // ── バッチ処理 ──

  const handleBatchProcess = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    setSavedMessage(null);
    setBatchItems([]);

    const names = allNames.current;
    const results: BatchItem[] = [];

    // 割り当て対象の名前リストを構築
    let targetNames: string[];
    if (skipRegistered) {
      targetNames = names.slice(startIndex).filter((n) => !registeredSet.has(n));
    } else {
      targetNames = names.slice(startIndex);
    }

    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`${i + 1}/${files.length} 処理中...`);
        const name = i < targetNames.length ? targetNames[i] : `Unknown_${startIndex + i}`;
        results.push(await processImageForTemplate(files[i], name));
      }
      setBatchItems(results);
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "処理に失敗しました");
    } finally {
      setProcessing(false);
    }
  }, [files, startIndex, processImageForTemplate, skipRegistered, registeredSet]);

  // ── 名前変更 ──

  const updateItemName = useCallback((index: number, name: string) => {
    setBatchItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    });
  }, []);

  // ── 一括保存 ──

  const handleBatchSave = useCallback(async () => {
    if (batchItems.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const templatesData: MonsterTemplate[] = batchItems.map((item) => ({
        name: item.name,
        hash: item.hash,
        imageDataUrl: item.imageDataUrl,
        registeredAt: Date.now(),
      }));
      await saveTemplates(templatesData);
      setSavedMessage(`${batchItems.length}体のテンプレートを一括登録しました`);
      setBatchItems([]);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [batchItems]);

  // ── データ管理 ──

  const handleClearAll = useCallback(async () => {
    await clearAllTemplates();
    setConfirmClear(false);
    setSavedMessage("カスタムテンプレートを全削除しました");
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

  const handleExportStaticJson = useCallback(async () => {
    const allTemplates = await getAllTemplates();
    const data = allTemplates.map((t) => ({ name: t.name, hash: t.hash }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monsterTemplates.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── 個別登録 ──

  const handleIndividualFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !registryTarget) return;
    e.target.value = "";
    try {
      const result = await processImageForTemplate(file, registryTarget);
      setIndividualResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "処理に失敗しました");
    }
  }, [registryTarget, processImageForTemplate]);

  const handleIndividualSave = useCallback(async () => {
    if (!individualResult) return;
    try {
      await saveTemplate({
        name: individualResult.name,
        hash: individualResult.hash,
        imageDataUrl: individualResult.imageDataUrl,
        registeredAt: Date.now(),
      });
      setSavedMessage(`${individualResult.name}を登録しました`);
      setIndividualResult(null);
      setRegistryTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  }, [individualResult]);

  const handleDeleteTemplate = useCallback(async (name: string) => {
    if (!confirm(`${name}のテンプレートを削除しますか？`)) return;
    try {
      await deleteTemplate(name);
      setSavedMessage(`${name}を削除しました`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }, []);

  const customCount = templates.length;
  const staticCount = (staticTemplatesJson as { name: string }[]).length;

  // ── レンダリング ──

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-3xl p-5 max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900">テンプレート登録</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{templateCount}/109</span>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              ×
            </button>
          </div>
        </div>

        {/* データ管理バー */}
        <input ref={importInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 mb-3 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {staticCount > 0 ? `組込${staticCount}件` : ""}
            {staticCount > 0 && customCount > 0 ? " + " : ""}
            {customCount > 0 ? `カスタム${customCount}件` : ""}
            {staticCount === 0 && customCount === 0 ? "テンプレート未登録" : ""}
          </span>
          <div className="flex items-center gap-1.5">
            {customCount > 0 && (
              <button onClick={handleExport}
                className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200">
                エクスポート
              </button>
            )}
            <button onClick={() => importInputRef.current?.click()}
              className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200">
              インポート
            </button>
            {customCount > 0 && (
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

        {/* 開発用: 静的JSONエクスポート */}
        {customCount > 0 && (
          <button onClick={handleExportStaticJson}
            className="w-full text-xs py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200 mb-3 flex-shrink-0">
            静的JSONエクスポート（開発用）
          </button>
        )}

        {/* タブ切替 */}
        <div className="flex border-b border-gray-200 mb-3 flex-shrink-0">
          <button
            onClick={() => setTab("batch")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "batch"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            一括登録
          </button>
          <button
            onClick={() => setTab("registry")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "registry"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            登録一覧
          </button>
        </div>

        {/* メッセージ */}
        {savedMessage && (
          <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 mb-2 flex-shrink-0">{savedMessage}</div>
        )}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2 mb-2 flex-shrink-0">{error}</div>
        )}

        {/* タブコンテンツ */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {tab === "batch" && batchStep === 1 && (
            <>
              <p className="text-xs text-gray-500">
                Step 1: 基準画像でクロップ位置を調整します。
              </p>

              <input ref={referenceInputRef} type="file" accept="image/*" onChange={handleReferenceSelect} className="hidden" />

              {previewUrl ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {/* プレビューキャンバス */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">基準画像</span>
                        <button onClick={() => referenceInputRef.current?.click()}
                          className="text-xs bg-white px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">
                          画像変更
                        </button>
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={400}
                        className="w-full rounded-xl border border-gray-200 select-none bg-gray-50"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      />
                    </div>

                    {/* 設定パネル + サムネイルプレビュー */}
                    <div className="w-36 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">切り出しプレビュー</label>
                        <canvas
                          ref={thumbCanvasRef}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded border border-gray-200 bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">開始No.</label>
                        <input
                          type="number"
                          min={0}
                          max={allNames.current.length - 1}
                          value={startIndex}
                          onChange={(e) => setStartIndex(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          {startIndex < allNames.current.length
                            ? `→ ${allNames.current[startIndex]}`
                            : "範囲外"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmCrop}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    クロップ確定 → 一括処理へ
                  </button>
                </div>
              ) : (
                <button onClick={() => referenceInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">
                  基準画像を選択
                </button>
              )}
            </>
          )}

          {tab === "batch" && batchStep === 2 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Step 2: 画像を複数選択して一括処理します。
                </p>
                <button
                  onClick={() => setBatchStep(1)}
                  className="text-xs text-indigo-500 hover:text-indigo-700"
                >
                  クロップを再調整
                </button>
              </div>

              <input ref={batchInputRef} type="file" accept="image/*" multiple onChange={handleBatchFileSelect} className="hidden" />

              <div className="space-y-2">
                <button onClick={() => batchInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">
                  {files.length > 0 ? `${files.length}枚選択中（クリックで変更）` : "図鑑スクショを複数選択"}
                </button>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={skipRegistered}
                      onChange={(e) => setSkipRegistered(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-400"
                    />
                    未登録のみに割り当て
                  </label>
                  <span className="text-[10px] text-gray-400">
                    {skipRegistered
                      ? `未登録 ${allNames.current.slice(startIndex).filter((n) => !registeredSet.has(n)).length}体`
                      : `No.${startIndex}〜${startIndex + Math.max(0, files.length - 1)}`}
                    {startIndex < allNames.current.length && ` (${allNames.current[startIndex]}〜)`}
                  </span>
                </div>
              </div>

              {files.length > 0 && batchItems.length === 0 && (
                <button
                  onClick={handleBatchProcess}
                  disabled={processing}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    processing
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {processing ? progress : `${files.length}枚を一括処理`}
                </button>
              )}

              {/* 結果プレビューグリッド */}
              {batchItems.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-700">{batchItems.length}体の処理結果</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                    {batchItems.map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 p-1.5 rounded-lg border border-gray-200 bg-gray-50">
                        <img src={item.imageDataUrl} alt={item.name} className="w-12 h-12 rounded" />
                        <span className="text-[10px] text-gray-400">
                          {allNames.current.indexOf(item.name) >= 0
                            ? `No.${allNames.current.indexOf(item.name)}`
                            : `#${i}`}
                        </span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItemName(i, e.target.value)}
                          className="w-full text-[11px] text-center px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleBatchSave}
                    disabled={saving}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      saving
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {saving ? "保存中..." : `${batchItems.length}体を一括保存`}
                  </button>
                </div>
              )}
            </>
          )}

          {tab === "registry" && (
            <>
              {/* 個別登録エリア */}
              <input ref={individualInputRef} type="file" accept="image/*" onChange={handleIndividualFileSelect} className="hidden" />

              {registryTarget && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-indigo-700">
                      {registryTarget}を登録
                    </span>
                    <button
                      onClick={() => { setRegistryTarget(null); setIndividualResult(null); }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      キャンセル
                    </button>
                  </div>

                  {individualResult ? (
                    <div className="flex items-center gap-3">
                      <img src={individualResult.imageDataUrl} alt={individualResult.name} className="w-12 h-12 rounded border border-indigo-200" />
                      <button
                        onClick={handleIndividualSave}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        登録
                      </button>
                      <button
                        onClick={() => individualInputRef.current?.click()}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        画像変更
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => individualInputRef.current?.click()}
                      className="w-full py-3 border-2 border-dashed border-indigo-300 rounded-lg text-xs text-indigo-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                    >
                      画像を選択
                    </button>
                  )}
                </div>
              )}

              {/* 109体グリッド */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1.5">
                {allNames.current.map((name, i) => {
                  const tmpl = templateMap.get(name);
                  const isRegistered = !!tmpl?.imageDataUrl;
                  return (
                    <div
                      key={name}
                      className={`flex flex-col items-center p-1.5 rounded-lg border ${
                        registryTarget === name
                          ? "border-indigo-400 bg-indigo-50"
                          : isRegistered
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      {isRegistered ? (
                        <div className="relative">
                          <img src={tmpl!.imageDataUrl} alt={name} className="w-10 h-10 rounded" />
                          <button
                            onClick={() => handleDeleteTemplate(name)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] leading-none flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRegistryTarget(name); setIndividualResult(null); }}
                          className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <span className="text-lg text-gray-300">+</span>
                        </button>
                      )}
                      <span className="text-[9px] text-gray-500 truncate w-full text-center mt-0.5" title={name}>
                        <span className="text-[8px] text-gray-300">{i} </span>{name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
