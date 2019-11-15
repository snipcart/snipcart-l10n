const fs = require('fs-extra');
const path = require('path');
const merge = require('deepmerge');

if (fs.existsSync('./dist')) {
    fs.removeSync('./dist')
}

fs.mkdirSync('./dist');

const files = fs.readdirSync('./locales');
const defaults = JSON.parse(fs.readFileSync('./locales/en.json'));

files.forEach((file) => {
    const lang = path.parse(file).name;
    const fullPath = path.resolve(__dirname, 'locales', file);

    let json = JSON.parse(fs.readFileSync(fullPath));
    const culture = lang.match(/^([A-Za-z]{2})\-[A-Za-z]{2}$/);

    if (culture) {
        // If we end up here, it means it's a specific locale such as `fr-FR`
        const basePath = path.resolve(__dirname, 'locales', `${culture[1]}.json`);
        if (fs.existsSync(basePath)) {
            const baseJson = JSON.parse(fs.readFileSync(basePath));
            json = merge(baseJson, json);
        }
    }

    json = merge(defaults, json);
    const content = JSON.stringify(json);

    fs.writeFileSync(path.resolve(__dirname, 'dist', file), content);
});