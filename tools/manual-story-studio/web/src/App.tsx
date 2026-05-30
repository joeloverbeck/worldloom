import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import { CastAndProfiles } from "./pages/CastAndProfiles.js";
import { CreateManualStory } from "./pages/CreateManualStory.js";
import { Dashboard } from "./pages/Dashboard.js";
import { ManualStories } from "./pages/ManualStories.js";
import { MomentComposer } from "./pages/MomentComposer.js";
import { PromptPreview } from "./pages/PromptPreview.js";
import { Records } from "./pages/Records.js";
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
          <Route
            path="/worlds/:worldSlug/manual-stories/:msSlug/dashboard"
            element={<Dashboard />}
          />
          <Route
            path="/worlds/:worldSlug/manual-stories/:msSlug/records"
            element={<Records />}
          />
          <Route
            path="/worlds/:worldSlug/manual-stories/:msSlug/cast"
            element={<CastAndProfiles />}
          />
          <Route
            path="/worlds/:worldSlug/manual-stories/:msSlug/moment-composer"
            element={<MomentComposer />}
          />
          <Route
            path="/worlds/:worldSlug/manual-stories/:msSlug/prompts/preview"
            element={<PromptPreview />}
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
