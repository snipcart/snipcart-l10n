// Validates locales/*.json against en.json. Exits 1 when any error is found.
// Usage: node check.js [--keys a.b,c.d] [--locales de,fr-FR] [--warnings]
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'locales');

// Proper names (carriers, countries, states) fall back to English by design.
const FALLBACK_PREFIXES = ['carrier.', 'countries.'];

const PLACEHOLDER = /%\{\s*([A-Za-z0-9_]+)\s*\}/g;
const OTHER_INTERPOLATION = /\{\{[^}]*\}\}|%[sd]\b|\$\{[^}]*\}|\{[A-Za-z_][A-Za-z0-9_]*\}/g;
const TAG = /<\/?([A-Za-z][A-Za-z0-9]*)\b[^>]*>/g;
const MARKER = /\b(TODO|TRANSLATE|FIXME|XXX)\b|\?\?\?/;

// Plural forms node-polyglot 2.4.0 picks from per language (its pluralTypeToLanguages; unlisted
// languages use the 2-form English rule). Missing forms fall back to form 0, the singular.
const PLURAL_FORMS = { ar: 6, cs: 3, sk: 3, hr: 3, ru: 3, lt: 3, pl: 3 };

const SCRIPTS = {
    ar: /[؀-ۿ]/, he: /[֐-׿]/, el: /[Ͱ-Ͽ]/, ka: /[Ⴀ-ჿ]/,
    ko: /[가-힯]/, zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/,
    bn: /[ঀ-৿]/, hi: /[ऀ-ॿ]/, th: /[฀-๿]/,
    ru: /[Ѐ-ӿ]/, uk: /[Ѐ-ӿ]/, ua: /[Ѐ-ӿ]/, bg: /[Ѐ-ӿ]/,
    kk: /[Ѐ-ӿ]/, kz: /[Ѐ-ӿ]/, mk: /[Ѐ-ӿ]/,
};

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

function flatten(obj, prefix = '') {
    const flat = {};
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object') Object.assign(flat, flatten(v, key));
        else flat[key] = v;
    }
    return flat;
}

function isRegional(locale) {
    return /^[A-Za-z]{2}-[A-Za-z]{2}$/.test(locale)
        && fs.existsSync(path.join(LOCALES_DIR, `${locale.slice(0, 2)}.json`));
}

const placeholders = (s) => (s.match(PLACEHOLDER) || []).map((m) => m.replace(/[%{}\s]/g, '')).sort();
const tags = (s) => (s.match(TAG) || []).map((m) => m.replace(/\s.*|>/g, '>')).sort().join(',');

// Returns problems for one translated value: [{ level: 'error'|'warning', kind, detail }].
function checkValue(enValue, value, locale) {
    const problems = [];
    const error = (kind, detail = '') => problems.push({ level: 'error', kind, detail });
    const warning = (kind, detail = '') => problems.push({ level: 'warning', kind, detail });

    if (typeof value !== typeof enValue) {
        error('shape', `en is ${typeof enValue}, locale is ${value === null ? 'null' : typeof value}`);
        return problems;
    }
    if (typeof value !== 'string') return problems;
    if (enValue.trim() && !value.trim()) {
        error('empty');
        return problems;
    }

    const phEn = placeholders(enValue).filter((p, i, a) => a.indexOf(p) === i);
    const phLoc = placeholders(value).filter((p, i, a) => a.indexOf(p) === i);
    const missing = phEn.filter((p) => !phLoc.includes(p));
    const extra = phLoc.filter((p) => !phEn.includes(p));
    if (missing.length || extra.length) {
        error('placeholder', `missing [${missing}] unknown [${extra}]`);
    }
    if (value.includes('||||') && !enValue.includes('||||')) {
        error('plural', 'has |||| plural forms but en does not (rendered literally)');
    }
    const requiredForms = PLURAL_FORMS[locale] || PLURAL_FORMS[locale.split('-')[0]];
    const forms = value.split('||||').length;
    if (requiredForms && enValue.includes('||||') && forms < requiredForms) {
        error('plural_forms', `${forms} forms, Polyglot's rule for this language picks from ${requiredForms}`);
    }
    const otherEn = (enValue.replace(PLACEHOLDER, '').match(OTHER_INTERPOLATION) || []).sort().join(',');
    const otherLoc = (value.replace(PLACEHOLDER, '').match(OTHER_INTERPOLATION) || []).sort().join(',');
    if (otherEn !== otherLoc) error('interpolation', `en [${otherEn}] locale [${otherLoc}]`);
    if (tags(enValue) !== tags(value)) error('html', `en [${tags(enValue)}] locale [${tags(value)}]`);
    if (MARKER.test(value)) error('marker', 'leftover TODO/???-style marker');

    const lang = locale.slice(0, 2);
    if (lang !== 'en' && value === enValue && /[A-Za-z]{4,}/.test(enValue.replace(PLACEHOLDER, ''))) {
        warning('identical_to_en');
    }
    const script = SCRIPTS[locale] || SCRIPTS[lang];
    const letters = value.replace(PLACEHOLDER, '');
    if (script && (letters.match(/[A-Za-z]/g) || []).length > 8 && !script.test(letters)) {
        warning('wrong_script', `no ${locale} script characters`);
    }
    return problems;
}

