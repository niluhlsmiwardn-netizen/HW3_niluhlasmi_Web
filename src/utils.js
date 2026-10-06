import { ARTWORK_BASE_URL, SPRITE_BASE_URL } from "./config.js";

export function getIdFromUrl(url) {
  return url.split("/").filter(Boolean).at(-1);
}

export function capitalize(value = "") {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

export function getSpriteUrl(id) {
  return `${SPRITE_BASE_URL}/${id}.png`;
}

export function getArtworkUrl(id) {
  return `${ARTWORK_BASE_URL}/${id}.png`;
}

export function formatId(id) {
  return `#${String(id).padStart(3, "0")}`;
}
