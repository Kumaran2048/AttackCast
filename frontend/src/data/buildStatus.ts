export interface RiskDecision {
  risk: string;
  decision: string;
  status: 'decided' | 'needs-verification' | 'prototyped';
}

export const RISK_DECISIONS: RiskDecision[] = [
{
  risk: 'PyTorch Geometric offline install',
  decision: 'Try PyG CPU wheels pinned to the torch version; if wheels fail, fall back to a hand-rolled mean-aggregator GraphSAGE layer (gnn_layer.py). Extra A is never dropped.',
  status: 'needs-verification'
},
{
  risk: 'Host graph rendering on react-native-web',
  decision: 'Layout computed on the backend (NetworkX spring_layout, seeded) and sent as x/y; frontend only draws circles and lines in SVG. Prototyped here with fixed positions.',
  status: 'prototyped'
},
{
  risk: 'Victory Native on web',
  decision: 'Flagged: recent Victory Native (XL) depends on Skia and Reanimated, which are shaky on web. Proposed smallest fix: render charts with plain react-native-svg (as in this prototype).',
  status: 'needs-verification'
},
{
  risk: 'CIC-IDS-2018 missing Src/Dst IP',
  decision: 'Check in Phase 1. If IPs are missing (Branch B), host sequences and the host graph come from CTU-13 only.',
  status: 'decided'
},
{
  risk: 'Remote fonts / assets',
  decision: 'This prototype loads IBM Plex from Google Fonts. The offline build must bundle the font files locally; offline_check.py will fail on the remote URL.',
  status: 'decided'
}];


export const PROTOTYPE_SCOPE = {
  covered: [
  'All eight screens: Live Monitor, Campaign, What-If, Model Performance, Data & States, PCAP Upload, About, Build status',
  'Deterministic replay (seeded) with play / pause / seek / speed / K, following the WindowUpdate contract',
  'In-browser evaluation: majority, Markov, logistic regression, prior rollout — 3 seeds, scenario-held-out split, per-class metrics, confusion matrix',
  'Temperature scaling on validation with ECE / Brier / log-loss and a reliability diagram',
  'Lead time, false alarms per hour, and per-horizon K-step metrics',
  'Extra B feedback rule, live buttons, plus a scripted session proving the false-alarm drop',
  'Extra A campaign view and detection comparison (single-host vs correlated)',
  'Real PCAP parsing → flows → 30s windows → heuristic stages, plus a synthetic sample capture',
  'What-if with policy-prior counterfactuals, including isolating the whole campaign group'],

  notCovered: [
  'PyTorch world model, GNN graph layer, SHAP, deep ensemble — need Python 3.11 + PyTorch',
  'Real CIC-IDS-2018 / CTU-13 ingestion, cross-dataset and natural-sequence results',
  'FastAPI + WebSocket server, SQLite feedback log, offline check script',
  'Expo / React Native packaging — this web build uses the same schema, so it can be ported']

};

export const REPO_TREE = `attackcast/
├── Makefile  requirements.txt  run.py  README.md
├── configs/  default.yaml state_map.yaml mitigations.yaml templates.yaml feedback.yaml
├── data/     raw/ interim/ processed/ demo/
├── backend/
│   ├── app/  main.py api/ schemas.py services/ ws.py settings.py feedback_store.py
│   ├── ml/
│   │   ├── ingest/   cic2018.py ctu13.py pcap_to_flows.py canonical.py
│   │   ├── build/    windows.py features.py states.py sequences.py host_graph.py campaigns.py splits.py
│   │   ├── models/   baselines.py worldmodel.py gnn_layer.py train.py rollout.py calibrate.py uncertainty.py
│   │   ├── feedback/ online_update.py
│   │   ├── explain/  shap_explain.py text_templates.py
│   │   ├── eval/     metrics.py leadtime.py crossdataset.py robustness.py benchmark.py correlation_eval.py
│   │   └── whatif.py countermeasures.py
│   └── tests/
├── frontend/   (Expo TS app — this prototype mirrors its screens)
├── docs/       architecture.md data_card.md model_card.md api.md demo_script.md
└── artifacts/  models/ metrics/ figures/ shap_cache/`;

export const FEEDBACK_RULE_TEXT = `per state s, on each analyst event:
  confirm_s ← λ·confirm_s + [action = confirm]
  dismiss_s ← λ·dismiss_s + [action = dismiss]      λ = 0.7
  bias_s    = 0.25 · (confirm_s − dismiss_s) / (confirm_s + dismiss_s + 1)
adjusted_score = clip(base_score + bias_s, 0, 1)
effective watch threshold = 0.25 − bias_s
Session-only; base checkpoint never mutated.`;