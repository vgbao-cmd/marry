export type Guest = {
  id: string;
  name: string;
  style: string;
  points: number;
  active: number;
  action: string;
  action_until: number;
};
export type Config = {
  title: string;
  announcement: string;
  goal: number;
  curtain_seconds: number;
  cooldown: number;
  max_guests: number;
  mc_volume: number;
  music_volume: number;
  effect_volume: number;
  speech_rate: number;
  speech_pause: number;
  voice: string;
  keywords: Record<string, string>;
  gifts: Record<string, { name: string; action: string; points: number }>;
};
export type State = {
  visuals: Visuals;
  config: Config;
  users: Record<string, Guest>;
  leaders: Guest[];
  roles: Record<string, string | null>;
  queues: Record<string, string[]>;
  total: number;
  round: number;
  running: boolean;
  mode: string;
  source_status: string;
  guest_count: number;
  last_event: number | null;
  server_time: number;
  curtain_until: number;
  effects: { id: string; kind: string; user: string; until: number }[];
  speeches: {
    id: string;
    text: string;
    priority: number;
    expires: number;
    at: number;
    audio_url?: string | null;
  }[];
};
export type PoseAsset = {
  url: string;
  frames: [number, number, number, number][];
  fps: number;
};
export type CharacterAsset = PoseAsset & {
  label: string;
  style: "male" | "female";
  height: number;
  foot_x: number;
  foot_y: number;
  offset_x: number;
  offset_y: number;
  x: number;
  y: number;
  poses: Partial<
    Record<
      "idle" | "walk" | "celebrate" | "toast" | "dance" | "heart" | "talk",
      PoseAsset
    >
  >;
};
export type Visuals = {
  quality: "low" | "medium" | "high";
  reduced_effects: boolean;
  backdrop: PoseAsset;
  characters: Record<string, CharacterAsset>;
};
