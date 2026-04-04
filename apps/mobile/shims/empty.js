// Shim for Node.js "module" built-in
// The Unlink SDK calls createRequire() to load @zk-kit/eddsa-poseidon/blake-2b
// In React Native we resolve it directly via metro bundler instead
const eddsaBlake2b = require('@zk-kit/eddsa-poseidon/dist/lib.commonjs/eddsa-poseidon-blake-2b.cjs');

module.exports = {
  createRequire: function() {
    return function(modulePath) {
      if (modulePath && modulePath.includes('eddsa-poseidon')) {
        return eddsaBlake2b;
      }
      return {};
    };
  },
};
