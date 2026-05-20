# CLAUDE.md - snipcart-l10n

JSON translation files for the snipcart-client cart widget. Git submodule, upstream at `github.com/snipcart/snipcart-l10n`; consumed by the parent project via `node-polyglot`. Parent overview: [`../CLAUDE.md`](../CLAUDE.md). Build and setup steps live in `README.md`.

## Conventions for adding translations

1. **`en.json` and `fr.json` are canonical — and they're written in Canadian dialects (en-CA and fr-CA), not generic English/French.** Snipcart's primary market is Canadian, so the base files use Canadian spelling and phrasing. Every key in the system must exist in `en.json`; don't add a key to another locale without first adding it there. When writing or editing the base files, write Canadian English in `en.json` and Canadian French in `fr.json`. Regional overrides like `en-GB.json`, `en-US.json`, or `fr-FR.json` are therefore diffs against a *Canadian* base, not a generic-English/French base — that's why some of them carry many overrides.
2. **Add new keys to every language file.** Missing entries fall back to English at runtime — that's a safety net, not a license to ship untranslated UI. Adding a key is a multi-locale task.
3. **Regional locales (`xx-YY.json`) contain only keys that differ from the base `xx.json`.** If `fr-CA` would say the same thing as `fr` for a given key, omit it — the merge fills in from the base automatically. Restating identical values is noise that drifts as the base changes. `fr-CA.json` is the reference example (intentionally tiny). `fr-FR.json` and `de-CH.json` historically duplicated the base — don't follow their lead, and prefer trimming redundant keys over adding more if you edit them.
4. **Don't edit `dist/`.** Generated output; commit only `locales/`.
5. **Filename strictness.** `build.js` accepts any filename in `locales/`, but the regional-merge regex `^([A-Za-z]{2})-[A-Za-z]{2}$` is strict — and that's the only filename rule the build enforces. Outcomes:
   - `fr.json`, `fr-CA.json` — fully supported. The regional file merges with its 2-letter base, then with `en.json`.
   - `fil.json` — works as a standalone language file. The regex doesn't gate base files; any name that isn't a regional pattern just merges with `en.json` defaults like every other base locale.
   - `fil-PH.json`, `zh-Hans-CN.json` — build succeeds, but the regex won't match (3-letter language, or script subtag), so the file is treated as if it had no base — only `en.json` defaults underneath, with any `fil.json` / `zh.json` / `zh-Hans.json` **silently ignored**. Avoid this shape; if you need a script-or-extended locale, flatten to `xx-YY` or reconsider whether the variant needs its own file.
   - Region casing: regex is case-insensitive, but use uppercase region (`fr-CA`, `zh-HK`) for consistency across the locale directory.
   - The runtime locale loader on snipcart-client may impose its own constraints on which filenames are reachable; a successful build doesn't guarantee a merchant can request the locale.
