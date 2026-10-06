import { Link, Outlet, useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();
  function goToSection(id) {
    if (window.location.hash !== "#/") navigate("/");
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);
  }
  return <div className="shell">
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Pokédex home"><span className="brand-mark"><span /></span><span>POKÉDEX</span></Link>
      <nav className="topnav"><button onClick={() => goToSection("featured")}>FEATURED</button><button onClick={() => goToSection("catalog")}>NATIONAL DEX</button><Link to="/battle" className="battle-nav">BATTLE <span>↗</span></Link><a href="https://pokeapi.co/" target="_blank" rel="noreferrer">API STATUS <span>↗</span></a></nav>
      <div className="edition"><span className="live-dot" /> SYSTEMS NORMAL <span className="edition-divider">/</span> v1.0</div>
    </header>
    <main><Outlet /></main>
    <footer className="footer"><span>POKÉDEX <i>///</i> RESEARCH SYSTEM</span><span>RESEARCH. COMPARE. DISCOVER. <span className="footer-star">✳</span></span><span>POWERED BY POKÉAPI</span></footer>
  </div>;
}
