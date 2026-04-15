import { useTranslation } from "react-i18next";
import type { PetStatResult, Element } from "../../types/game";
import type { PetBattleResult } from "../../utils/petBattleCalc";
import { BattleDamageCard } from "./BattleDamageCard";
import { BattleDurabilityCard } from "./BattleDurabilityCard";

export interface BattleResultPanelProps {
  resultA: PetStatResult | null;
  resultB: PetStatResult | null;
  battle: PetBattleResult | null;
}

const elementBadgeColors: Record<Element, string> = {
  火: "bg-red-100 text-red-600",
  水: "bg-blue-100 text-blue-600",
  木: "bg-green-100 text-green-600",
  光: "bg-yellow-100 text-yellow-700",
  闇: "bg-purple-100 text-purple-600",
};

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className="text-[9px] text-gray-400">{label}</span>
      <span className="text-[11px] font-semibold text-gray-700 tabular-nums">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function StatRow({
  pet,
  label,
  accentClass,
}: {
  pet: PetStatResult;
  label: string;
  accentClass: string;
}) {
  const { t } = useTranslation("petbattle");
  const { t: tGame } = useTranslation("game");
  const isPhysical = pet.attackMode === "物理";

  return (
    <div className={`rounded-lg border p-2 ${accentClass}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs font-bold">{label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${elementBadgeColors[pet.element]}`}>
          {tGame(`element.${pet.element}`)}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/80 border border-gray-200 text-gray-600">
          {tGame(`attackType.${pet.attackMode}`)}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1 bg-white/60 rounded px-1.5 py-1">
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[9px] text-red-500">{t("summary.hp")}</span>
          <span className="text-[11px] font-bold text-red-600 tabular-nums">
            {pet.hp.toLocaleString()}
          </span>
        </div>
        <StatChip label={t("summary.spd")} value={pet.final.spd} />
        <StatChip
          label={isPhysical ? t("summary.atk") : t("summary.int")}
          value={isPhysical ? pet.final.atk : pet.final.int}
        />
        <StatChip label={t("summary.def")} value={pet.final.def} />
        <StatChip label={t("summary.mdef")} value={pet.final.mdef} />
        <StatChip label={t("summary.luck")} value={pet.final.luck} />
      </div>
    </div>
  );
}

export function BattleResultPanel({ resultA, resultB, battle }: BattleResultPanelProps) {
  const { t } = useTranslation("petbattle");

  if (!resultA || !resultB || !battle) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
        {t("selectBoth")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ステータス要約 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <StatRow pet={resultA} label={t("configA")} accentClass="bg-blue-50 border-blue-100" />
        <StatRow pet={resultB} label={t("configB")} accentClass="bg-orange-50 border-orange-100" />
      </div>

      {/* ダメージカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <BattleDamageCard label={t("damage.aToB")} outcome={battle.aToB} color="blue" />
        <BattleDamageCard label={t("damage.bToA")} outcome={battle.bToA} color="orange" />
      </div>

      {/* 耐久+先攻+勝敗 */}
      <BattleDurabilityCard
        result={battle}
        spdA={resultA.final.spd}
        spdB={resultB.final.spd}
      />
    </div>
  );
}
