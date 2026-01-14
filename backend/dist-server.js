const tsConfigPaths = require('tsconfig-paths');
const path = require('path');

// Load tsconfig-paths with the correct runtime config
const result = tsConfigPaths.loadConfig(path.join(__dirname, 'tsconfig.runtime.json'));
if (result.resultType === 'success') {
  tsConfigPaths.register({
    baseUrl: result.baseUrl,
    paths: result.paths,
  });
}

// Load the actual server
require('./dist/server.js');
