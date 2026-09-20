module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      './babel-plugin-force-font',
      // Must stay last in the plugins array — Reanimated's own install docs
      // require this ordering to transform worklets correctly.
      'react-native-reanimated/plugin',
    ],
  };
};
