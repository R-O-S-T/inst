// BigInt serialization polyfill — required for ERC-4337 UserOperations
// which contain BigInt values that pass through JSON.stringify via the Dynamic WebView
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
