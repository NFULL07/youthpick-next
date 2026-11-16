import React, { useEffect, useState } from 'react';
import { AiSherpaDrawer } from './components/AiSherpaDrawer';
import { BottomNav } from './components/BottomNav';
import { DemoDataBanner } from './components/DemoDataBanner';
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
import { PolicyItem, RouteId, UserProfile, WalletDocument } from './types/policy';
import {
  sanitizeProfile,
  sanitizeStringList,
  sanitizeWalletDocs,
} from './utils/storedState';
import {
  clearCompareIdsForTab,
  countCheckedPrepPolicies,
  getComparedPoliciesForTab,
  getRecommendedPoliciesForProfile,
} from './utils/policyEngine';

export interface RemovedPrepPolicySnapshot {
  policyId: string;
  policyTitle: string;
  checkedChecklistIds: string[];
  targetDate: string;
}

const STORAGE_KEY_PROFILE = 'cheongnyeonpick_profile_v2';
const STORAGE_KEY_SAVED = 'cheongnyeonpick_saved_v2';
const STORAGE_KEY_PREP_POLICIES = 'cheongnyeonpick_prep_policies_v2';
const STORAGE_KEY_CHECKLIST = 'cheongnyeonpick_checklist_v3';
const STORAGE_KEY_DOCS = 'cheongnyeonpick_docs_v2';
const STORAGE_KEY_DATES = 'cheongnyeonpick_target_dates_v2';

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

  // 저장값 형식이 다르면(이전 버전·손상) 기본값을 써서 빈 화면을 막는다
  const [profile, setProfile] = useState<UserProfile>(() =>
    sanitizeProfile(loadJson<unknown>(STORAGE_KEY_PROFILE, null), DEFAULT_USER_PROFILE)
  );
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    sanitizeStringList(loadJson<unknown>(STORAGE_KEY_SAVED, null), ['1'])
  );
  const [comparePolicyIds, setComparePolicyIds] = useState<string[]>([]);
  const [prepPolicyIds, setPrepPolicyIds] = useState<string[]>(() => {
    const loaded = loadJson<unknown>(STORAGE_KEY_PREP_POLICIES, []);
    return Array.isArray(loaded) ? loaded.filter((id): id is string => typeof id === 'string') : [];
  });
  const [activePrepPolicyId, setActivePrepPolicyId] = useState<string>(() => {
    const loaded = loadJson<unknown>(STORAGE_KEY_PREP_POLICIES, []);
    if (Array.isArray(loaded) && typeof loaded[0] === 'string') {
      return loaded[0];
    }
    return '';
  });
  const [completedChecklistIds, setCompletedChecklistIds] = useState<string[]>(
    () => {
      const loaded = loadJson<unknown>(STORAGE_KEY_CHECKLIST, []);
      return Array.isArray(loaded) ? loaded.filter((id): id is string => typeof id === 'string') : [];
    }
  );
  const [targetDates, setTargetDates] = useState<Record<string, string>>(() => {
    const loaded = loadJson<unknown>(STORAGE_KEY_DATES, {});
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
      return loaded as Record<string, string>;
    }
    return {};
  });
  const [walletDocs, setWalletDocs] = useState<WalletDocument[]>(() =>
    sanitizeWalletDocs(loadJson<unknown>(STORAGE_KEY_DOCS, null), INITIAL_WALLET_DOCS)
  );

  const [isSherpaOpen, setIsSherpaOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRemovedPolicy, setLastRemovedPolicy] =
    useState<RemovedPrepPolicySnapshot | null>(null);

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
    setComparePolicyIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : Array.from(new Set([...prev, id]))
    );
  };

  const handleClearCompareForPolicies = (tabPolicies: PolicyItem[]) => {
    setComparePolicyIds((prev) => clearCompareIdsForTab(prev, tabPolicies));
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

  const handleSaveTargetDate = (policyId: string, date: string) => {
    setTargetDates((prev) => {
      const next = { ...prev, [policyId]: date };
      window.localStorage.setItem(STORAGE_KEY_DATES, JSON.stringify(next));
      return next;
    });
    showToast('준비 목표일이 저장되었어요.');
  };

  const handleStartPreparation = (policyId: string) => {
    const alreadyExists = prepPolicyIds.includes(policyId);
    if (!alreadyExists) {
      setPrepPolicyIds((prev) => {
        if (prev.includes(policyId)) return prev;
        const next = [...prev, policyId];
        window.localStorage.setItem(STORAGE_KEY_PREP_POLICIES, JSON.stringify(next));
        return next;
      });
      showToast('신청 준비 목록에 담았어요.');
    }
    if (lastRemovedPolicy?.policyId === policyId) {
      setLastRemovedPolicy(null);
    }
    setActivePrepPolicyId(policyId);
    handleNavigate('apply');
  };

  const handleRemovePrepPolicy = (policyId: string) => {
    const removedPolicy = POLICIES_DATA.find((p) => p.id === policyId);
    if (removedPolicy) {
      const checklistIdsToRemove = new Set(removedPolicy.checklist.map((c) => c.id));
      const checkedForPolicy = completedChecklistIds.filter((id) =>
        checklistIdsToRemove.has(id)
      );
      setLastRemovedPolicy({
        policyId,
        policyTitle: removedPolicy.title,
        checkedChecklistIds: checkedForPolicy,
        targetDate: targetDates[policyId] ?? '',
      });

      setCompletedChecklistIds((prev) => {
        const next = prev.filter((id) => !checklistIdsToRemove.has(id));
        window.localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(next));
        return next;
      });
    }

    const nextPrepIds = prepPolicyIds.filter((id) => id !== policyId);
    setPrepPolicyIds(nextPrepIds);
    window.localStorage.setItem(STORAGE_KEY_PREP_POLICIES, JSON.stringify(nextPrepIds));

    if (activePrepPolicyId === policyId) {
      setActivePrepPolicyId(nextPrepIds[0] ?? '');
    }

    setTargetDates((prev) => {
      if (!(policyId in prev)) return prev;
      const next = { ...prev };
      delete next[policyId];
      window.localStorage.setItem(STORAGE_KEY_DATES, JSON.stringify(next));
      return next;
    });

    showToast('준비 목록에서 정책을 뺐어요.');
  };

  const handleUndoRemovePrepPolicy = () => {
    if (!lastRemovedPolicy) return;
    const { policyId, policyTitle, checkedChecklistIds, targetDate } = lastRemovedPolicy;

    setPrepPolicyIds((prev) => {
      const next = prev.includes(policyId) ? prev : [...prev, policyId];
      window.localStorage.setItem(STORAGE_KEY_PREP_POLICIES, JSON.stringify(next));
      return next;
    });

    if (checkedChecklistIds.length > 0) {
      setCompletedChecklistIds((prev) => {
        const merged = Array.from(new Set([...prev, ...checkedChecklistIds]));
        window.localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(merged));
        return merged;
      });
    }

    if (targetDate) {
      setTargetDates((prev) => {
        const next = { ...prev, [policyId]: targetDate };
        window.localStorage.setItem(STORAGE_KEY_DATES, JSON.stringify(next));
        return next;
      });
    }

    setActivePrepPolicyId(policyId);
    setLastRemovedPolicy(null);
    showToast(`'${policyTitle}' 정책을 준비 목록으로 되돌렸어요.`);
  };

  const handleUploadDocFile = (docId: string, fileName: string) => {
    setWalletDocs((prev) => {
      const next = prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              status: '파일명 기록' as const,
              uploadedFileName: fileName,
              uploadedAt: new Date().toLocaleDateString('ko-KR'),
            }
          : doc
      );
      window.localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(next));
      return next;
    });
    showToast(`'${fileName}' 파일 이름을 이 브라우저에 기록했어요. 파일 내용은 저장하지 않아요.`);
  };

  const prepPolicies = POLICIES_DATA.filter((p) => prepPolicyIds.includes(p.id));
  const activePrepPolicy =
    prepPolicies.find((p) => p.id === activePrepPolicyId) ?? prepPolicies[0];
  const checkedPrepCount = countCheckedPrepPolicies(
    prepPolicies,
    completedChecklistIds
  );
  const detailPolicy =
    POLICIES_DATA.find((p) => p.id === detailPolicyId) ?? POLICIES_DATA[0];

  const livingZoneLabel =
    profile.schoolRegion || profile.residence || '생활권 미설정';
  const boardPolicies = getRecommendedPoliciesForProfile(POLICIES_DATA, profile, 3);
  const explorePolicies = POLICIES_DATA;
  const boardComparedPolicies = getComparedPoliciesForTab(
    boardPolicies,
    comparePolicyIds
  );
  const exploreComparedPolicies = getComparedPoliciesForTab(
    explorePolicies,
    comparePolicyIds
  );
  const hasCompareBar =
    (route === 'home' && boardComparedPolicies.length > 0) ||
    (route === 'policies' && exploreComparedPolicies.length > 0);

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1F2421]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[#1F2421] focus:px-4 focus:py-2 focus:text-white"
      >
        본문으로 이동
      </a>

      <DemoDataBanner />

      <TopNav
        currentRoute={route}
        onNavigate={(r) => handleNavigate(r)}
        activePrepCount={checkedPrepCount}
        livingZoneLabel={livingZoneLabel}
      />

      <main
        id="main"
        className={`mx-auto max-w-[1280px] px-5 pt-8 md:px-8 md:pt-10 ${
          hasCompareBar ? 'pb-52 lg:pb-28' : 'pb-40 lg:pb-10'
        }`}
      >
        {route === 'home' && (
          <HomeBoardPage
            profile={profile}
            policies={POLICIES_DATA}
            savedIds={savedIds}
            comparePolicyIds={comparePolicyIds}
            prepPolicyIds={prepPolicyIds}
            completedChecklistIds={completedChecklistIds}
            activePrepPolicy={activePrepPolicy}
            onNavigate={handleNavigate}
            onToggleSave={handleToggleSave}
            onToggleCompare={handleToggleCompare}
            onClearCompare={() => handleClearCompareForPolicies(boardPolicies)}
            onStartPreparation={handleStartPreparation}
          />
        )}

        {route === 'policies' && (
          <PoliciesExplorePage
            profile={profile}
            policies={POLICIES_DATA}
            savedIds={savedIds}
            comparePolicyIds={comparePolicyIds}
            prepPolicyIds={prepPolicyIds}
            onNavigate={handleNavigate}
            onToggleSave={handleToggleSave}
            onToggleCompare={handleToggleCompare}
            onClearCompare={() => handleClearCompareForPolicies(explorePolicies)}
            onStartPreparation={handleStartPreparation}
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
            onStartPreparation={handleStartPreparation}
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
            prepPolicies={prepPolicies}
            activePolicy={activePrepPolicy}
            completedChecklistIds={completedChecklistIds}
            targetDates={targetDates}
            lastRemovedPolicy={lastRemovedPolicy}
            onSelectActivePolicy={setActivePrepPolicyId}
            onRemovePrepPolicy={handleRemovePrepPolicy}
            onUndoRemovePrepPolicy={handleUndoRemovePrepPolicy}
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
            activePolicyTitle={activePrepPolicy?.title ?? ''}
            prepPolicyCount={prepPolicies.length}
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

      <BottomNav
        currentRoute={route}
        onNavigate={(r) => handleNavigate(r)}
        activePrepCount={checkedPrepCount}
      />

      {/* Toast Feedback (lg 미만은 하단 메뉴와 AI 버튼 위에 표시) */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] left-1/2 z-[60] -translate-x-1/2 lg:bottom-6 rounded-2xl border-[1.5px] border-[#262A27] bg-[#1F2421] px-5 py-3 text-[14px] font-bold text-white shadow-xl"
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
        hasCompareBar={hasCompareBar}
        onNavigate={(nextRoute, pId) => {
          handleNavigate(nextRoute, pId);
        }}
      />
    </div>
  );
}
