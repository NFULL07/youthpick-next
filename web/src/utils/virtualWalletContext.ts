import { createContext, useContext } from 'react';
import type { WalletFacts } from '../data/virtualWallet';

/** 켜 둔 가상 지갑(시연용). 메모리에서만 들고 있고 저장하지 않는다 */
export const VirtualWalletContext = createContext<WalletFacts | null>(null);

export function useVirtualWallet(): WalletFacts | null {
  return useContext(VirtualWalletContext);
}
