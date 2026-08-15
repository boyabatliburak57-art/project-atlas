const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [require('node:path').resolve(__dirname, '../..')];
config.resolver.disableHierarchicalLookup = false;

if (process.env.EXPO_PUBLIC_APP_ENV === 'production') {
  const defaultResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.endsWith('/market-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    if (moduleName.endsWith('/reports-settings-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    if (moduleName.endsWith('/portfolio-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    if (moduleName.endsWith('/strategy-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    if (moduleName.endsWith('/operations-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    if (moduleName.endsWith('/native-security-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    if (moduleName.endsWith('/events-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    if (moduleName.endsWith('/institutional-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    if (moduleName.endsWith('/market-structure-evidence-data')) {
      return context.resolveRequest(
        context,
        `${moduleName}.production`,
        platform,
      );
    }
    return defaultResolveRequest
      ? defaultResolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
