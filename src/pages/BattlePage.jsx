import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { capitalize, formatId, getArtworkUrl, getIdFromUrl } from "../utils.js";

const defaultTeam = ["charizard", "gengar", "lucario"];
const attackTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
const movesFor = (pokemon) => {
  const types = pokemon.types.map(({ type }) => type.name);
  const first = types[0] || "normal";
  const second = types[1] || first;
  return [
    { name: "Quick Jab", type: "normal", power: 40, kind: "physical" },
    { name: "Type Pulse", type: first, power: 55, kind: "special" },
    { name: "Heavy Impact", type: second, power: 75, kind: "physical" },
    { name: "Overdrive", type: first, power: 90, kind: "special" },
  ];
};
const readStat = (pokemon, name) => pokemon.stats.find(({ stat }) => stat.name === name)?.base_stat || 50;

function preparePokemon(data) {
  const hp = readStat(data, "hp") * 3 + 50;
  return {
    id: data.id, name: data.name, types: data.types.map(({ type }) => type.name),
    artwork: getArtworkUrl(data.id), hp, maxHp: hp,
    attack: readStat(data, "attack"), defense: readStat(data, "defense"),
    specialAttack: readStat(data, "special-attack"), specialDefense: readStat(data, "special-defense"),
    speed: readStat(data, "speed"), moves: movesFor(data),
  };
}

function getEffectiveness(moveType, defendingTypes, chart) {
  return defendingTypes.reduce((multiplier, defendingType) => {
    const relations = chart[defendingType];
    if (!relations) return multiplier;
    if (relations.no_damage_from.some((type) => type.name === moveType)) return 0;
    if (relations.double_damage_from.some((type) => type.name === moveType)) return multiplier * 2;
    if (relations.half_damage_from.some((type) => type.name === moveType)) return multiplier * 0.5;
    return multiplier;
  }, 1);
}

function dealAttack(game, side, moveIndex) {
  const attackingPlayer = side === "player";
  const attackerTeam = attackingPlayer ? game.playerTeam : game.cpuTeam;
  const defenderTeam = attackingPlayer ? game.cpuTeam : game.playerTeam;
  const attackerIndex = attackingPlayer ? game.playerActive : game.cpuActive;
  const defenderIndex = attackingPlayer ? game.cpuActive : game.playerActive;
  const attacker = attackerTeam[attackerIndex];
  const target = defenderTeam[defenderIndex];
  const move = attacker.moves[moveIndex];
  const attackValue = move.kind === "special" ? attacker.specialAttack : attacker.attack;
  const defenseValue = move.kind === "special" ? target.specialDefense : target.defense;
  const effectiveness = getEffectiveness(move.type, target.types, game.typeChart);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const randomFactor = 0.86 + Math.random() * 0.14;
  const damage = effectiveness === 0 ? 0 : Math.max(1, Math.floor((((2 * 50 / 5 + 2) * move.power * attackValue / Math.max(1, defenseValue)) / 50 + 2) * stab * effectiveness * randomFactor));
  const nextTeam = defenderTeam.map((pokemon, index) => index === defenderIndex ? { ...pokemon, hp: Math.max(0, pokemon.hp - damage) } : pokemon);
  const next = { ...game, [attackingPlayer ? "cpuTeam" : "playerTeam"]: nextTeam, log: [...game.log] };
  let resultText = effectiveness === 0 ? "It had no effect." : effectiveness > 1 ? "It was super effective!" : effectiveness < 1 ? "It wasn’t very effective." : "";
  next.log.push(`${capitalize(attacker.name)} used ${move.name}! ${damage} damage.${resultText ? ` ${resultText}` : ""}`);
  if (nextTeam[defenderIndex].hp === 0) {
    next.log.push(`${capitalize(target.name)} fainted.`);
    const replacementIndex = nextTeam.findIndex((pokemon) => pokemon.hp > 0);
    if (replacementIndex === -1) {
      next.phase = attackingPlayer ? "won" : "lost";
      next.log.push(attackingPlayer ? "Victory! Your team wins the battle." : "Your team has been defeated.");
    } else {
      next[attackingPlayer ? "cpuActive" : "playerActive"] = replacementIndex;
      next.log.push(`${capitalize(nextTeam[replacementIndex].name)} is up next.`);
    }
  }
  return next;
}

