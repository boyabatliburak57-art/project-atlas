import type { ConfigContext } from 'expo/config';
import configFactory from '../app.config';
import { parseMobileEnvironment } from '../src/config/environment';

const environment = parseMobileEnvironment(process.env, {
  release: process.env['NODE_ENV'] === 'production',
});
const config = configFactory({ config: {} } as ConfigContext);
if (config.scheme !== environment.EXPO_PUBLIC_DEEP_LINK_SCHEME) {
  throw new Error('App scheme and environment scheme must match');
}
if (!config.ios?.supportsTablet)
  throw new Error('Tablet support must be enabled');
if (config.extra?.['identifierStatus'] !== 'PLACEHOLDER_NOT_STORE_APPROVED') {
  throw new Error('Identifier approval status must remain explicit');
}
process.stdout.write('Mobile config validation passed\n');
