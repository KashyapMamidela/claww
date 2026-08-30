module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must stay last in the plugins array — Reanimated's own install docs
    // require this ordering to transform worklets correctly.
    plugins: ['react-native-reanimated/plugin'],
  };
};
