import React, { useEffect, useState } from 'react';
import { AiSherpaDrawer } from './components/AiSherpaDrawer';
import { TopNav } from './components/TopNav';
import {
  DEFAULT_USER_PROFILE,
  INITIAL_WALLET_DOCS,
  POLICIES_DATA,
} from './data/policies';
import { ApplyReadyPage } from './pages/ApplyReadyPage';
import { HomeBoardPage } from './pages/HomeBoardPage';
import { LifeSwitchPage } from './pages/LifeSwitchPage';
import { PoliciesExplorePage } from './pages/PoliciesExplorePage';
import { PolicyDetailPage } from './pages/PolicyDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { WalletPage } from './pages/WalletPage';
import { RouteId, UserProfile, WalletDocument } from './types/policy';

const STORAGE_KEY_PROFILE = 'cheongnyeonpick_profile_v2';
const STORAGE_KEY_SAVED = 'cheongnyeonpick_saved_v2';
const STORAGE_KEY_CHECKLIST = 'cheongnyeonpick_checklist_v2';
const STORAGE_KEY_DOCS = 'cheongnyeonpick_docs_v2';
const STORAGE_KEY_DATE = 'cheongnyeonpick_target_date_v2';

function parseHashRoute(): { route: RouteId; policyId: string } {
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (raw.startsWith('detail/')) {
    const id = raw.slice('detail/'.length) || '1';
    return { route: 'detail', policyId: id };
  }
  const validRoutes: RouteId[] = [
    'home',
    'policies',
    'switch',
    'apply',
    'profile',
    'wallet',
  ];
  if (validRoutes.includes(raw as RouteId)) {
    return { route: raw as RouteId, policyId: '1' };
  }
  return { route: 'home', policyId: '1' };
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const initialRoute = parseHashRoute();
  const [route, setRoute] = useState<RouteId>(initialRoute.route);
  const [detailPolicyId, setDetailPolicyId] = useState<string>(
    initialRoute.policyId
  );

  const [profile, setProfile] = useState<UserProfile>(() =>
    loadJson<UserProfile>(STORAGE_KEY_PROFILE, DEFAULT_USER_PROFILE)
  );
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    loadJson<string[]>(STORAGE_KEY_SAVED, ['1'])
  );
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [activePrepPolicyId, setActivePrepPolicyId] = useState<string>('1');
  const [completedChecklistIds, setCompletedChecklistIds] = useState<string[]>(
    () => loadJson<string[]>(STORAGE_KEY_CHECKLIST, ['1-c1', '1-c2'])
  );
  const [targetDate, setTargetDate] = useState<string>(() =>
    loadJson<string>(STORAGE_KEY_DATE, '')
  );
  const [walletDocs, setWalletDocs] = useState<WalletDocument[]>(() =>
    loadJson<WalletDocument[]>(STORAGE_KEY_DOCS, INITIAL_WALLET_DOCS)
  );

  const [isSherpaOpen, setIsSherpaOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashRoute();
      setRoute(parsed.route);
      if (parsed.route === 'detail') {
        setDetailPolicyId(parsed.policyId);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleNavigate = (nextRoute: RouteId, policyId?: string) => {
    if (nextRoute === 'detail') {
      const targetId = policyId ?? detailPolicyId ?? '1';
      setDetailPolicyId(targetId);
      window.location.hash = `#detail/${targetId}`;
    } else {
      window.location.hash = `#${nextRoute}`;
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      window.localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(next));
      showToast(
        next.includes(id)
          ? '정책을 저장 목록에 담았어요.'
          : '저장 목록에서 뺐어요.'
      );
      return next;
    });
  };

  const handleToggleCompare = (id: string) => {
    setComparedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveProfile = (next: UserProfile) => {
    setProfile(next);
    window.localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(next));
    showToast('내 정보와 관심 분야가 저장되었어요.');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setCompletedChecklistIds((prev) => {
      const next = prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId];
      window.localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(next));
      return next;
    });
  };

  const handleSaveTargetDate = (date: string) => {
    setTargetDate(date);
    window.localStorage.setItem(STORAGE_KEY_DATE, JSON.stringify(date));
    showToast('준비 목표일이 저장되었어요.');
  };

  const handleUploadDocFile = (docId: string, fileName: string) => {
    setWalletDocs((prev) => {
      const next = prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              status: '보관 완료' as const,
              uploadedFileName: fileName,
              uploadedAt: new Date().toLocaleDateString('ko-KR'),
            }
          : doc
      );
      window.localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(next));
      return next;
    });
    showToast(`'${fileName}' 문서가 브라우저 전자지갑에 연결되었어요.`);
  };

  const activePrepPolicy =
    POLICIES_DATA.find((p) => p.id === activePrepPolicyId) ?? POLICIES_DATA[0];
  const detailPolicy =
    POLICIES_DATA.find((p) => p.id === detailPolicyId) ?? POLICIES_DATA[0];

  const livingZoneLabel =
    profile.schoolRegion || profile.residence || '생활권 미설정';

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1F2421]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[#1F2421] focus:px-4 focus:py-2 focus:text-white"
      >
        본문으로 이동
      </a>

      <TopNav
        currentRoute={route}
        onNavigate={(r) => handleNavigate(r)}
        activePrepCount={1}
        livingZoneLabel={livingZoneLabel}
      />

      <main
        id="main"
        className="mx-auto max-w-[1280px] px-5 py-8 pb-24 md:px-8 md:py-10"
      >
        {route === 'home' && (
          <HomeBoardPage
            profile={profile}
            policies={POLICIES_DATA}
            savedIds={savedIds}
            comparedIds={comparedIds}
            completedChecklistIds={completedChecklistIds}
            activePrepPolicy={activePrepPolicy}
            onNavigate={handleNavigate}
            onToggleSave={handleToggleSave}
            onToggleCompare={handleToggleCompare}
          />
        )}

        {route === 'policies' && (
          <PoliciesExplorePage
            profile={profile}
            policies={POLICIES_DATA}
            savedIds={savedIds}
            comparedIds={comparedIds}
            onNavigate={handleNavigate}
            onToggleSave={handleToggleSave}
            onToggleCompare={handleToggleCompare}
            onClearCompare={() => setComparedIds([])}
            onOpenSherpaWithPrompt={() => setIsSherpaOpen(true)}
          />
        )}

        {route === 'detail' && (
          <PolicyDetailPage
            policy={detailPolicy}
            profile={profile}
            isSaved={savedIds.includes(detailPolicy.id)}
            onToggleSave={handleToggleSave}
            onNavigate={handleNavigate}
            onStartPreparation={(id) => {
              setActivePrepPolicyId(id);
              handleNavigate('apply');
            }}
            onAskSherpaAboutPolicy={() => setIsSherpaOpen(true)}
          />
        )}

        {route === 'switch' && (
          <LifeSwitchPage
            profile={profile}
            policies={POLICIES_DATA}
            onNavigate={handleNavigate}
          />
        )}

        {route === 'apply' && (
          <ApplyReadyPage
            policies={POLICIES_DATA}
            activePolicy={activePrepPolicy}
            completedChecklistIds={completedChecklistIds}
            targetDate={targetDate}
            onSelectActivePolicy={setActivePrepPolicyId}
            onToggleChecklistItem={handleToggleChecklistItem}
            onSaveTargetDate={handleSaveTargetDate}
            onNavigate={handleNavigate}
          />
        )}

        {route === 'profile' && (
          <ProfilePage
            profile={profile}
            walletDocCount={
              walletDocs.filter((d) => Boolean(d.uploadedFileName)).length
            }
            guideCount={1}
            onSaveProfile={handleSaveProfile}
            onNavigate={(r) => handleNavigate(r)}
          />
        )}

        {route === 'wallet' && (
          <WalletPage
            profile={profile}
            documents={walletDocs}
            activePolicyTitle={activePrepPolicy.title}
            onUploadDocFile={handleUploadDocFile}
            onNavigate={handleNavigate}
          />
        )}

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-[#DCD7C9] pt-6 text-[13px] font-semibold text-[#4A4D49] md:pr-56">
          <div>
            <strong className="font-extrabold text-[#1F2421]">청년픽 NEXT</strong>
            <span className="ml-2">내 다음을, 가볍게 픽.</span>
          </div>
          <span className="font-mono-num tracking-wider">A NEXT:UP PROJECT</span>
        </footer>
      </main>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border-[1.5px] border-[#262A27] bg-[#1F2421] px-5 py-3 text-[14px] font-bold text-white shadow-xl"
        >
          {toastMessage}
        </div>
      )}

      {/* Widened Rule-based AI Navigator Drawer */}
      <AiSherpaDrawer
        isOpen={isSherpaOpen}
        onToggle={() => setIsSherpaOpen((prev) => !prev)}
        route={route}
        profile={profile}
        selectedPolicy={route === 'detail' ? detailPolicy : undefined}
        policies={POLICIES_DATA}
        onNavigate={(nextRoute, pId) => {
          handleNavigate(nextRoute, pId);
        }}
      />
    </div>
  );
}
