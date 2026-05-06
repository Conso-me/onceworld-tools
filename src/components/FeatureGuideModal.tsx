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
        "物理・魔弾・魔法の3種の攻撃手段に対応",
        "与ダメ・被ダメ・確殺回数・命中率を一括計算",
        "オーバーキル判定：必要INTと魔晶立方体数の達成状況を確認できる",
        "複数モンスターをリスト表示して一括比較できる",
        "ステータス手動入力 or ステータス計算タブの装備設定と連携",
        "ペット攻撃切り替えでペット主体のダメージ計算も可能",
        "URLで設定をまるごと共有できる",
        "装備プリセットの保存・切り替えが可能",
      ],
    },
    {
      icon: "☁",
      title: "天空回廊",
      points: [
        "耐久モード：物理・魔法 攻撃力上位8体を一覧表示",
        "各モンスターの無効化可否・耐久回数・限界フロアを計算",
        "LUK回避の目安（ほぼほぼ/大体/たぶん）も表示",
        "火力モード：敵を倒せるか・一撃確殺判定を確認",
        "ダメージ計算タブと装備設定を同期できる",
        "モンスター名クリックでダメージ計算タブに連携",
        "階層スキップシミュ：天空像の持参数から最少操作数を算出",
      ],
    },
    {
      icon: "✦",
      title: "ステータス計算",
      points: [
        "装備・アクセ・プロテイン・ペット・%ボーナスを全て反映した最終ステータスを表示",
        "セット効果を自動認識して計算に反映",
        "設定A・設定Bの2パターンを同時管理して差分比較できる",
        "計算結果のステータスをダメージ計算のプリセットとして直接エクスポート可能",
        "ビルドはプリセット保存・読み込みに対応",
      ],
    },
    {
      icon: "⚡",
      title: "ペットバトル",
      points: [
        "ペットA vs ペットBの1対1バトルをシミュレート",
        "レンジ・接敵フェーズの先制ヒット数まで含めて計算",
        "粉の割り振りパターンを変えて攻撃力変化を確認できる",
        "同族殲儀・ハデスの兜・属性キノコなど装備効果にも対応",
        "ステータス上の計算のため、攻撃が通るかどうかの目安として使ってください",
      ],
    },
    {
      icon: "🏟",
      title: "裏路地",
      points: [
        "裏路地の出現モンスター（固定12体）に対する耐久シミュレーター",
        "各モンスターの無効化可否・耐久回数・限界レベルを計算",
        "装備シミュレータのプリセットを直接ロードして複数ビルドを比較可能",
        "ダメージ計算タブと同期して装備設定を共有できる",
      ],
    },
    {
      icon: "♻",
      title: "周回計算",
      points: [
        "1周の秒数と討伐モンスターを入力すると時給EXP・時給ゴールドを計算",
        "エリアプリセットからモンスターを一括追加できる",
        "素材ドロップの時給期待値も合算して表示",
        "周回構成をプリセット保存して後から読み込み可能",
        "おまけ機能のため大まかな目安として使ってください",
      ],
    },
    {
      icon: "📋",
      title: "カスタムモンスター登録",
      points: [
        "アプデ直後など未収録モンスターをすぐ登録できる",
        "名前・レベル・属性・攻撃タイプ・各ステータス・EXP・Gを設定",
        "登録したモンスターはダメージ計算・周回計算などの「カスタム」欄に表示",
        "登録データはJSONでエクスポート・インポート可能",
      ],
    },
    {
      icon: "🔧",
      title: "ヘッダーのメニューについて",
      points: [
        "【装備確認】現在の装備・アクセ・ステータス割り振りを一覧表示。テキストコピーで他の人への情報共有に便利",
        "【更新履歴】ツールの修正・機能追加・改善のパッチノートを確認できる",
        "【フィードバック】バグ報告や機能要望はこちらのフォームから送れます",
        "【機能説明】このガイドはいつでもヘッダーのボタンから開ける",
      ],
    },
  ],
  en: [
    {
      icon: "⚔",
      title: "Damage Calculator",
      points: [
        "Supports 3 attack types: physical, magic bullet, and spell",
        "Calculates dealt damage, received damage, kill count, and hit rate",
        "Overkill check: shows required INT and crystal cube count to reach the threshold",
        "Compare multiple monsters side-by-side in list view",
        "Manual stat input or sync with equipment settings from Status tab",
        "Switch to pet mode for pet-based damage calculation",
        "Share your full setup via URL",
        "Save and load equipment presets",
      ],
    },
    {
      icon: "☁",
      title: "Sky Corridor",
      points: [
        "Survival mode: lists top 8 monsters by physical/magic ATK",
        "Shows whether each monster can be nullified, and calculates floor limit",
        "Displays LUK dodge likelihood (rough probability guide)",
        "Power mode: checks if you can one-shot enemies",
        "Sync equipment settings from Damage Calculator",
        "Click a monster name to jump to Damage Calculator",
        "Floor skip sim: finds the minimum operations needed using your statues",
      ],
    },
    {
      icon: "✦",
      title: "Status Calculator",
      points: [
        "Shows final stats with equipment, accessories, protein, pet, and % bonuses applied",
        "Set bonuses are automatically detected and calculated",
        "Manage two builds (A/B) simultaneously and compare the difference",
        "Export calculated stats directly as a Damage Calculator preset",
        "Save and load builds as presets",
      ],
    },
    {
      icon: "⚡",
      title: "Pet Battle",
      points: [
        "Simulates a 1v1 battle between pet A and pet B",
        "Includes pre-emptive hits from the range/approach phase",
        "Try different powder allocations to see how stats change",
        "Supports equipment effects: same-type kills, Hades helm, element mushrooms",
        "Stat-based calculation only — use as a rough guide for whether attacks connect",
      ],
    },
    {
      icon: "🏟",
      title: "Arena (Back Alley)",
      points: [
        "Survival simulator for the fixed 12 monsters in the Back Alley",
        "Calculates nullification, survival count, and level cap per monster",
        "Load presets from the Status Calculator to compare builds instantly",
        "Sync with the Damage Calculator to share equipment settings",
      ],
    },
    {
      icon: "♻",
      title: "Farming Calculator",
      points: [
        "Input run time and monsters to get EXP/hour and Gold/hour",
        "Add monsters in bulk using area presets",
        "Shows expected material drop rates per hour",
        "Save farming setups as presets for later",
        "Bonus feature — treat results as rough estimates",
      ],
    },
    {
      icon: "📋",
      title: "Custom Monster",
      points: [
        "Register untracked monsters immediately after updates",
        "Set name, level, element, attack type, stats, EXP, and Gold",
        "Registered monsters appear under 'Custom' in Damage Calc and Farming Calc",
        "Export and import your registered monsters as JSON",
      ],
    },
    {
      icon: "🔧",
      title: "Header Menu",
      points: [
        "[Equipment] Shows your current equipment, accessories, and stat allocation at a glance — use the text copy button to share your setup with others",
        "[Patch Notes] View the history of fixes, new features, and improvements",
        "[Feedback] Use the form to report bugs or request features",
        "[Features] This guide can be reopened anytime from the header button",
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col h-[560px]"
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
        <div className="flex-1 px-5 pb-2 overflow-y-auto">
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
