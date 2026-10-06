import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { formatId, getArtworkUrl, getIdFromUrl, capitalize } from "../utils.js";

const typeNames = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
const colors = ["mint", "peach", "lilac", "sky", "butter", "rose"];
const generationEnds = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
function getGeneration(id) { return String(generationEnds.findIndex((lastId) => Number(id) <= lastId) + 1 || 9); }

export default function PokemonList({ query = "", generation, type, sort, pageSize, page, onPageInfo, favorites, favoritesOnly, onFavorite }) {
  const [entries, setEntries] = useState([]);
  const [typeMembers, setTypeMembers] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/pokemon?limit=2000`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(`Server responded with ${response.status}`); return response.json(); })
      .then((data) => { setEntries(data.results); setStatus("ready"); })
      .catch((err) => { if (err.name !== "AbortError") { setError(err.message); setStatus("error"); } });
    return () => controller.abort();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const queryGeneration = normalizedQuery.match(/^gen(?:eration)?\s*(\d)$/)?.[1];
  const queryType = typeNames.includes(normalizedQuery) ? normalizedQuery : "all";
  const activeGeneration = generation !== "all" ? generation : queryGeneration || "all";
  const activeType = type !== "all" ? type : queryType;

  useEffect(() => {
    if (activeType === "all") { setTypeMembers(null); return; }
    const controller = new AbortController(); setTypeMembers(null);
    fetch(`${API_BASE_URL}/type/${activeType}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Could not load Pokémon type"); return response.json(); })
      .then((data) => setTypeMembers(new Set(data.pokemon.map(({ pokemon }) => pokemon.name))))
      .catch((err) => { if (err.name !== "AbortError") setTypeMembers(new Set()); });
    return () => controller.abort();
  }, [activeType]);

  const matching = useMemo(() => {
    let results = entries.filter((pokemon) => {
      const id = getIdFromUrl(pokemon.url);
      const nameMatches = !normalizedQuery || queryGeneration || queryType || pokemon.name.includes(normalizedQuery) || id === normalizedQuery.replace(/^#/, "");
      return nameMatches && (activeGeneration === "all" || getGeneration(id) === activeGeneration) && (!favoritesOnly || favorites.includes(pokemon.name)) && (!typeMembers || typeMembers.has(pokemon.name));
    });
    if (sort === "name") results = [...results].sort((a, b) => a.name.localeCompare(b.name));
    return results;
  }, [entries, normalizedQuery, queryGeneration, queryType, activeGeneration, favoritesOnly, favorites, typeMembers, sort]);

  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const shown = matching.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { onPageInfo({ count: matching.length, page: safePage, pageCount }); }, [matching.length, safePage, pageCount, onPageInfo]);

  if (status === "loading" || (activeType !== "all" && typeMembers === null)) return <div className="card-grid">{Array.from({ length: 8 }, (_, i) => <div className="skeleton" key={i}><div /><span /></div>)}</div>;
  if (status === "error") return <div className="state-panel"><span className="state-icon">!</span><h3>Signal lost</h3><p>We couldn’t reach the Pokédex. Check your connection and try again.</p><button className="text-button" onClick={() => window.location.reload()}>RETRY ↗</button><small>{error}</small></div>;
  if (!shown.length) return <div className="state-panel"><span className="state-icon">⌕</span><h3>No field notes found</h3><p>Try another search, or reset the catalog filters.</p></div>;

  return <>
    <div className="card-grid">{shown.map((pokemon, index) => {
      const id = getIdFromUrl(pokemon.url);
      const saved = favorites.includes(pokemon.name);
      return <article className={`pokemon-card-wrap ${colors[(Number(id) - 1) % colors.length]}`} key={pokemon.name} style={{ "--card-index": index }}>
        <Link to={`/pokemon/${pokemon.name}`} className="pokemon-card">
          <span className="card-number">{formatId(id)} <i>·</i> {getGeneration(id).padStart(2, "0")} GEN</span><span className="card-arrow" aria-hidden="true">↗</span>
          <div className="card-art"><span className="art-orbit" /><span className="art-glow" /><img loading="lazy" src={getArtworkUrl(id)} alt={pokemon.name} onError={(e) => { e.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`; }} /></div>
          <span className="card-hover-cta"><span>OPEN SPECIMEN PROFILE</span><b>↗</b></span>
          <div className="card-caption"><span className="card-kicker">SPECIMEN / {formatId(id)}</span><h3>{capitalize(pokemon.name.replace(/-/g, " "))}</h3><span className="view-note">OPEN FIELD PROFILE <span>↗</span></span></div>
        </Link>
        <button className={`favorite-button ${saved ? "saved" : ""}`} onClick={() => onFavorite(pokemon.name)} aria-label={`${saved ? "Remove" : "Add"} ${pokemon.name} ${saved ? "from" : "to"} favorites`}>{saved ? "♥" : "♡"}</button>
      </article>;
    })}</div>
    <nav className="pagination nexus-pagination" aria-label="Pokémon pages"><button onClick={() => onPageInfo({ count: matching.length, page: safePage - 1, pageCount })} disabled={safePage === 1}>← PREVIOUS</button><span><b>{String(safePage).padStart(2, "0")}</b> <i>/</i> {String(pageCount).padStart(2, "0")}</span><button onClick={() => onPageInfo({ count: matching.length, page: safePage + 1, pageCount })} disabled={safePage === pageCount}>NEXT PAGE →</button></nav>
  </>;
}
