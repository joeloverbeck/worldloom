// Side-effect barrel that imports every per-class translator so the
// translatorRegistry is populated by the time compose runs. Each
// per-class file calls registerTranslator at module load.
import "./cast.js";
import "./entities.js";
import "./statuses.js";
import "./locations.js";
import "./objects.js";
import "./facts.js";
import "./beliefs.js";
import "./secrets.js";
import "./intentions.js";
import "./plans.js";
import "./emotions.js";
import "./relationships.js";
import "./obligations.js";
import "./consequences.js";
import "./clocks.js";
import "./threads.js";
import "./questions.js";
import "./artifacts.js";
