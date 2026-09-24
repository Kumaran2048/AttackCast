# Offline install

On an internet-connected build machine:
1. Download Python wheels for `requirements.txt`.
2. Run `npm install` and retain the npm cache/package-lock.
3. Copy the repository, wheel directory and npm cache to the air-gapped system.
4. Install Python packages with `pip --no-index --find-links <wheel-dir> -r requirements.txt`.
5. Run `npm ci --offline` in frontend.
6. Run `npm run build`.
