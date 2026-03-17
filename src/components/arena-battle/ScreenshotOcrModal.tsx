import { useState, useCallback, useRef } from "react";
import { ocrParseScreenshot, type OcrTeamResult } from "../../utils/ocrTeamParser";
import type { TeamData, TeamId } from "./TeamInputPanel";

const elementTextColors: Record<string, string> = {
  火: "text-red-600 font-bold",
  水: "text-blue-600 font-bold",
  木: "text-green-600 font-bold",
  光: "text-yellow-700 font-bold",
  闇: "text-purple-600 font-bold",
};

interface Props {
  onApply: (teams: Record<TeamId, TeamData>) => void;
  onClose: () => void;
}

export function ScreenshotOcrModal({ onApply, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OcrTeamResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, []);

  const handleOcr = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      const ocrResult = await ocrParseScreenshot(file);
      setResult(ocrResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  }, [file]);

  const handleApply = useCallback(() => {
    if (!result) return;

    const teams: Record<TeamId, TeamData> = { A: { slots: [] }, B: { slots: [] }, C: { slots: [] } };

    for (const tid of ["A", "B", "C"] as TeamId[]) {
      const slots = result.teams[tid];
      if (slots.length === 0) {
        teams[tid] = { slots: [{ monster: null, level: 1 }] };
      } else {
        teams[tid] = {
          slots: slots.map((s) => ({ monster: null, level: s.level, detectedElement: s.element })),
        };
      }
    }

    onApply(teams);
    onClose();
  }, [result, onApply, onClose]);

  const totalSlots = result
    ? (["A", "B", "C"] as TeamId[]).reduce((sum, tid) => sum + result.teams[tid].length, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">スクリーンショットOCR</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-gray-500">
          アリーナ画面のスクリーンショットからレベルとチーム構成を自動読み取りします。モンスターは手動で選択してください。
        </p>

        {/* Image upload */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt="Screenshot"
              className="w-full rounded-xl border border-gray-200 max-h-60 object-contain bg-gray-50"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute top-2 right-2 text-xs bg-white/90 px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-white"
            >
              変更
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
          >
            画像を選択またはドロップ
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleOcr}
            disabled={!file || isProcessing}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
              file && !isProcessing
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            {isProcessing ? "読み取り中..." : "読み取り"}
          </button>
          <button
            onClick={handleApply}
            disabled={!result || totalSlots === 0}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
              result && totalSlots > 0
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            適用
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</div>
        )}

        {/* Result preview */}
        {result && (
          <div className="space-y-2">
            {totalSlots === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                レベル情報が検出できませんでした。画像を確認してください。
              </p>
            )}

            {(["A", "B", "C"] as TeamId[]).map((tid) => {
              const slots = result.teams[tid];
              if (slots.length === 0) return null;
              return (
                <div key={tid} className="text-sm">
                  <span className="font-bold text-gray-700">チーム{tid}</span>
                  <span className="text-gray-400 ml-1 text-xs">({slots.length}体)</span>
                  <ul className="ml-3 mt-0.5 space-y-0.5">
                    {slots.map((s, i) => (
                      <li key={i} className="text-gray-600">
                        {s.element ? (
                          <span className={elementTextColors[s.element]}>{s.element} </span>
                        ) : null}
                        <span className="text-gray-400">モンスター未選択</span>{" "}
                        Lv.{s.level}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
