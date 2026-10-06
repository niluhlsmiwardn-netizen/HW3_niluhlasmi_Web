import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return <section className="state-panel not-found"><span className="state-icon">404</span><h3>This page wandered off.</h3><p>Let’s get you back to the field guide.</p><Link to="/" className="button-link">RETURN TO THE CATALOG ↗</Link></section>;
}
