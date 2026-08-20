#!/usr/bin/env node
/**
 * Fails when the generated nitro glue would register no HybridObject.
 *
 * This guards a bug class that is otherwise invisible: nitrogen parses
 * nitro.json with a non-strict schema, so an `autolinking` block written in the
 * wrong shape for the installed nitro line has its unrecognised keys silently
 * dropped. Codegen then succeeds, the build succeeds, the unit tests pass, and
 * the app throws "has not yet been registered in the HybridObjectRegistry" at
 * runtime — on a device, in whichever screen first imports the module.
 *
 * Two things are checked, for every object declared in nitro.json:
 *
 *   1. The entry names a language this script recognises (`swift` / `kotlin`).
 *      Nitro 0.31.x expects those flat keys; 0.36.x expects nested per-platform
 *      objects instead, so an entry carrying `ios` / `android` keys is the
 *      wrong-shape case and fails here rather than at runtime.
 *   2. The generated glue contains a matching
 *      `registerHybridObjectConstructor("<Name>")` — in the iOS autolinking
 *      file for `swift`, in the Android OnLoad file for `kotlin`.
 *
 * Run after codegen. Reports every problem it finds rather than stopping at the
 * first, so one run tells you the whole story.
 */
const fs = require('fs');
const path = require('path');

const IOS_GLUE_DIR = path.join('nitrogen', 'generated', 'ios');
const ANDROID_GLUE_DIR = path.join('nitrogen', 'generated', 'android');
const IOS_GLUE_SUFFIX = 'Autolinking.mm';
const ANDROID_GLUE_SUFFIX = 'OnLoad.cpp';

/** Maps a nitro.json language key onto the platform whose glue must register it. */
const LANGUAGE_PLATFORMS = { swift: 'ios', kotlin: 'android' };

const problems = [];

function readNitroConfig() {
  const configPath = path.join(process.cwd(), 'nitro.json');

  if (!fs.existsSync(configPath)) {
    problems.push(`nitro.json not found at ${configPath}. Run this from the package root.`);
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')).autolinking ?? {};
  } catch (error) {
    problems.push(`nitro.json could not be parsed: ${error.message}`);
    return {};
  }
}

/** Concatenates every generated file in `dir` whose name ends with `suffix`. */
function readGlue(dir, suffix) {
  const absolute = path.join(process.cwd(), dir);

  if (!fs.existsSync(absolute)) {
    return { found: [], contents: '' };
  }

  const found = fs.readdirSync(absolute).filter((file) => file.endsWith(suffix));
  const contents = found
    .map((file) => fs.readFileSync(path.join(absolute, file), 'utf8'))
    .join('\n');

  return { found, contents };
}

function registersObject(contents, name) {
  // The generated call puts the name on its own line, so allow any whitespace
  // between the opening paren and the quoted name.
  return new RegExp(`registerHybridObjectConstructor\\s*\\(\\s*"${name}"`).test(contents);
}

const autolinking = readNitroConfig();
const objectNames = Object.keys(autolinking);

if (objectNames.length === 0) {
  problems.push('nitro.json declares no `autolinking` objects, so nothing would be registered.');
}

const expected = { ios: [], android: [] };

for (const [name, entry] of Object.entries(autolinking)) {
  const languages = Object.keys(entry ?? {}).filter((key) => key in LANGUAGE_PLATFORMS);

  if (languages.length === 0) {
    problems.push(
      `"${name}" declares no recognised language key. Nitro 0.31.x expects flat ` +
        `{ "swift": "Class", "kotlin": "Class" }; found { ${Object.keys(entry ?? {}).join(', ')} }. ` +
        'Nested per-platform objects are the 0.36.x shape and are silently ignored on this line.'
    );
    continue;
  }

  for (const language of languages) {
    expected[LANGUAGE_PLATFORMS[language]].push(name);
  }
}

const glue = {
  ios: readGlue(IOS_GLUE_DIR, IOS_GLUE_SUFFIX),
  android: readGlue(ANDROID_GLUE_DIR, ANDROID_GLUE_SUFFIX),
};

const glueDescription = {
  ios: `${IOS_GLUE_DIR}/*${IOS_GLUE_SUFFIX}`,
  android: `${ANDROID_GLUE_DIR}/*${ANDROID_GLUE_SUFFIX}`,
};

for (const platform of ['ios', 'android']) {
  const names = expected[platform];

  if (names.length === 0) {
    continue;
  }

  if (glue[platform].found.length === 0) {
    problems.push(
      `No ${glueDescription[platform]} was generated, so ${names.join(', ')} ` +
        `${names.length === 1 ? 'is' : 'are'} never registered on ${platform}. Re-run codegen.`
    );
    continue;
  }

  for (const name of names) {
    if (!registersObject(glue[platform].contents, name)) {
      problems.push(
        `${glueDescription[platform]} does not register "${name}". ` +
          'The glue is stale or was generated from a config nitrogen did not understand — re-run codegen.'
      );
    }
  }
}

if (problems.length > 0) {
  console.error('HybridObject registration check failed:\n');
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error('');
  process.exit(1);
}

const summary = ['ios', 'android']
  .filter((platform) => expected[platform].length > 0)
  .map((platform) => `${platform}: ${expected[platform].join(', ')}`)
  .join('; ');

console.log(`HybridObject registration OK — ${summary}`);
