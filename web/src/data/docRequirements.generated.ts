// 자동 생성 파일: 직접 고치지 마세요.
// 원본: docs/data/doc_requirements_items_v1.csv, docs/data/doc_requirements_docs_v1.csv
// 다시 만들기: python pipeline/build_doc_requirements.py

import type { DirectInputItem, RequirementDoc } from './docRequirementTypes';

export const WALLET_EXTERNAL_DOC_IDS: readonly string[] = [
  "D09",
  "D11",
  "D16",
  "D17",
  "D18",
  "D19",
  "D25",
  "D26",
  "D30",
  "D32",
  "D33",
  "D34",
  "D36",
  "D39"
];

export const REQUIREMENT_DOCS: readonly RequirementDoc[] = [
  {
    "id": "D09",
    "name": "학자금 지원구간 통지서",
    "issuer": "한국장학재단",
    "issuePath": "장학금/학자금대출 > 증명서발급 > 학자금 지원구간 통지서",
    "checkableContent": "산정학기별 지원구간·산정 이력",
    "govCertSupport": "공식 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      21,
      22,
      23
    ],
    "limits": "최근 1개 학기 또는 전체학기 발급 안내. 미산정 학기는 발급 불가. 부모 소득액 증명서와 다름.",
    "walletExternal": true
  },
  {
    "id": "D11",
    "name": "원천징수영수증·급여명세서·지급명세서",
    "issuer": "재직/지급기관·홈택스",
    "issuePath": "급여명세서는 회사, 원천징수영수증·지급명세서는 지급기관/홈택스",
    "checkableContent": "총급여·소득 구분·지급기간·공제 항목 등",
    "govCertSupport": "서류별 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      24,
      25,
      26,
      27,
      37
    ],
    "limits": "최근 3개월 평균은 해당 기간 자료를 모아 산정. 지급액과 세전·과세 금액을 구분.",
    "walletExternal": true
  },
  {
    "id": "D16",
    "name": "재직·경력증명서 / 취업기간 확인서",
    "issuer": "근무회사·고용센터 인정 양식",
    "issuePath": "회사 인사부서 또는 국민취업지원제도 취업기간 확인서 양식",
    "checkableContent": "실제 입사·퇴사일·근무기간, 양식에 따른 근로일수",
    "govCertSupport": "기관별 확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      30,
      31,
      35,
      36,
      37,
      59
    ],
    "limits": "회사 직인·확인자와 기간 필요. 프리랜서는 계약·지급자료 보완.",
    "walletExternal": true
  },
  {
    "id": "D17",
    "name": "근로·위촉·용역계약서 / 근태기록",
    "issuer": "근무·계약 상대방",
    "issuePath": "계약 당사자에게 계약서·근무확인·근태자료 요청",
    "checkableContent": "소정근로시간·계약기간·활동 유형, 실제 근로는 근태자료",
    "govCertSupport": "일반 계약서 지갑 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      30,
      31,
      35,
      37
    ],
    "limits": "계약시간과 실근로시간 구분. 예비창업·구직의사 등은 본인 입력 병행.",
    "walletExternal": true
  },
  {
    "id": "D18",
    "name": "면접 안내문·면접확인서·합격통지서",
    "issuer": "채용기업·채용기관",
    "issuePath": "기업 채용시스템·담당자 이메일/문자·기관 확인서",
    "checkableContent": "면접 예정일·면접 참여·합격 통지일",
    "govCertSupport": "일반 안내문 지갑 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      34
    ],
    "limits": "일반 채용 최종합격과 정책에서 말하는 면접합격은 구분. 채용기관과 일자가 확인돼야 함.",
    "walletExternal": true
  },
  {
    "id": "D19",
    "name": "중소기업확인서·중견기업확인서 / 사업장 소재 증빙",
    "issuer": "중소벤처기업부·중견기업정보마당·근무기업",
    "issuePath": "기업이 발급한 유효한 확인서와 사업자등록증명·재직확인 자료",
    "checkableContent": "기업 규모·기재된 소재지",
    "govCertSupport": "서류별 기관 연계 확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      36,
      42
    ],
    "limits": "근로자 개인서류만으로 규모 확인 불가. 본점과 실제 근무 사업장 주소를 구분. 우선지원대상기업은 별도 확인.",
    "walletExternal": true
  },
  {
    "id": "D25",
    "name": "임대차계약서·전대차계약서·공공임대 계약서 / 계약신고필증",
    "issuer": "임대차 당사자·공공주택사업자·부동산거래관리시스템",
    "issuePath": "본인 계약서, 주택 임대차 계약 신고필증 등 확보",
    "checkableContent": "임차주소·기간·보증금·월세·계약상대방·주택 유형",
    "govCertSupport": "일반 계약서 지갑 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      4,
      5,
      43,
      44,
      45,
      47,
      49,
      51,
      65
    ],
    "limits": "계약만으로 현재 실제 거주 확정 불가. 전대차·공공임대·친족임차는 소유·가족관계 등 보완.",
    "walletExternal": true
  },
  {
    "id": "D26",
    "name": "월세 계좌이체확인증·지급영수증",
    "issuer": "거래은행·결제기관·임대인",
    "issuePath": "은행 이체확인증 또는 공고에서 인정하는 지급 영수증",
    "checkableContent": "실제 월세 지급액·지급일·수취인",
    "govCertSupport": "기관서류 지갑 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      44
    ],
    "limits": "관리비·보증금·다른 송금을 구분. 계약서와 금액·대상기간을 대조.",
    "walletExternal": true
  },
  {
    "id": "D30",
    "name": "대출약정서·금융거래확인서·대출잔액증명서",
    "issuer": "대출 취급은행·금융기관",
    "issuePath": "본인 거래은행 증명서 발급·대출계약 조회",
    "checkableContent": "전세대출 상품명·약정·실행일·보유 여부",
    "govCertSupport": "은행별 지갑 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      48,
      55,
      69
    ],
    "limits": "잔액증명에 정확한 상품명·용도가 없으면 약정서 보완. 다른 기관의 중복대출은 별도 확인.",
    "walletExternal": true
  },
  {
    "id": "D32",
    "name": "정책별 선정·참여·수급·종료 확인자료 / 장학금수혜증명서",
    "issuer": "해당 정책 운영기관·장학재단·대학·금융기관",
    "issuePath": "해당 사업 마이페이지·담당기관의 참여/수급/종료 증빙",
    "checkableContent": "해당 사업의 참여 상태·수급·종료기간",
    "govCertSupport": "사업별 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      52,
      53,
      57
    ],
    "limits": "모든 지원사업 이력을 합친 범용 증명서 없음. 통장 입금만으로 사업·수급기간 확정 불가.",
    "walletExternal": true
  },
  {
    "id": "D33",
    "name": "학자금대출 부채확인서·금융거래확인서 / 대출내역",
    "issuer": "한국장학재단",
    "issuePath": "학자금대출 > 증명서발급 및 학자금뱅킹 대출내역",
    "checkableContent": "학자금대출 보유·구분·거래, 상세 내역의 실행학기·계좌",
    "govCertSupport": "공식 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      54
    ],
    "limits": "취업후/일반상환, 등록금/생활비, 실행학기는 실제 서식·계좌 상세로 확인. 잔액 일괄수집 불필요.",
    "walletExternal": true
  },
  {
    "id": "D34",
    "name": "소득·재산 신고서 / 금융·자산 증빙 / 공식 심사결과",
    "issuer": "정책 운영기관·금융기관·지자체·HUG 등",
    "issuePath": "공고의 신고서, 필요 시 금융기관 증명과 담당기관 심사결과",
    "checkableContent": "해당 정책이 정의한 소득·재산·부채와 심사결과",
    "govCertSupport": "통합 지갑 발급 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      26,
      27,
      46,
      55,
      69
    ],
    "limits": "전국 재산·부채 전체와 모든 정책 자격을 한 장으로 확정하는 범용 증명서 없음. 기준시점·가구범위·공제 확인.",
    "walletExternal": true
  },
  {
    "id": "D36",
    "name": "철도 정기승차권·이용내역·영수증 + 재학/재직 증빙",
    "issuer": "코레일 등 철도사업자·학교·회사",
    "issuePath": "철도 앱/홈페이지 이용내역, 재학/재직기관 증명",
    "checkableContent": "정기권 이용구간·기간, 통학/통근 목적 보완",
    "govCertSupport": "정기권 자료 지갑 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      59
    ],
    "limits": "철도 이용만으로 통학·통근 목적 확정 불가. 학교·근무지 소재지와 대조.",
    "walletExternal": true
  },
  {
    "id": "D37",
    "name": "정책 공고·지침·기준표 / 대학 공식 학칙",
    "issuer": "각 정책 주관기관·학교",
    "issuePath": "해당 연도·차수 공식 공고와 첨부 지침",
    "checkableContent": "소득 정의·가구 범위·기준기간·전공계열·성적 기준 등",
    "govCertSupport": "개인 증명서 대상 아님",
    "kakaoList": "해당 없음",
    "naverList": "해당 없음",
    "relatedItemNumbers": [
      12,
      13,
      15,
      17,
      19,
      22,
      24,
      25,
      26,
      27,
      28,
      29,
      37,
      42,
      46,
      47,
      55,
      57,
      63
    ],
    "limits": "개인 서류에 없는 판정 규칙의 근거. 정책별로 달라 자동 공통화하지 않음.",
    "walletExternal": false
  },
  {
    "id": "D39",
    "name": "고용24 통합경력증명서(보완 자료)",
    "issuer": "고용노동부·고용24",
    "issuePath": "고용24 통합경력증명 서비스에서 필요한 항목 선택",
    "checkableContent": "연계된 고용보험·국가기술자격·훈련 등 경력정보",
    "govCertSupport": "카카오·네이버 지갑 연계 미확인",
    "kakaoList": "공식 연계 미확인",
    "naverList": "공식 연계 미확인",
    "relatedItemNumbers": [
      30,
      32
    ],
    "limits": "개시 시점 24종. 대학·어학 등 확대 예정 항목까지 현재 모두 포함한다고 가정하지 않음.",
    "walletExternal": true
  }
];