// en.json has keys containing dots (errors.shipping."E.PO_BOX.INTERNATIONAL"); a locale that nests
// them instead (E > PO_BOX > INTERNATIONAL) flattens to the same path, so compare the real structure.
function splitDottedKeys(locNode, enNode, prefix, found) {
    for (const k of Object.keys(locNode)) {
        const p = prefix ? `${prefix}.${k}` : k;
        if (k in enNode) {
            if (locNode[k] && typeof locNode[k] === 'object' && enNode[k] && typeof enNode[k] === 'object') {
                splitDottedKeys(locNode[k], enNode[k], p, found);
            }
        } else if (Object.keys(enNode).some((e) => e.startsWith(`${k}.`))) {
            found.push(p);
        }
    }
    return found;
}

function parseArgs(argv) {
    const args = { keys: null, locales: null, warnings: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--keys') args.keys = argv[++i].split(',').filter(Boolean);
        else if (argv[i] === '--locales') args.locales = argv[++i].split(',').filter(Boolean);
        else if (argv[i] === '--warnings') args.warnings = true;
        else throw new Error(`Unknown argument ${argv[i]}`);
    }
    return args;
}

function run(args) {
    const enRaw = readJson(path.join(LOCALES_DIR, 'en.json'));
    const en = flatten(enRaw);
    const inScope = (key) => !args.keys || args.keys.some((k) => key === k || key.startsWith(`${k}.`));
    const files = fs.readdirSync(LOCALES_DIR)
        .filter((f) => f.endsWith('.json') && f !== 'en.json')
        .map((f) => f.slice(0, -5))
        .filter((l) => !args.locales || args.locales.includes(l));

    const results = [];
    const report = (locale, key, p) => results.push({ locale, key, ...p });

    for (const locale of files) {
        let raw;
        try {
            raw = readJson(path.join(LOCALES_DIR, `${locale}.json`));
        } catch (e) {
            report(locale, '', { level: 'error', kind: 'invalid_json', detail: e.message });
            continue;
        }
        const loc = flatten(raw);
        const regional = isRegional(locale);

        if (!regional) {
            for (const key of Object.keys(en)) {
                if (!(key in loc) && inScope(key) && !FALLBACK_PREFIXES.some((p) => key.startsWith(p))) {
                    report(locale, key, { level: 'error', kind: 'missing', detail: 'falls back to English' });
                }
            }
        }
        for (const [key, value] of Object.entries(loc)) {
            if (!inScope(key)) continue;
            if (!(key in en)) {
                const parentIsString = Object.keys(en).some((k) => key.startsWith(`${k}.`));
                report(locale, key, parentIsString
                    ? { level: 'error', kind: 'shape', detail: 'en has a string at a parent path' }
                    : { level: 'warning', kind: 'extra_key', detail: 'not in en.json, never read' });
                continue;
            }
            for (const p of checkValue(en[key], value, locale)) report(locale, key, p);
        }
        for (const key of Object.keys(en)) {
            const parent = key.split('.').slice(0, -1);
            while (parent.length) {
                const p = parent.join('.');
                if (typeof loc[p] === 'string' && inScope(key)) {
                    report(locale, p, { level: 'error', kind: 'shape', detail: 'string where en has an object' });
                    break;
                }
                parent.pop();
            }
        }
        for (const p of splitDottedKeys(raw, enRaw, '', [])) {
            if (inScope(p)) report(locale, p, { level: 'error', kind: 'shape', detail: 'nests a key that en.json writes with dots in its name' });
        }
    }

    const unique = results.filter((r, i) => results.findIndex((o) =>
        o.locale === r.locale && o.key === r.key && o.kind === r.kind) === i);
    const errors = unique.filter((r) => r.level === 'error');
    const warnings = unique.filter((r) => r.level === 'warning');
    const shown = args.warnings ? unique : errors;
    for (const r of shown) {
        console.log(`${r.level.padEnd(7)} ${r.kind.padEnd(14)} ${r.locale.padEnd(6)} ${r.key}${r.detail ? `  (${r.detail})` : ''}`);
    }
    const count = (list) => Object.entries(list.reduce((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] || 0) + 1 }), {}))
        .map(([k, n]) => `${k} ${n}`).join(', ') || 'none';
    console.log(`\n${files.length} files checked. Errors: ${count(errors)}. Warnings: ${count(warnings)}${args.warnings ? '' : ' (list with --warnings)'}.`);
    return errors.length ? 1 : 0;
}

module.exports = { flatten, checkValue, isRegional, readJson, LOCALES_DIR };

if (require.main === module) {
    process.exitCode = run(parseArgs(process.argv.slice(2)));
}
