import { shows } from './shows';
import type { ShowsConfig } from './types';

// Helper function to get all available characters
export const getAllCharacters = () => {
  return Object.values(shows).flatMap(show => 
    show.characters.map(char => ({
      ...char,
      showId: show.id,
      showName: show.name
    }))
  );
};

// Helper function to get character by ID
export const getCharacterById = (characterId: string) => {
  return getAllCharacters().find(char => char.id === characterId);
};

// Helper function to get show by ID
export const getShowById = (showId: string) => {
  return shows[showId as keyof typeof shows] || null;
};

// Helper function to get characters for a show
export const getShowCharacters = (showId: string) => {
  return shows[showId as keyof typeof shows]?.characters || [];
};

export { shows }; 