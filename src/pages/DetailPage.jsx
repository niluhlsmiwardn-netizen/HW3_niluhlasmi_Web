import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { capitalize, formatId, getArtworkUrl } from "../utils.js";

const typeColors = { fire: "#e87555", water: "#619fba", grass: "#72a17a", electric: "#d5a942", bug: "#73915b", poison: "#9b73a9", normal: "#9b9582", ground: "#bc8c5a", fairy: "#d7829c", fighting: "#bd685c", psychic: "#ca6f87", rock: "#9a8c67", ghost: "#796c98", ice: "#6faab0", dragon: "#6f75ae", steel: "#8b99a1", flying: "#8298c4", dark: "#70656c" };
const attackTypes = Object.keys(typeColors);
const statLabels = { hp: "HP", attack: "Attack", defense: "Defense", "special-attack": "Sp. Attack", "special-defense": "Sp. Defense", speed: "Speed" };
const regionNames = ["KANTO", "JOHTO", "HOENN", "SINNOH", "UNOVA", "KALOS", "ALOLA", "GALAR", "PALDEA"];
const generationEnds = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
function getRegion(id) { const generation = generationEnds.findIndex((end) => Number(id) <= end) + 1 || 9; return regionNames[generation - 1]; }

export default function DetailPage() {
  const { name } = useParams();
  const [pokemon, setPokemon] = useState(null);
  const [state, setState] = useState("loading");
  const [weaknesses, setWeaknesses] = useState([]);
  const [weaknessesReady, setWeaknessesReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setState("loading"); setPokemon(null); setWeaknesses([]); setWeaknessesReady(false);
    fetch(`${API_BASE_URL}/pokemon/${encodeURIComponent(name.toLowerCase())}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data) => {
        setPokemon(data); setState("ready"); document.title = `${capitalize(data.name)} — Pokédex Field Guide`;
        Promise.all(data.types.map(({ type }) => fetch(`${API_BASE_URL}/type/${type.name}`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("Could not load type data"); return response.json(); })))
          .then((defendingTypes) => {
            const result = attackTypes.map((attackType) => {
              const multiplier = defendingTypes.reduce((total, defendingType) => {
                const relations = defendingType.damage_relations;
                if (relations.no_damage_from.some((entry) => entry.name === attackType)) return 0;
                if (relations.double_damage_from.some((entry) => entry.name === attackType)) return total * 2;
                if (relations.half_damage_from.some((entry) => entry.name === attackType)) return total * 0.5;
                return total;
              }, 1);
              return { name: attackType, multiplier };
            }).filter(({ multiplier }) => multiplier > 1).sort((a, b) => b.multiplier - a.multiplier || a.name.localeCompare(b.name));
            setWeaknesses(result); setWeaknessesReady(true);
          })
          .catch((error) => { if (error.name !== "AbortError") setWeaknessesReady(true); });
      })
      .catch((e) => { if (e.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [name]);
  if (state === "loading") return <div className="detail-loading"><span className="loading-pokeball" /><p>LEAFING THROUGH THE FIELD GUIDE…</p></div>;
  if (state === "error") return <section className="state-panel detail-error"><span className="state-icon">?</span><h3>We couldn’t find that specimen.</h3><p>Check the spelling or search the catalog for another Pokémon.</p><Link to="/" className="button-link">BACK TO THE CATALOG ↗</Link></section>;
  const color = typeColors[pokemon.types[0]?.type.name] || "#758d74";
  const maxStat = 255;
  const statTotal = pokemon.stats.reduce((total, { base_stat }) => total + base_stat, 0);
  return <article className="detail-page" style={{ "--type-color": color }}>
    <Link to="/" className="back-link">← ALL SPECIMENS</Link>
    <div className="detail-layout"><div className="detail-visual"><span className="detail-watermark">{formatId(pokemon.id)}</span><span className="detail-orbit" /><img src={getArtworkUrl(pokemon.id)} alt={pokemon.name} /><span className="visual-caption">PLATE {String(pokemon.id).padStart(3, "0")} <i>•</i> {getRegion(pokemon.id)} REGION</span></div>
      <div className="detail-copy"><div className="eyebrow"><span className="eyebrow-line" /> SPECIMEN PROFILE</div><span className="detail-id">{formatId(pokemon.id)} <span>／</span> NATIONAL POKÉDEX</span><h1>{capitalize(pokemon.name)}<span className="heading-period">.</span></h1>
        <div className="type-row">{pokemon.types.map(({ type }) => <span className="type-pill" key={type.name}>{type.name}</span>)}</div>
        <p className="detail-intro">A closer look at one of the remarkable creatures in our growing field guide.</p>
        <div className="measurements"><div><span>HEIGHT</span><strong>{(pokemon.height / 10).toFixed(1)} <small>m</small></strong></div><div><span>WEIGHT</span><strong>{(pokemon.weight / 10).toFixed(1)} <small>kg</small></strong></div><div><span>BASE EXP.</span><strong>{pokemon.base_experience ?? "—"} <small>xp</small></strong></div></div>
        <section className="stats"><div className="stats-title"><div><h2>Base stat spread</h2><p>Six core measurements</p></div><div className="stats-total"><small>TOTAL</small><b>{statTotal}</b></div></div><div className="stats-scale"><span>0</span><span>255</span></div>{pokemon.stats.map(({ stat, base_stat }) => <div className="stat-row" key={stat.name}><span>{statLabels[stat.name] || stat.name}</span><div className="stat-track"><span style={{ width: `${Math.min(100, base_stat / maxStat * 100)}%` }} /></div><strong>{String(base_stat).padStart(3, "0")}</strong></div>)}</section>
        <section className="weakness-section"><div className="weakness-heading"><div><h2>Type weaknesses</h2><span>INCOMING DAMAGE</span></div><small>{weaknessesReady ? `${weaknesses.length} MATCHUPS` : "CHECKING TYPES…"}</small></div>{weaknessesReady ? <div className="weakness-list">{weaknesses.length ? weaknesses.map(({ name: weakness, multiplier }) => <span className="weakness-chip" key={weakness} style={{ "--weakness-color": typeColors[weakness] }}><b>{weakness}</b><small>×{multiplier}</small></span>) : <p className="no-weakness">No type weaknesses found.</p>}</div> : <div className="weakness-loading"><span /><span /><span /></div>}</section>
        <div className="abilities"><span>KNOWN ABILITIES</span><p>{pokemon.abilities.map(({ ability }) => capitalize(ability.name.replace("-", " "))).join(" · ")}</p></div>
      </div></div>
  </article>;
}
