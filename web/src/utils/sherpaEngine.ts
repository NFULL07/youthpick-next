import { PolicyItem, RouteId, UserProfile } from '../types/policy';

export interface SherpaMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionLabel?: string;
  targetRoute?: RouteId;
  targetPolicyId?: string;
}

export interface SherpaContext {
  route: RouteId;
  profile: UserProfile;
  selectedPolicy?: PolicyItem;
  policies: PolicyItem[];
}

export function getSuggestedPrompts(route: RouteId): string[] {
  switch (route) {
    case 'policies':
      return [
        '모집 중인 정책만 추려서 볼 수 있나요?',
        '천안 대학생의 주거 조건이 궁금해요',
        '신청 전에 준비할 서류를 정리해줘',
      ];
    case 'switch':
      return [
        '졸업하고 천안으로 이사하면 어떤 정책이 달라지나요?',
        '주민등록지 변경 시 주의할 조건이 있나요?',
        '재학생에서 구직자로 바뀌면 유리한 정책은?',
      ];
    case 'profile':
      return [
        '주민등록지와 학교 소재지를 따로 넣는 이유는 뭔가요?',
        '5가지 관심 분야는 추천에 어떻게 반영되나요?',
        '근무 지역은 비워둬도 괜찮나요?',
      ];
    default:
      return [
        '천안 대학생의 주거 조건이 궁금해요',
        '신청 전에 준비할 서류를 정리해줘',
        '졸업하고 천안으로 이사하면?',
      ];
  }
}

