import type { InstallationMarkerStore } from './installation-guard';

let present = false;
export const installationMarkerStore: InstallationMarkerStore = {
  exists: () => Promise.resolve(present),
  create: () => {
    present = true;
    return Promise.resolve();
  },
};
