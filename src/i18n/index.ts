import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import jaCommon from "./locales/ja/common.json";
import jaGame from "./locales/ja/game.json";
import jaDamage from "./locales/ja/damage.json";
import jaStatus from "./locales/ja/status.json";
import jaFarm from "./locales/ja/farm.json";
import jaArena from "./locales/ja/arena.json";
import jaMonsters from "./locales/ja/monsters.json";
import jaPetBattle from "./locales/ja/petbattle.json";
import jaPet from "./locales/ja/pet.json";
import jaSkyCorridor from "./locales/ja/skyCorridor.json";

import enCommon from "./locales/en/common.json";
import enGame from "./locales/en/game.json";
import enDamage from "./locales/en/damage.json";
import enStatus from "./locales/en/status.json";
import enFarm from "./locales/en/farm.json";
import enArena from "./locales/en/arena.json";
import enMonsters from "./locales/en/monsters.json";
import enPetBattle from "./locales/en/petbattle.json";
import enPet from "./locales/en/pet.json";
import enSkyCorridor from "./locales/en/skyCorridor.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ja: {
        common: jaCommon,
        game: jaGame,
        damage: jaDamage,
        status: jaStatus,
        farm: jaFarm,
        arena: jaArena,
        monsters: jaMonsters,
        petbattle: jaPetBattle,
        pet: jaPet,
        skyCorridor: jaSkyCorridor,
      },
      en: {
        common: enCommon,
        game: enGame,
        damage: enDamage,
        status: enStatus,
        farm: enFarm,
        arena: enArena,
        monsters: enMonsters,
        petbattle: enPetBattle,
        pet: enPet,
        skyCorridor: enSkyCorridor,
      },
    },
    fallbackLng: "ja",
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "onceworld-lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
