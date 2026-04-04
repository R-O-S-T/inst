import { createClient } from '@dynamic-labs/client';
import { ReactNativeExtension } from '@dynamic-labs/react-native-extension';
import { ViemExtension } from '@dynamic-labs/viem-extension';

export const dynamicClient = createClient({
  environmentId: 'e97dfdb5-8157-4576-bca3-e09867010428',
  appName: 'Instant',
  appOrigin: 'http://localhost:8081',
})
  .extend(ReactNativeExtension())
  .extend(ViemExtension());
