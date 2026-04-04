import { createClient } from '@dynamic-labs/client';
import { ReactNativeExtension } from '@dynamic-labs/react-native-extension';
import { ViemExtension } from '@dynamic-labs/viem-extension';
import { DYNAMIC_ENVIRONMENT_ID } from './src/config/secrets';

export const dynamicClient = createClient({
  environmentId: DYNAMIC_ENVIRONMENT_ID,
  appName: 'Instant',
  appOrigin: 'http://localhost:8081',
})
  .extend(ReactNativeExtension())
  .extend(ViemExtension());
