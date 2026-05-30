import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import { CreateManualStory } from "./pages/CreateManualStory.js";
import { ManualStories } from "./pages/ManualStories.js";
import { Worlds } from "./pages/Worlds.js";

function Banner() {
  return (
    <aside role="banner" className="manual-studio-banner">
      <h1>Manual Story Studio</h1>
      <p>Write root: worlds/&lt;world&gt;/manual-stories/&lt;story&gt;/</p>
      <p>World canon: read-only</p>
      <p>Normal story bundles: read-only</p>
      <p>External LLM: not connected</p>
    </aside>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Banner />
      <nav>
        <Link to="/">Worlds</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Worlds />} />
          <Route
            path="/worlds/:worldSlug/manual-stories"
            element={<ManualStories />}
          />
          <Route
            path="/worlds/:worldSlug/manual-stories/new"
            element={<CreateManualStory />}
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
