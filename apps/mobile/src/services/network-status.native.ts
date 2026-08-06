import NetInfo from '@react-native-community/netinfo';

import { type NetworkStatusController } from './network-status';

export function connectExpoNetworkStatus(
  controller: NetworkStatusController,
): () => void {
  return NetInfo.addEventListener((state) => {
    controller.setOnline(
      state.isConnected === true && state.isInternetReachable !== false,
    );
  });
}