export default function BattlePage() {
  const [roster, setRoster] = useState([]);
  const [teamNames, setTeamNames] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pokedex-favorites") || "[]");
      return saved.length >= 3 ? saved.slice(0, 3) : defaultTeam;
    } catch { return defaultTeam; }
  });
  const [rawTeams, setRawTeams] = useState(null);
  const [battle, setBattle] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Battle Lab — Pokédex";
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/pokemon?limit=2000`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Could not load the Pokédex roster"); return response.json(); })
      .then((data) => { setRoster(data.results); setStatus("ready"); })
      .catch((err) => { if (err.name !== "AbortError") { setError(err.message); setStatus("error"); } });
    return () => controller.abort();
  }, []);

  const rosterNames = useMemo(() => new Set(roster.map(({ name }) => name)), [roster]);

  async function createBattle() {
    const chosen = teamNames.map((name) => name.trim().toLowerCase());
    if (chosen.some((name) => !rosterNames.has(name))) { setError("Choose three Pokémon from the list first."); return; }
    if (new Set(chosen).size !== 3) { setError("Your team needs three different Pokémon."); return; }
    setError(""); setStatus("battle-loading"); setBattle(null);
    try {
      const opponentPool = roster.map(({ name }) => name).filter((name) => !chosen.includes(name));
      const opponentNames = [];
      while (opponentNames.length < 3) {
        const candidate = opponentPool[Math.floor(Math.random() * opponentPool.length)];
        if (!opponentNames.includes(candidate)) opponentNames.push(candidate);
      }
      const loadTeam = async (names) => Promise.all(names.map(async (pokemonName) => {
        const response = await fetch(`${API_BASE_URL}/pokemon/${encodeURIComponent(pokemonName)}`);
        if (!response.ok) throw new Error(`Couldn't load ${pokemonName}`);
        return preparePokemon(await response.json());
      }));
      const [playerTeam, cpuTeam] = await Promise.all([loadTeam(chosen), loadTeam(opponentNames)]);
      const typeNames = [...new Set([...playerTeam, ...cpuTeam].flatMap((pokemon) => pokemon.types))];
      const typeDetails = await Promise.all(typeNames.map(async (type) => {
        const response = await fetch(`${API_BASE_URL}/type/${type}`);
        if (!response.ok) return { name: type, damage_relations: { double_damage_from: [], half_damage_from: [], no_damage_from: [] } };
        return response.json();
      }));
      const typeChart = Object.fromEntries(typeDetails.map(({ name, damage_relations }) => [name, damage_relations]));
      const initial = { playerTeam, cpuTeam, playerActive: 0, cpuActive: 0, typeChart, phase: "active", turn: "player", log: ["Battle started. Choose a technique."] };
      setRawTeams({ playerTeam, cpuTeam, typeChart }); setBattle(initial); setStatus("battle");
    } catch (err) { setError(err.message || "Battle setup failed. Try again."); setStatus("ready"); }
  }

  function cpuTurn() {
    setBattle((current) => {
      if (!current || current.phase !== "active" || current.turn !== "cpu") return current;
      const moveIndex = Math.floor(Math.random() * current.cpuTeam[current.cpuActive].moves.length);
      const next = dealAttack(current, "cpu", moveIndex);
      if (next.phase === "active") next.turn = "player";
      return next;
    });
  }

  function playerAttack(moveIndex) {
    if (!battle || battle.turn !== "player" || battle.phase !== "active") return;
    const next = dealAttack(battle, "player", moveIndex);
    if (next.phase === "active") next.turn = "cpu";
    setBattle(next);
    if (next.phase === "active") window.setTimeout(cpuTurn, 700);
  }

  function switchPokemon(index) {
    if (!battle || battle.turn !== "player" || battle.phase !== "active" || index === battle.playerActive || battle.playerTeam[index].hp <= 0) return;
    const next = { ...battle, playerActive: index, turn: "cpu", log: [...battle.log, `Come back, ${capitalize(battle.playerTeam[battle.playerActive].name)}! Go, ${capitalize(battle.playerTeam[index].name)}!`] };
    setBattle(next); window.setTimeout(cpuTurn, 700);
  }

  function useFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem("pokedex-favorites") || "[]").filter((name) => rosterNames.has(name));
      if (saved.length >= 3) setTeamNames(saved.slice(0, 3));
      else setError("Save at least three favorites in the Pokédex first.");
    } catch { setError("No saved favorites found yet."); }
  }

  function randomizeTeam() {
    if (!roster.length) return;
    const choices = [...roster].sort(() => Math.random() - 0.5).slice(0, 3).map(({ name }) => name);
    setTeamNames(choices);
  }

  function rematch() {
    if (!rawTeams) return;
    const resetTeam = (team) => team.map((pokemon) => ({ ...pokemon, hp: pokemon.maxHp }));
    setBattle({ playerTeam: resetTeam(rawTeams.playerTeam), cpuTeam: resetTeam(rawTeams.cpuTeam), playerActive: 0, cpuActive: 0, typeChart: rawTeams.typeChart, phase: "active", turn: "player", log: ["Rematch! Choose a technique."] });
    setStatus("battle");
  }

  return <section className="battle-page">
    <div className="battle-page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> POKÉDEX FIELD SYSTEM / ARENA</div><h1>Battle <em>Lab.</em></h1><p>Build your trio. Pick a technique. See which team holds the field.</p></div><Link to="/" className="back-link">← BACK TO THE DEX</Link></div>

    {status === "loading" && <div className="battle-state"><span className="loading-pokeball" /><p>LOADING BATTLE ROSTER…</p></div>}
    {status === "error" && <div className="battle-state"><h2>Couldn’t load the roster</h2><p>{error}</p><button className="battle-primary" onClick={() => window.location.reload()}>TRY AGAIN</button></div>}
    {status === "battle-loading" && <div className="battle-state"><span className="loading-pokeball" /><p>ASSEMBLING BOTH TEAMS…</p></div>}

    {status === "ready" && <div className="team-setup"><div className="setup-copy"><span className="setup-step">01 / YOUR SIDE</span><h2>Choose your<br /><em>three Pokémon.</em></h2><p>Pick any three distinct Pokémon from the national catalogue. We’ll find a random trio to challenge you.</p><div className="team-builder">{teamNames.map((name, index) => <label className="team-input-row" key={index}><span>{String(index + 1).padStart(2, "0")}</span><input aria-label={`Team Pokémon ${index + 1}`} list="battle-roster" value={name} onChange={(event) => setTeamNames((previous) => previous.map((entry, i) => i === index ? event.target.value.toLowerCase().replaceAll(" ", "-") : entry))} placeholder="Type a Pokémon name" autoComplete="off" /><b>↗</b></label>)}</div>
        <datalist id="battle-roster">{roster.map(({ name }) => <option key={name} value={name} />)}</datalist>
        <div className="setup-actions"><button className="battle-primary" onClick={createBattle}>START 3V3 BATTLE <span>↗</span></button><button className="setup-secondary" onClick={randomizeTeam}>RANDOM TEAM</button><button className="setup-secondary" onClick={useFavorites}>USE FAVORITES</button></div>{error && <p className="battle-error">{error}</p>}</div><div className="setup-side"><div className="setup-sigil">3<span>×</span>3</div><div className="setup-side-caption"><span>TURN-BASED / TYPE-AWARE</span><p>Live stats and type matchups shape every attack.</p></div><div className="setup-stars">✳</div></div></div>}

    {(status === "battle" || status === "result") && battle && <div className="battle-arena">
      <div className="arena-topline"><span><i className="arena-live" /> MATCH IN PROGRESS</span><span>FORMAT <b>3 × 3</b></span><button onClick={() => { setStatus("ready"); setBattle(null); }}>QUIT BATTLE</button></div>
      <div className="arena-board"><div className="arena-side enemy-side"><div className="side-label"><span>CPU / WILD CARD</span><b>{battle.cpuTeam.filter(({ hp }) => hp > 0).length} REMAINING</b></div><div className="team-strip">{battle.cpuTeam.map((pokemon, index) => <span className={`team-token ${pokemon.hp <= 0 ? "fainted" : ""} ${index === battle.cpuActive ? "active" : ""}`} key={pokemon.id}>{formatId(pokemon.id)}</span>)}</div><FighterCard pokemon={battle.cpuTeam[battle.cpuActive]} isOpponent turn={battle.turn} /></div>
        <div className="versus-mark">VS</div>
        <div className="arena-side player-side"><div className="side-label"><span>YOUR TEAM</span><b>{battle.playerTeam.filter(({ hp }) => hp > 0).length} REMAINING</b></div><div className="team-strip">{battle.playerTeam.map((pokemon, index) => <button className={`team-token ${pokemon.hp <= 0 ? "fainted" : ""} ${index === battle.playerActive ? "active" : ""}`} key={pokemon.id} disabled={pokemon.hp <= 0 || index === battle.playerActive || battle.turn !== "player"} onClick={() => switchPokemon(index)} title={`Switch to ${capitalize(pokemon.name)}`}>{formatId(pokemon.id)}</button>)}</div><FighterCard pokemon={battle.playerTeam[battle.playerActive]} turn={battle.turn} /></div></div>
      {battle.phase !== "active" ? <div className={`battle-result ${battle.phase}`}><span>{battle.phase === "won" ? "VICTORY" : "DEFEAT"}</span><h2>{battle.phase === "won" ? "You held the field." : "Your team was outmatched."}</h2><button className="battle-primary" onClick={rematch}>REMATCH <span>↻</span></button><button className="setup-secondary" onClick={() => { setBattle(null); setStatus("ready"); }}>BUILD A NEW TEAM</button></div> : <div className="battle-controls"><section className="move-panel"><div className="move-panel-heading"><div><span className="setup-step">YOUR TURN / {capitalize(battle.playerTeam[battle.playerActive].name)}</span><h2>Choose a technique</h2></div><span className="turn-indicator">{battle.turn === "player" ? "SELECT MOVE" : "CPU TURN…"}</span></div><div className="move-grid">{battle.playerTeam[battle.playerActive].moves.map((move, index) => <button className="move-button" key={`${move.name}-${index}`} disabled={battle.turn !== "player"} onClick={() => playerAttack(index)}><span className={`move-type type-${move.type}`}>{move.type}</span><strong>{move.name}</strong><small>POWER <b>{move.power}</b></small></button>)}</div><p className="switch-hint">Click a teammate’s number above to switch. Switching gives the CPU a turn.</p></section>
        <section className="battle-log"><div className="log-heading"><span>BATTLE LOG</span><small>LAST ACTIONS</small></div><div className="log-entries">{battle.log.slice(-6).reverse().map((entry, index) => <p className={index === 0 ? "latest" : ""} key={`${battle.log.length}-${index}`}>{entry}</p>)}</div></section>
      </div>}
    </div>}
  </section>;
}

function FighterCard({ pokemon, isOpponent = false, turn }) {
  const hpPercent = Math.max(0, pokemon.hp / pokemon.maxHp * 100);
  return <div className={`fighter-card ${isOpponent ? "enemy-fighter" : "player-fighter"} ${turn === (isOpponent ? "cpu" : "player") ? "taking-turn" : ""}`}>
    <div className="fighter-art"><span className="fighter-orbit" /><img src={pokemon.artwork} alt={pokemon.name} onError={(event) => { event.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`; }} /></div>
    <div className="fighter-info"><div className="fighter-name-row"><div><small>{formatId(pokemon.id)} / ACTIVE SPECIMEN</small><h3>{capitalize(pokemon.name.replaceAll("-", " "))}</h3></div><div className="fighter-types">{pokemon.types.map((type) => <span key={type}>{type}</span>)}</div></div><div className="hp-heading"><span>HP</span><b>{pokemon.hp} <i>/ {pokemon.maxHp}</i></b></div><div className="hp-track"><span style={{ width: `${hpPercent}%` }} /></div></div>
  </div>;
}
