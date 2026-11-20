import React from 'react';
import { Wallet } from 'lucide-react';
import type { WalletFacts } from '../data/virtualWallet';

export const VIRTUAL_WALLET_NOTICE =
  '판정에 이 가상 인물의 정보를 쓰는 중이에요. 내 정보는 바뀌지 않고, 아무것도 저장하지 않아요.';

/** 가상 지갑을 켰을 때 화면 맨 위에 보이는 안내. 끄기 버튼으로 바로 돌아간다 */
export const VirtualWalletBanner: React.FC<{ wallet: WalletFacts; onTurnOff: () => void }> = ({
  wallet,
  onTurnOff,
}) => (
  <div
    role="status"
    aria-label="가상 지갑 사용 중"
    className="border-b border-[#262A27]/30 bg-[#EEF1E3] px-5 py-2 text-[13px] font-bold text-[#1F2421] md:px-8"
  >
    <p className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
      <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        가상 지갑: {wallet.name} ({wallet.summary}). {VIRTUAL_WALLET_NOTICE}
      </span>
      <button
        type="button"
        onClick={onTurnOff}
        className="cursor-pointer rounded-lg border border-[#262A27] bg-white px-2.5 py-0.5 text-[12px] font-bold hover:bg-[#F7F5EE]"
      >
        가상 지갑 끄기
      </button>
    </p>
  </div>
);