export const DIRECT_INPUT_ITEMS: readonly DirectInputItem[] = [
  {
    "number": 21,
    "label": "학자금 지원구간",
    "fieldId": "aid_band_value",
    "storage": "공고별 일시 입력",
    "docsLabel": "학자금 지원구간 통지서",
    "issuer": "한국장학재단",
    "checkMethod": "서류로 확인",
    "checkContent": "신청 정책이 요구하는 학기의 산정 구간",
    "caution": "지원구간은 부모 소득만의 지표가 아님. 미산정은 모름으로 처리.",
    "docIds": [
      "D09"
    ]
  },
  {
    "number": 22,
    "label": "지원구간 제도·체계",
    "fieldId": "aid_band_scheme",
    "storage": "공고별 일시 입력",
    "docsLabel": "학자금 지원구간 통지서 + 장학재단 해당 연도 산정 안내",
    "issuer": "한국장학재단 / 각 정책 주관기관·학교",
    "checkMethod": "복합 확인",
    "checkContent": "통지서 발급기관·학기와 해당 연도 제도",
    "caution": "제도·산정체계는 공식 안내와 대조. 구간 숫자만으로 서로 다른 연도 체계를 동일 취급하지 않음.",
    "docIds": [
      "D09",
      "D37"
    ]
  },
  {
    "number": 23,
    "label": "지원구간 산정 학기",
    "fieldId": "aid_band_period",
    "storage": "공고별 일시 입력",
    "docsLabel": "학자금 지원구간 통지서(필요 시 전체학기)",
    "issuer": "한국장학재단",
    "checkMethod": "서류로 확인",
    "checkContent": "통지서에 적힌 산정 학기",
    "caution": "대출 당시 구간이 필요하면 전체학기 통지서에서 해당 학기 선택.",
    "docIds": [
      "D09"
    ]
  },
  {
    "number": 31,
    "label": "주당 근로시간",
    "fieldId": "weekly_work_hours",
    "storage": "공고별 일시 입력",
    "docsLabel": "근로계약서 + 필요 시 근무시간 확인서·근태기록",
    "issuer": "근무·계약 상대방 / 근무회사·고용센터 인정 양식",
    "checkMethod": "복합 확인",
    "checkContent": "계약서의 주 소정근로시간, 실제시간은 근태/근무확인",
    "caution": "시간의 정의가 정책마다 다르므로 계약시간과 실제 근로시간 구분.",
    "docIds": [
      "D17",
      "D16"
    ]
  },
  {
    "number": 34,
    "label": "취업 면접 예정·합격 여부",
    "fieldId": "interview_schedule",
    "storage": "공고별 일시 입력",
    "docsLabel": "면접 안내·합격통지·기업 면접확인서",
    "issuer": "채용기업·채용기관",
    "checkMethod": "본인·기관 확인",
    "checkContent": "기업 발송 면접일정·합격 통지의 일자와 대상",
    "caution": "중앙정부가 일괄 발급하는 범용 예정·합격증명서 없음. 기업 자료 진위·정책 인정범위 확인.",
    "docIds": [
      "D18"
    ]
  },
  {
    "number": 44,
    "label": "월세액",
    "fieldId": "monthly_rent_amount",
    "storage": "공고별 일시 입력",
    "docsLabel": "임대차계약서 + 월세 이체확인증/영수증",
    "issuer": "임대차 당사자·공공주택사업자·부동산거래관리시스템 / 거래은행·결제기관·임대인",
    "checkMethod": "복합 확인",
    "checkContent": "계약상 월세와 실제 지급내역",
    "caution": "관리비·보증금 제외 여부와 공고 인정 지급기간 확인.",
    "docIds": [
      "D25",
      "D26"
    ]
  },
  {
    "number": 45,
    "label": "임차보증금",
    "fieldId": "rental_deposit_amount",
    "storage": "공고별 일시 입력",
    "docsLabel": "최신 임대차계약서 또는 공공임대 계약서",
    "issuer": "임대차 당사자·공공주택사업자·부동산거래관리시스템",
    "checkMethod": "서류로 확인",
    "checkContent": "계약에 적힌 임차보증금",
    "caution": "변경·갱신 계약이 있으면 최신 계약 또는 변경합의서 확인.",
    "docIds": [
      "D25"
    ]
  },
  {
    "number": 48,
    "label": "이용 중인 전세대출 상품",
    "fieldId": "housing_loan_product",
    "storage": "공고별 일시 입력",
    "docsLabel": "대출약정서·금융거래확인서·대출 보유내역",
    "issuer": "대출 취급은행·금융기관",
    "checkMethod": "서류로 확인",
    "checkContent": "약정서·금융거래 자료의 실제 전세대출 상품",
    "caution": "잔액·이자 금액 전체를 수집하지 않고 상품·보유 여부 중심 확인.",
    "docIds": [
      "D30"
    ]
  },
  {
    "number": 52,
    "label": "관련 지원사업 참여·수급 상태",
    "fieldId": "existing_support",
    "storage": "공고별 일시 입력",
    "docsLabel": "관련 사업 참여/수급확인·장학금수혜증명·계좌가입확인 등",
    "issuer": "해당 정책 운영기관·장학재단·대학·금융기관",
    "checkMethod": "본인·기관 확인",
    "checkContent": "관련 사업의 선정·참여·현재 수급 상태",
    "caution": "전체 지원이력을 일괄 증명하는 서류 없음. 선택 사업별로 확인, 중복 허용·제한 규정 별도 적용.",
    "docIds": [
      "D32"
    ]
  },
  {
    "number": 53,
    "label": "관련 사업 참여·수급 기간",
    "fieldId": "support_period",
    "storage": "공고별 일시 입력",
    "docsLabel": "사업별 참여·수급·종료 확인서 또는 공식 이력",
    "issuer": "해당 정책 운영기관·장학재단·대학·금융기관",
    "checkMethod": "본인·기관 확인",
    "checkContent": "해당 사업의 참여·지급·종료 연월",
    "caution": "지급월과 참여기간이 다를 수 있어 사업 운영기관 기록을 우선 확인.",
    "docIds": [
      "D32"
    ]
  },
  {
    "number": 54,
    "label": "학자금대출 보유·종류",
    "fieldId": "student_loan_status",
    "storage": "공고별 일시 입력",
    "docsLabel": "한국장학재단 부채/금융거래확인서 + 필요한 대출 상세내역",
    "issuer": "한국장학재단",
    "checkMethod": "서류로 확인",
    "checkContent": "학자금대출 종류·보유와 계좌별 등록금/생활비 구분",
    "caution": "지원 대상 대출 실행학기·일자가 필요하면 상세 대출내역 추가. 잔액 일괄수집 불필요.",
    "docIds": [
      "D33"
    ]
  }
];

