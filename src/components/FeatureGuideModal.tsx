import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const GUIDE_VERSION = "2026-05-06";
const STORAGE_KEY = `ow-guide-seen-${GUIDE_VERSION}`;

export function useFeatureGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setShow(true);
  }, []);

  return { show, open: () => setShow(true), close: () => setShow(false) };
}

type Feature = {
  icon: string;
  title: string;
  points: string[];
};

const FEATURES: Record<string, Feature[]> = {
  ja: [
    {
      icon: "⚔",
      title: "ダメージ計算",
      points: [
        "自分のステータスとモンスターを選んで実際のダメージを計算",
        "複数モンスターをリスト表示して一括比較できる",
        "URLで設定をまるごと共有できる",
        "装備プリセットの登録・切り替えが可能",
        "ペット主体のダメージ計算にも対応",
      ],
    },
    {
      icon: "☁",
      title: "天空回廊",
      points: [
        "物理・魔法の攻撃力 TOP8 付近のモンスターを表示",
        "設定したステータスで何階層まで耐えられるかを計算",
        "モンスター名クリックでダメージ計算シミュに連携",
        "階層スキップシミュレーターも搭載",
      ],
    },
    {
      icon: "✦",
      title: "ステータス計算",
      points: [
        "主人公の実ステータス（最終値）を表示",
        "装備セット A と装備セット B で比較表示ができる",
      ],
    },
    {
      icon: "⚡",
      title: "ペットバトル",
      points: [
        "ペットバトルアリーナのシミュレーター",
        "ステータス上の計算なので、攻撃が通るかどうかの目安として使う",
      ],
    },
    {
      icon: "🏟",
      title: "裏路地",
      points: [
        "天空回廊と同様の耐久シミュレーター",
        "裏路地は出現モンスターが固定なので、そのモンスターのみ表示",
      ],
    },
    {
      icon: "♻",
      title: "周回計算",
      points: [
        "1周で倒す敵・かかる時間などを入力すると1周の成果と時給を計算",
        "オマケ機能のため大まかな目安として使ってください",
      ],
    },
    {
      icon: "📋",
      title: "カスタムモンスター登録",
      points: [
        "アプデ直後や自作モンスターをすぐに登録できる",
        "名前・レベル・属性・攻撃タイプ・各ステータスを入力して登録",
        "登録したモンスターはダメージ計算などの「カスタム」欄に表示される",
      ],
    },
  ],
  en: [
    {
      icon: "⚔",
      title: "Damage Calculator",
      points: [
        "Calculate actual damage using your stats and a selected monster",
        "Compare multiple monsters in a list view",
        "Share your full setup via URL",
        "Save and switch equipment presets",
        "Supports pet-focused damage calculation",
      ],
    },
    {
      icon: "☁",
      title: "Sky Corridor",
      points: [
        "Shows monsters near the top 8 in physical/magic ATK",
        "Calculates how many floors you can survive with your stats",
        "Click a monster name to jump to Damage Calculator",
        "Floor skip simulator included",
      ],
    },
    {
      icon: "✦",
      title: "Status Calculator",
      points: [
        "Displays your character's final effective stats",
        "Side-by-side comparison of equipment set A vs. B",
      ],
    },
    {
      icon: "⚡",
      title: "Pet Battle",
      points: [
        "Arena battle simulator for pets",
        "Based on stats only — use as a rough guide for whether attacks connect",
      ],
    },
    {
      icon: "🏟",
      title: "Arena (Back Alley)",
      points: [
        "Survival simulator similar to Sky Corridor",
        "Only shows the fixed set of monsters that appear in the Arena",
      ],
    },
    {
      icon: "♻",
      title: "Farming Calculator",
      points: [
        "Input enemies per run and time spent to calculate yield and gold/hour",
        "Bonus feature — treat results as rough estimates",
      ],
    },
    {
      icon: "📋",
      title: "Custom Monster",
      points: [
        "Register custom monsters right after updates or for testing",
        "Input name, level, element, attack type, and stats",
        "Registered monsters appear under 'Custom' in Damage Calculator",
      ],
    },
  ],
};

export function FeatureGuideModal({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("ja") ? "ja" : "en";
  const features = FEATURES[lang];

  const [page, setPage] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, features.length - 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features.length]);

  function handleClose() {
    if (dontShow) localStorage.setItem(STORAGE_KEY, "1");
    onClose();
  }

  const feature = features[page];
  const isFirst = page === 0;
  const isLast = page === features.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col"
        style={{ minHeight: "360px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <span className="text-xs font-medium text-indigo-400 tracking-wide uppercase">
            {lang === "ja" ? "使い方ガイド" : "Feature Guide"}
          </span>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            aria-label="close"
          >
            ×
          </button>
        </div>

        {/* フィーチャーページ */}
        <div className="flex-1 px-5 pb-2">
          <div className="text-4xl mb-3">{feature.icon}</div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">{feature.title}</h2>
          <ul className="space-y-2">
            {feature.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ページインジケーター */}
        <div className="flex justify-center gap-1.5 py-3 shrink-0">
          {features.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === page ? "bg-indigo-500" : "bg-gray-200 hover:bg-gray-300"
              }`}
              aria-label={`page ${i + 1}`}
            />
          ))}
        </div>

        {/* フッター */}
        <div className="px-5 pb-4 shrink-0 space-y-3">
          {/* ナビゲーションボタン */}
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={isFirst}
              className="flex-1 py-2 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← {lang === "ja" ? "前へ" : "Prev"}
            </button>
            {isLast ? (
              <button
                onClick={handleClose}
                className="flex-1 py-2 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors font-medium"
              >
                {lang === "ja" ? "閉じる" : "Close"}
              </button>
            ) : (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="flex-1 py-2 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors font-medium"
              >
                {lang === "ja" ? "次へ" : "Next"} →
              </button>
            )}
          </div>

          {/* 今後表示しない */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-500"
            />
            <span className="text-xs text-gray-400">
              {lang === "ja" ? "今後表示しない" : "Don't show again"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
