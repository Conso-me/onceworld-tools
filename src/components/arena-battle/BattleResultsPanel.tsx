import type { BattleResult, TeamId } from "../../utils/arenaBattleSim";

const teamStyle: Record<
  TeamId,
  { label: string; barColor: string; textColor: string }
> = {
  A: {
    label: "チームA",
    barColor: "bg-red-500",
    textColor: "text-red-600",
  },
  B: {
    label: "チームB",
    barColor: "bg-blue-500",
    textColor: "text-blue-600",
  },
  C: {
    label: "チームC",
    barColor: "bg-green-500",
    textColor: "text-green-600",
  },
};

interface Props {
  result: BattleResult | null;
}

export function BattleResultsPanel({ result }: Props) {
  if (!result) {
    return (
      <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-6 lg:p-4">
        <h2 className="text-lg lg:text-base font-bold text-gray-900 mb-4">
          シミュレーション結果
        </h2>
        <p className="text-sm text-gray-400 text-center py-8">
          チームを編成して「シミュレーション実行」を押してください
        </p>
      </div>
    );
  }

  const teamIds: TeamId[] = ["A", "B", "C"];
  const maxRate = Math.max(...teamIds.map((tid) => result.winRates[tid]));

  return (
    <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-6 lg:p-4 space-y-5 lg:space-y-4">
      <h2 className="text-lg lg:text-base font-bold text-gray-900">
        シミュレーション結果
      </h2>

      {/* 勝率バー */}
      <div className="space-y-3">
        {teamIds.map((tid) => {
          const style = teamStyle[tid];
          const rate = result.winRates[tid];
          const isTop = rate === maxRate && rate > 0;

          return (
            <div key={tid} className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${style.textColor}`}
                >
                  {style.label}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    isTop ? style.textColor : "text-gray-500"
                  }`}
                >
                  {rate.toFixed(1)}%
                </span>
              </div>
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${style.barColor} ${
                    isTop ? "opacity-100" : "opacity-60"
                  }`}
                  style={{ width: `${Math.max(rate, 0.5)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 統計情報 */}
      <div className="border-t border-gray-100 pt-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          統計
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-500">平均ターン数</div>
            <div className="text-sm font-bold text-gray-900 tabular-nums">
              {result.avgTurns}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-500">タイムアウト率</div>
            <div className="text-sm font-bold text-gray-900 tabular-nums">
              {result.timeoutRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