export function generateDeterministicSherpaReply(
  question: string,
  ctx: SherpaContext
): SherpaMessage {
  const q = question.trim();
  const lower = q.toLowerCase();
  const residence = ctx.profile.residence || '미입력';
  const school = ctx.profile.schoolRegion || '미입력';
  const openCount = ctx.policies.filter(
    (p) => p.recruitmentStatus === '모집 중'
  ).length;

  if (ctx.selectedPolicy && (lower.includes('조건') || lower.includes('이 정책'))) {
    return {
      id: `ast-${Date.now()}`,
      sender: 'assistant',
      text: `현재 보고 계신 「${ctx.selectedPolicy.title}」은(는) [${ctx.selectedPolicy.category}] 분야 정책이에요.\n\n• 현재 모집 상태: ${ctx.selectedPolicy.isDemo ? '시연 예시 정책이라 금액·일정·모집 상태는 공고 연결 후 확인' : `${ctx.selectedPolicy.recruitmentStatus} (${ctx.selectedPolicy.deadlineLabel})`}\n• 내 조건 대비 핵심 확인 사항: ${ctx.selectedPolicy.keyCheckHint}\n• 필요 서류 예시: ${ctx.selectedPolicy.requiredDocs.join(', ')}\n\n내 정보 기준(만 ${ctx.profile.age}세 · ${ctx.profile.status} · 거주 ${residence} / 학교 ${school})과 비교표의 '추가 확인' 항목을 먼저 점검해 보세요.`,
      actionLabel: '신청 준비로 이어가기',
      targetRoute: 'apply',
      targetPolicyId: ctx.selectedPolicy.id,
    };
  }

  if (lower.includes('주거') || lower.includes('월세') || lower.includes('천안')) {
    return {
      id: `ast-${Date.now()}`,
      sender: 'assistant',
      text: `현재 입력하신 생활권은 주민등록지 「${residence}」, 학교 소재지 「${school}」이에요.\n\n1. 주민등록지 기준 정책과 재학 지역(천안시) 특례 정책은 인정 범위가 서로 다릅니다.\n2. 중앙부처 청년 월세 지원 등은 실제 거주지 전입신고와 임대차계약서를 함께 보는 경우가 많습니다.\n3. 만약 졸업 후 천안시로 주민등록을 옮길 계획이 있다면 <생활변화 비교> 화면에서 전입 전후 조건 차이를 미리 대조해 보세요.`,
      actionLabel: '생활변화 비교 열어보기',
      targetRoute: 'switch',
    };
  }

  if (lower.includes('서류') || lower.includes('준비') || lower.includes('지갑')) {
    return {
      id: `ast-${Date.now()}`,
      sender: 'assistant',
      text: `신청 전에 미리 챙겨두면 좋은 기본 서류 3가지를 정리했어요.\n\n• 학적 증빙: 재학증명서 또는 졸업(예정)증명서 (학교 발급)\n• 거주 증빙: 주민등록표 등본 또는 초본 (정부24, 전입일 포함)\n• 소득 증빙: 소득금액증명원 또는 건강보험료 납부확인서 (홈택스·공단)\n\n<전자지갑> 탭에서 필요한 서류별 발급처와 연결된 정책 목록을 한 번에 확인할 수 있어요.`,
      actionLabel: '전자지갑에서 확인하기',
      targetRoute: 'wallet',
    };
  }

  if (lower.includes('졸업') || lower.includes('이사') || lower.includes('전입') || lower.includes('비교')) {
    return {
      id: `ast-${Date.now()}`,
      sender: 'assistant',
      text: `졸업(${ctx.profile.status} → 졸업)이나 타 지역 전입은 청년 정책 자격에 큰 영향을 줘요.\n\n• 긍정 변화: 재학생 참여가 제한되던 국민취업지원·취업수당 및 천안시 정주 청년 주거·문화 지원이 새로 열릴 수 있어요.\n• 주의할 점: 기존 거주지(예: ${residence})의 계속 거주 기간 요건은 전출 시 해제될 수 있어요.\n\n<생활변화 비교> 페이지에서 변경 전후 태그와 영향을 받는 정책 카드를 바로 확인해 보세요.`,
      actionLabel: '생활변화 비교하기',
      targetRoute: 'switch',
    };
  }

  if (lower.includes('모집') || lower.includes('분야') || lower.includes('카테고리')) {
    return {
      id: `ast-${Date.now()}`,
      sender: 'assistant',
      text: `청년픽 NEXT는 온통청년 기준 5대 분야(일자리, 주거, 교육·직업훈련, 금융·복지·문화, 참여·기반)로 정책을 분류해요.\n\n현재 등록된 정책 중 즉시 지원 가능한 '모집 중' 상태는 ${openCount}건이에요. <정책 찾기> 목록 상단 우측의 '모집 상태' 필터에서 모집 중 / 마감 / 공고 연결 후 확인를 바로 골라볼 수 있어요. 지금 보이는 정책은 시연 예시라 모두 '공고 연결 후 확인'로 표시돼요.`,
      actionLabel: '정책 찾기 이동',
      targetRoute: 'policies',
    };
  }

  if (lower.includes('주소') || lower.includes('관심') || lower.includes('내 정보')) {
    return {
      id: `ast-${Date.now()}`,
      sender: 'assistant',
      text: `<내 정보> 페이지에서는 주민등록상 주소지, 학교 소재지, 근무 지역을 시/도 → 시/군/구 계층 선택 모달로 정확하게 고를 수 있어요.\n\n관심 분야(일자리, 주거, 교육·직업훈련, 금융·복지·문화, 참여·기반)는 상단의 [전체 선택] / [전체 해제] 버튼으로 한 번에 관리하고 저장할 수 있습니다.`,
      actionLabel: '내 정보 수정하기',
      targetRoute: 'profile',
    };
  }

  return {
    id: `ast-${Date.now()}`,
    sender: 'assistant',
    text: `입력하신 조건(만 ${ctx.profile.age}세 · ${ctx.profile.status} · 거주 ${residence} · 학교 ${school})을 바탕으로 안내해 드려요.\n\n현재 관심 분야는 [${ctx.profile.interests.length > 0 ? ctx.profile.interests.join(', ') : '미선택'}]이며, 모집 중인 정책은 ${openCount}건이 있습니다.\n\n주거 조건, 필요 서류, 졸업/이사 시 생활변화 비교 중 궁금한 주제를 선택하거나 아래 질문 버튼을 눌러보세요.`,
    actionLabel: '맞춤 정책 찾아보기',
    targetRoute: 'policies',
  };
}
