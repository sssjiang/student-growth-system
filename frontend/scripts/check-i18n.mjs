import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = ['zhCN', 'zhHK', 'en'];

function flatten(value, prefix = '', result = {}) {
  Object.entries(value).forEach(([key, item]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object') flatten(item, fullKey, result);
    else result[fullKey] = item;
  });
  return result;
}

function placeholders(value) {
  return [...String(value).matchAll(/{{\s*([^},\s]+).*?}}/g)]
    .map((match) => match[1])
    .sort();
}

const translations = Object.fromEntries(
  languages.map((language) => {
    const filename = path.join(root, 'src', 'locales', `${language}.json`);
    return [language, flatten(JSON.parse(fs.readFileSync(filename, 'utf8')))];
  })
);

const reference = translations.zhCN;
const problems = [];
languages.forEach((language) => {
  const current = translations[language];
  Object.keys(reference).forEach((key) => {
    if (!(key in current)) problems.push(`${language}: missing ${key}`);
    else if (
      placeholders(reference[key]).join(',') !==
      placeholders(current[key]).join(',')
    ) {
      problems.push(`${language}: placeholder mismatch in ${key}`);
    }
  });
  Object.keys(current).forEach((key) => {
    if (!(key in reference)) problems.push(`${language}: extra ${key}`);
  });
});

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(
  `Checked ${Object.keys(reference).length} translation keys across ${languages.length} languages.`
);
