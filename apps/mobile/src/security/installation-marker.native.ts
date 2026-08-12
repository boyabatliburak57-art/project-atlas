import { File, Paths } from 'expo-file-system';
import type { InstallationMarkerStore } from './installation-guard';

const marker = new File(Paths.document, '.atlas-installation-v1');

export const installationMarkerStore: InstallationMarkerStore = {
  exists: () => Promise.resolve(marker.exists),
  create: () => {
    if (!marker.exists) {
      marker.create({ overwrite: false });
      marker.write('atlas-installation-marker-v1');
    }
    return Promise.resolve();
  },
};
