import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import { HealthBanner } from "./components/HealthBanner.js";
import { StoryPageNav } from "./components/StoryPageNav.js";
import { BeatTemplates } from "./pages/BeatTemplates.js";
import { CastAndProfiles } from "./pages/CastAndProfiles.js";
import { CreateManualStory } from "./pages/CreateManualStory.js";
import { Dashboard } from "./pages/Dashboard.js";
import { EditContract } from "./pages/EditContract.js";
import { EditPromptWorkingSet } from "./pages/EditPromptWorkingSet.js";
import { ManualStories } from "./pages/ManualStories.js";
import { Manuscript } from "./pages/Manuscript.js";
import { MomentComposer } from "./pages/MomentComposer.js";
import { PasteProse } from "./pages/PasteProse.js";
import { PostSegmentWorkbench } from "./pages/PostSegmentWorkbench.js";
import { PromptPreview } from "./pages/PromptPreview.js";
import { PromptHistory } from "./pages/PromptHistory.js";
import { Records } from "./pages/Records.js";
import { RepairSegments } from "./pages/RepairSegments.js";
import { SourceBrowser } from "./pages/SourceBrowser.js";
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

function Shell() {
  return (
    <>
      <Banner />
      <HealthBanner />
      <StoryPageNav />
      <main>
        <Outlet />
      </main>
    </>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <Shell />,
      children: [
        { path: "/", element: <Worlds /> },
        {
          path: "/worlds/:worldSlug/manual-stories",
          element: <ManualStories />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/new",
          element: <CreateManualStory />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/dashboard",
          element: <Dashboard />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/records",
          element: <Records />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/source-browser",
          element: <SourceBrowser />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/cast",
          element: <CastAndProfiles />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/moment-composer",
          element: <MomentComposer />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/prompts/preview",
          element: <PromptPreview />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/paste-prose",
          element: <PasteProse />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/segments/:segmentId/post-segment-workbench",
          element: <PostSegmentWorkbench />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/manuscript",
          element: <Manuscript />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/repair",
          element: <RepairSegments />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/contract",
          element: <EditContract />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/prompt-working-set/edit",
          element: <EditPromptWorkingSet />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/prompt-history",
          element: <PromptHistory />,
        },
        {
          path: "/worlds/:worldSlug/manual-stories/:msSlug/beat-templates",
          element: <BeatTemplates />,
        },
      ],
    },
  ],
  {
    future: { v7_relativeSplatPath: true },
  },
);

export function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
