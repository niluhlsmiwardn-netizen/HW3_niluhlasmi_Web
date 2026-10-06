import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ListPage from "./pages/ListPage.jsx";
import DetailPage from "./pages/DetailPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import BattlePage from "./pages/BattlePage.jsx";

export default function App() {
  return (
    <HashRouter>
      <Routes><Route element={<Layout />}>
        <Route path="/" element={<ListPage />} />
        <Route path="/pokemon/:name" element={<DetailPage />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route></Routes>
    </HashRouter>
  );
}
