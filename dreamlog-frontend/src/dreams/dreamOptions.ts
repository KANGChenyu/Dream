import type { Mood } from "../api/types";

export interface DreamOption<T extends string | number> {
  value: T;
  label: string;
}

export const moodOptions: DreamOption<Mood>[] = [
  { value: "calm", label: "平静" },
  { value: "happy", label: "愉快" },
  { value: "anxious", label: "焦虑" },
  { value: "scared", label: "惊恐" },
  { value: "confused", label: "困惑" },
  { value: "sad", label: "低落" }
];

export const clarityOptions: DreamOption<number>[] = [
  { value: 1, label: "模糊" },
  { value: 2, label: "朦胧" },
  { value: 3, label: "清晰" },
  { value: 4, label: "鲜明" },
  { value: 5, label: "极其清醒" }
];

export function getMoodLabel(mood: Mood | null) {
  return moodOptions.find((option) => option.value === mood)?.label ?? "未标记";
}

export function getClarityLabel(clarity: number | null) {
  return clarityOptions.find((option) => option.value === clarity)?.label ?? "未标记";
}
