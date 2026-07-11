const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

module.exports = ({ config }) => {
  execFileSync(process.execPath, [join(__dirname, 'scripts/generate-native-assets.mjs')], {
    cwd: __dirname,
    stdio: process.env.CI ? 'ignore' : 'inherit',
  });

  return config;
};
