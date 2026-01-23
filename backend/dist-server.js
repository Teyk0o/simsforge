try {
  const tsConfigPaths = require('tsconfig-paths');
  const path = require('path');

  // Load tsconfig-paths with the correct runtime config
  const configFile = path.join(__dirname, 'tsconfig.runtime.json');
  const tsConfig = require(configFile);

  tsConfigPaths.register({
    baseUrl: path.join(__dirname, tsConfig.compilerOptions.baseUrl),
    paths: tsConfig.compilerOptions.paths,
  });

  console.log('[tsconfig-paths] Registered path aliases');
} catch (error) {
  console.error('[tsconfig-paths] Error loading paths:', error.message);
  process.exit(1);
}

// Load the actual server
try {
  require('./dist/server.js');
} catch (error) {
  console.error('[server] Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
