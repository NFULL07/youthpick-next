import {
  Briefcase,
  GraduationCap,
  House,
  LucideIcon,
  PiggyBank,
  Users,
} from 'lucide-react';
import { PolicyCategory } from '../types/policy';

/** 분야별 옅은 색 면. 분야 바로가기와 정책 카드의 분야 배지가 같은 색을 쓴다(색 = 분야). */
export const CATEGORY_TINT: Record<PolicyCategory, string> = {
  일자리: 'bg-cat-job',
  주거: 'bg-cat-home',
  '교육·직업훈련': 'bg-cat-edu',
  '금융·복지·문화': 'bg-cat-fin',
  '참여·기반': 'bg-cat-join',
};

export const CATEGORY_ICON: Record<PolicyCategory, LucideIcon> = {
  일자리: Briefcase,
  주거: House,
  '교육·직업훈련': GraduationCap,
  '금융·복지·문화': PiggyBank,
  '참여·기반': Users,
};
