import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchForm from "../components/SearchForm.jsx";
import PokemonList from "../components/PokemonList.jsx";

const featured = ["rayquaza", "giratina", "deoxys", "mewtwo", "dragonite", "lucario", "gardevoir", "greninja", "charizard", "pikachu", "gengar", "tyranitar"];

export default function ListPage() {
  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("number");
  const [pageSize, setPageSize] = useState("24");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pokedex-favorites") || "[]"); } catch { return []; }
  });
  const [catalogInfo, setCatalogInfo] = useState({ count: 0, page: 1, pageCount: 0 });
  const navigate = useNavigate();
  const randomPokemon = useMemo(() => featured[Math.floor(Math.random() * featured.length)], []);
  function toggleFavorite(name) {
    setFavorites((previous) => {
      const next = previous.includes(name) ? previous.filter((entry) => entry !== name) : [...previous, name];
      localStorage.setItem("pokedex-favorites", JSON.stringify(next));
      return next;
    });
  }
  function changeFilter(setter, value) { setter(value); setCatalogInfo((info) => ({ ...info, page: 1 })); }

  return <>
    <section className="nexus-hero">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> DATA LIVE <span className="hero-live-dot" /> A NEXT-GENERATION POKÉMON FIELD SYSTEM</div>
        <h1>Find your<br /><em>favorite.</em></h1>
        <p className="hero-description">Explore more than 1,300 Pokémon by name, number, generation, or type. Save the ones you love and discover every detail in their profiles.</p>
        <SearchForm onQueryChange={(value) => { setQuery(value); setCatalogInfo((info) => ({ ...info, page: 1 })); }} />
        <div className="type-discovery"><span>START WITH A TYPE</span>{[{ name: "Electric", symbol: "ϟ" }, { name: "Water", symbol: "◌" }, { name: "Psychic", symbol: "✳" }].map(({ name, symbol }) => <button key={name} onClick={() => { setQuery(name.toLowerCase()); setCatalogInfo((info) => ({ ...info, page: 1 })); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }}><i>{symbol}</i>{name}</button>)}</div>
        <button className="surprise-button" onClick={() => navigate(`/pokemon/${randomPokemon}`)}><span>✳</span> SURPRISE ME <b>↗</b></button>
      </div>
      <div className="hero-art" aria-hidden="true"><span className="hero-sun" /><span className="hero-ring ring-one" /><span className="hero-ring ring-two" /><span className="hero-cross">✳</span><span className="hero-coordinates">FIELD NO. 448<br />FIGHTING / STEEL</span><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png" alt="" /></div>
      <div className="hero-index"><span>POKÉDEX FIELD GUIDE</span><strong>RESEARCH. DISCOVER. REPEAT.</strong></div>
      <div className="dex-live"><span className="live-pulse" /><div><strong>{catalogInfo.count ? catalogInfo.count.toLocaleString() : "1,351"}</strong><small>ENTRIES INDEXED</small></div><span className="live-rule" /><small>DEX ONLINE</small></div>
    </section>

    <section className="featured-section" id="featured"><div className="section-topline"><div><div className="eyebrow"><span className="eyebrow-line" /> FEATURED ENCOUNTERS</div><h2>A few <em>fan favorites.</em></h2></div><span className="section-aside">CURATED FIELD PICKS / 001—012</span></div>
      <div className="featured-rail">{featured.map((name, index) => <Link className="featured-chip" to={`/pokemon/${name}`} key={name}><span className={`featured-sprite sprite-${index}`}><img loading="lazy" src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${({ rayquaza: 384, giratina: 487, deoxys: 386, mewtwo: 150, dragonite: 149, lucario: 448, gardevoir: 282, greninja: 658, charizard: 6, pikachu: 25, gengar: 94, tyranitar: 248 })[name]}.png`} alt="" /></span><span><small>SPECIMEN {String(index + 1).padStart(2, "0")}</small><strong>{name === "giratina" ? "Giratina" : name.charAt(0).toUpperCase() + name.slice(1)}</strong></span><b>↗</b></Link>)}</div>
    </section>

    <section className="catalog nexus-catalog" id="catalog"><div className="section-topline catalog-topline"><div><div className="eyebrow"><span className="eyebrow-line" /> NATIONAL CATALOGUE</div><h2>Browse every <em>discovery.</em></h2></div><div className="catalog-total"><strong>{catalogInfo.count.toLocaleString() || "1,351"}</strong><span>SPECIES INDEXED</span></div></div>
      <div className="catalog-tools">
        <SearchForm onQueryChange={(value) => { setQuery(value); setCatalogInfo((info) => ({ ...info, page: 1 })); }} />
        <div className="filter-strip"><label><span>GENERATION</span><select value={generation} onChange={(e) => changeFilter(setGeneration, e.target.value)}><option value="all">All generations</option>{Array.from({ length: 9 }, (_, i) => <option value={String(i + 1)} key={i}>Gen {i + 1} · {(["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"])[i]}</option>)}</select></label><label><span>TYPE</span><select value={type} onChange={(e) => changeFilter(setType, e.target.value)}><option value="all">All types</option>{["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"].map((value) => <option value={value} key={value}>{value}</option>)}</select></label><label><span>SORT</span><select value={sort} onChange={(e) => changeFilter(setSort, e.target.value)}><option value="number">Pokédex number</option><option value="name">Name A–Z</option></select></label><label><span>CARDS</span><select value={pageSize} onChange={(e) => changeFilter(setPageSize, e.target.value)}><option value="12">12</option><option value="24">24</option><option value="48">48</option></select></label><button className={`favorites-filter ${favoritesOnly ? "active" : ""}`} onClick={() => { setFavoritesOnly(!favoritesOnly); setCatalogInfo((info) => ({ ...info, page: 1 })); }}>♡ <span>FAVORITES</span>{favorites.length > 0 && <b>{favorites.length}</b>}</button><button className="reset-filters" onClick={() => { setQuery(""); setGeneration("all"); setType("all"); setSort("number"); setPageSize("24"); setFavoritesOnly(false); setCatalogInfo((info) => ({ ...info, page: 1 })); }}>RESET <span>↺</span></button></div>
      </div>
      <div className="results-meta"><span>{catalogInfo.count ? `${(catalogInfo.page - 1) * Number(pageSize) + 1}–${Math.min(catalogInfo.page * Number(pageSize), catalogInfo.count)}` : "1–24"} <i>OF</i> {catalogInfo.count.toLocaleString() || "1,351"} SPECIMENS</span><span><span className="meta-dot">●</span> ALL SYSTEMS READY</span></div>
      <PokemonList query={query} generation={generation} type={type} sort={sort} pageSize={Number(pageSize)} page={catalogInfo.page} onPageInfo={setCatalogInfo} favorites={favorites} favoritesOnly={favoritesOnly} onFavorite={toggleFavorite} />
    </section>
  </>;
}
