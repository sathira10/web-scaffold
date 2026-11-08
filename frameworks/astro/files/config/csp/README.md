# Content Security Policy origins

One JSON file per third-party service. `astro.config.mjs` reads every file here and adds its
origins to the policy, but only when `env` names a variable that is set and matches `pattern`.
A file with no `env` always applies.

```json
{
  "env": "PUBLIC_EXAMPLE_KEY",
  "pattern": "^[a-z0-9]+$",
  "script": ["https://cdn.example.com"],
  "connect": ["https://api.example.com"],
  "img": [],
  "frame": [],
  "form": []
}
```
