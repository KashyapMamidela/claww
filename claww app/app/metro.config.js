// The adaptive engine and the rep-range helpers live in supabase/functions/_shared
// (plain dependency-free TypeScript shared with the Edge Functions), so Metro
// has to watch that folder too. See lib/engine.ts.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../supabase/functions/_shared')];

module.exports = config;
