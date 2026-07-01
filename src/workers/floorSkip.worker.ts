/**
 * 天空回廊 階層スキップ列挙をワーカースレッドで実行する。
 * 目標フロアが大きいと列挙が重くメインスレッドがフリーズするため、
 * 計算を別スレッドへ逃がしてUIの応答性を保つ。
 */
import {
  enumerateFloorSkip,
  type CycleSolution,
  type FloorSkipInput,
} from "../utils/skyCorridorFloorSkip";

export interface FloorSkipRequest {
  /** 呼び出しを識別するトークン（古い結果の破棄用） */
  token: number;
  input: FloorSkipInput;
  /** 返却する最大件数 */
  limit: number;
}

export interface FloorSkipResponse {
  token: number;
  solutions: CycleSolution[];
}

self.onmessage = (e: MessageEvent<FloorSkipRequest>) => {
  const { token, input, limit } = e.data;
  const all = enumerateFloorSkip(input);
  const response: FloorSkipResponse = {
    token,
    solutions: all.slice(0, limit),
  };
  (self as unknown as Worker).postMessage(response);
};
