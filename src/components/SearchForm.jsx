import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchForm({ onQueryChange = () => {} }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  function submit(event) {
    event.preventDefault();
    const name = query.trim().toLowerCase();
    if (name) navigate(`/pokemon/${encodeURIComponent(name)}`);
  }
  return <form className="search-form" onSubmit={submit} role="search">
    <span className="search-icon" aria-hidden="true">⌕</span>
    <input aria-label="Search Pokémon" value={query} onChange={(e) => { setQuery(e.target.value); onQueryChange(e.target.value); }} placeholder="Search by name or Pokédex number…" />
    <kbd>↵</kbd><button className="search-submit" type="submit">SEARCH <span>↗</span></button>
  </form>;
}
