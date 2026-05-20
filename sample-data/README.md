# Synthetic Sample Data

`usage.json` is a fully synthetic dashboard fixture. It is safe to commit and publish because it contains no real local paths, session identifiers, prompts, costs, or usage totals.

Build a sample static dashboard with:

```bash
npm run build:sample
```

The generated sample HTML is written to `dist-sample/index.html`. The committed `dist-sample/` directory is generated only from this synthetic fixture so the README can link to a ready-made sample.