export const ITEM_LABELS_BY_NUMBER: Readonly<Record<number, string>> = {
  "1": "출생연도",
  "2": "주민등록 시·도",
  "3": "주민등록 시·군",
  "4": "실제 거주지와 주민등록지 일치 여부",
  "5": "실제 거주 시·군·구 (선택)",
  "6": "재학 학교",
  "7": "소속 캠퍼스",
  "8": "학적 상태",
  "9": "현재 학년",
  "10": "프로필 갱신 시각 (자동 기록)",
  "11": "정확한 생년월일",
  "12": "병역 이행 기간",
  "13": "본인 현재 지역 전입일(계속 거주 시작일)",
  "14": "직계존속(부모 등) 주민등록 시·군",
  "15": "직계존속 계속 주민등록 기간",
  "16": "성적값",
  "17": "평점 만점",
  "18": "성적 종류",
  "19": "성적 적용기간",
  "20": "이수학점",
  "21": "학자금 지원구간",
  "22": "지원구간 제도·체계",
  "23": "지원구간 산정 학기",
  "24": "개인소득액",
  "25": "소득 산정기간",
  "26": "소득 산정기준",
  "27": "가구 소득 기준 충족 여부",
  "28": "가구 산정 범위",
  "29": "산정 가구원 수",
  "30": "취업·활동 상태",
  "31": "주당 근로시간",
  "32": "고용보험 가입 상태",
  "33": "건강보험 가입 유형",
  "34": "취업 면접 예정·합격 여부",
  "35": "입사일",
  "36": "근무 기업 규모·소재지",
  "37": "최근 취업경험",
  "38": "사업자 등록 여부",
  "39": "졸업일·졸업예정일",
  "40": "졸업일 확정 상태",
  "41": "공적 지원 자격 해당 여부",
  "42": "특화 대상 해당 여부",
  "43": "부모와 별도 거주 여부",
  "44": "월세액",
  "45": "임차보증금",
  "46": "무주택 여부",
  "47": "세대주 여부",
  "48": "이용 중인 전세대출 상품",
  "49": "임차주택 전용면적",
  "50": "거주 기숙사",
  "51": "임차 형태",
  "52": "관련 지원사업 참여·수급 상태",
  "53": "관련 사업 참여·수급 기간",
  "54": "학자금대출 보유·종류",
  "55": "재산 기준 충족 여부",
  "56": "혼인 상태",
  "57": "같은 가구 다른 신청자 여부",
  "58": "자격증·어학시험 응시 정보",
  "59": "수도권 통학·통근 여부",
  "60": "주민등록 구",
  "61": "행정 읍·면·동",
  "62": "법정 읍·면·동·리",
  "63": "전공 계열",
  "64": "주민등록번호",
  "65": "동·호수 등 상세 주소",
  "66": "가족의 이름·연락처·주민등록번호 등",
  "67": "성적표·등본·가족관계 등 증빙 원본",
  "68": "기관 비밀번호·인증 비밀정보",
  "69": "재산·부채 금액 상세"
};
