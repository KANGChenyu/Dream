import type { Mood } from "../api/types";

export interface DreamOption<T extends string | number> {
  value: T;
  label: string;
}

export const moodOptions: DreamOption<Mood>[] = [
  { value: "calm", label: "Calm" },
  { value: "happy", label: "Happy" },
  { value: "anxious", label: "Anxious" },
  { value: "scared", label: "Scared" },
  { value: "confused", label: "Confused" },
  { value: "sad", label: "Sad" }
];

export const clarityOptions: DreamOption<number>[] = [
  { value: 1, label: "Hazy" },
  { value: 2, label: "Soft" },
  { value: 3, label: "Clear" },
  { value: 4, label: "Vivid" },
  { value: 5, label: "Lucid-bright" }
];

export function getMoodLabel(mood: Mood | null) {
  return moodOptions.find((option) => option.value === mood)?.label ?? "Unmarked";
}

export function getClarityLabel(clarity: number | null) {
  return clarityOptions.find((option) => option.value === clarity)?.label ?? "Unmarked";
}
