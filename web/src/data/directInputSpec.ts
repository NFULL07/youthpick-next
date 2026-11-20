/**
 * 직접 입력 항목의 입력 방식.
 * 근거: docs/data/personal_fields_v0_3.csv '정의·입력 방식' 열.
 * 이 값들은 공고별 일시 입력이라 화면 메모리에서만 다루고 저장하지 않는다.
 */
export type DirectInputSpec =
  | { kind: 'select'; options: string[]; hint?: string }
  | { kind: 'number'; unit: string; hint?: string }
  | { kind: 'monthRange'; hint?: string };

export const DIRECT_INPUT_SPECS: Readonly<Record<string, DirectInputSpec>> = {
  aid_band_value: {
    kind: 'select',
    options: ['1구간', '2구간', '3구간', '4구간', '5구간', '6구간', '7구간', '8구간', '9구간', '10구간', '모름'],
  },
  aid_band_scheme: {
    kind: 'select',
    options: ['한국장학재단 학자금 지원구간', '그 밖의 체계', '모름'],
  },
  aid_band_period: {
    kind: 'select',
    options: ['2026-2학기', '2026-1학기', '2025-2학기', '2025-1학기', '그 이전', '모름'],
    hint: '공고가 요구하는 학기(예: 대출 당시, 신청 학기)의 구간인지 확인하세요.',
  },
  weekly_work_hours: {
    kind: 'number',
    unit: '시간',
    hint: '계약서의 주 소정근로시간과 실제 근로시간을 구분해 공고 기준에 맞는 값을 넣으세요.',
  },
  interview_schedule: {
    kind: 'select',
    options: ['면접 예정', '면접 합격(1개월 이내)', '해당 없음'],
  },
  monthly_rent_amount: {
    kind: 'number',
    unit: '원',
    hint: '관리비·보증금은 빼고 월세만 넣으세요.',
  },
  rental_deposit_amount: {
    kind: 'number',
    unit: '원',
  },
  housing_loan_product: {
    kind: 'select',
    options: ['버팀목(일반)', '버팀목(청년전용)', '버팀목(신혼부부)', '신생아특례', '기타 전세대출', '없음'],
  },
  existing_support: {
    kind: 'select',
    options: ['참여·수급 중', '참여·수급 종료', '해당 없음', '모름'],
    hint: '이 정책과 함께 받을 수 없는 사업이 있는지 공고의 제한 문구로 확인하세요.',
  },
  support_period: {
    kind: 'monthRange',
  },
  student_loan_status: {
    kind: 'select',
    options: [
      '없음',
      '취업후상환',
      '취업후상환(생활비 대출 포함)',
      '일반상환',
      '일반상환(생활비 대출 포함)',
      '모름',
    ],
    hint: '대출 잔액·이자 금액은 입력하지 않아요.',
  },
};
