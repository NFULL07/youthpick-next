/** 확인서류표(docs/data/doc_requirements_docs_v1.csv)의 서류 한 종 */
export interface RequirementDoc {
  id: string;
  name: string;
  issuer: string;
  issuePath: string;
  checkableContent: string;
  govCertSupport: string;
  kakaoList: string;
  naverList: string;
  relatedItemNumbers: number[];
  limits: string;
  /** 카카오·네이버 공개목록 모두 '미확인'인 서류 (지갑 밖 서류) */
  walletExternal: boolean;
}

/** 지갑 밖 서류로만 확인되는 개인정보 항목 (docs/data/doc_requirements_items_v1.csv) */
export interface DirectInputItem {
  number: number;
  label: string;
  fieldId: string;
  storage: string;
  docsLabel: string;
  issuer: string;
  checkMethod: string;
  checkContent: string;
  caution: string;
  docIds: string[];
}
