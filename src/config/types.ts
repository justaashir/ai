export interface Character {
  id: string;
  name: string;
  role: string;
  baseModel: string;
  avatar: string;
  prompt: string;
}

export interface ShowConfig {
  id: string;
  name: string;
  description: string;
  image: string;
  characters: Character[];
}

export interface ShowsConfig {
  [key: string]: ShowConfig;
} 