module.exports = {
  plugins: [
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-strict-mode',
    ['inline-json-import', {}],
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '22',
        },
      },
    ],
  ],
};
