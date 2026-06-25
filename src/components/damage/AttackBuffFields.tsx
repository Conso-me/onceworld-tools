import { useTranslation } from "react-i18next";
import { InputField } from "../ui/InputField";
import type { AttackBuffs } from "../../utils/attackBuffs";

/**
 * 攻撃方法別バフの入力フィールド（物理/魔法）。
 * 値は useSharedAttackBuffs の共有ストアから受け取り、全画面で同期する。
 */
export function AttackBuffFields({
  buffs,
  setField,
}: {
  buffs: AttackBuffs;
  setField: <K extends keyof AttackBuffs>(field: K, value: AttackBuffs[K]) => void;
}) {
  const { t } = useTranslation("damage");

  return (
    <div className="space-y-3">
      {/* 物理 */}
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-gray-500">{t("physicalBuffs")}</span>
        <div className="grid grid-cols-2 gap-3 lg:gap-2">
          <InputField
            label={t("devilEye")}
            value={buffs.devilEye}
            onChange={(v) => setField("devilEye", v)}
            max={1000}
            showReset
            showMax
          />
          <InputField
            label={t("toughouCube")}
            value={buffs.toughouCube}
            onChange={(v) => setField("toughouCube", v)}
            max={1000}
            showReset
            showMax
          />
        </div>
      </div>

      {/* 魔法 */}
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-gray-500">{t("magicBuffs")}</span>
        <div className="grid grid-cols-2 gap-3 lg:gap-2">
          <InputField
            label={t("analysisBook")}
            value={buffs.analysisBook}
            onChange={(v) => setField("analysisBook", v)}
            max={1000}
            showReset
            showMax
          />
          <InputField
            label={t("analysisAnalysisBook")}
            value={buffs.analysisAnalysisBook}
            onChange={(v) => setField("analysisAnalysisBook", v)}
            max={1000}
            showReset
            showMax
          />
          <InputField
            label={t("crystalCube")}
            value={buffs.crystalCube}
            onChange={(v) => setField("crystalCube", v)}
            max={1000}
            showReset
            showMax
          />
        </div>
      </div>
    </div>
  );
}
