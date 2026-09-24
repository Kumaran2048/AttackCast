setup:
\tpython -m pip install -r requirements.txt
data:
\tpython scripts/make_dataset.py --synthetic --rows 4000
train:
\tpython -m backend.ml.models.train --config configs/default.yaml
eval:
\tpython -m backend.ml.eval.metrics
test:
\tpytest -q
frontend:
\tcd frontend && npm install && npm run build
demo: frontend
\tpython run.py
