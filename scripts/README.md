# scripts/

Repo tooling. These are not part of any skill — they exist to keep the skills
themselves honest.

| Script | What it does | Invoked by |
|---|---|---|
| `validate-skills.sh` | Runs [`skills-ref validate`](https://www.npmjs.com/package/skills-ref) on every `skills/*/SKILL.md` to enforce the [Agent Skills specification](https://agentskills.io/specification). | `npm run validate`, CI |
| `check-mermaid.mjs` | Extracts every ` ```mermaid ` fenced block from every `.md` in the repo and feeds it to `mermaid.parse()`. Pure Node — no Chromium, no DOM. | `npm run check-mermaid`, CI |

## Local use

The Node version is pinned in [`.tool-versions`](../.tool-versions) (asdf-compatible).

```bash
asdf install           # first time only — reads .tool-versions
npm install            # first time only — installs mermaid for the parser
npm run check          # validate + parse in one shot
```

No asdf? Any Node ≥ 20 works; `nvm use` will also pick up `.tool-versions`.

Individual commands:

```bash
npm run validate                        # all skills
bash scripts/validate-skills.sh skills/devflow  # one skill
npm run check-mermaid                   # all markdown
node scripts/check-mermaid.mjs skills   # one subtree
```

## CI

See [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Skill validation
and Mermaid parsing are blocking jobs; the Markdown link check is non-blocking
(network flakes shouldn't fail the build).

## Adding a new check

Keep every check here:

1. **Side-effect free** (read-only; no git, no pushes).
2. **Explainable in one sentence** in the table above.
3. **Runnable locally** with a single `npm run` script that mirrors what CI does.
