import {
  Briefcase,
  GraduationCap,
  House,
  LucideIcon,
  PiggyBank,
  Users,
} from 'lucide-react';
import { PolicyCategory } from '../types/policy';

/** 분야별 색 면. 분야 바로가기와 정책 카드 띠가 같은 색을 쓴다(색 = 분야). */
export const CATEGORY_TINT: Record<PolicyCategory, string> = {
  일자리: 'bg-accent-soft',
  주거: 'bg-peach',
  '교육·직업훈련': 'bg-lavender',
  '금융·복지·문화': 'bg-sage',
  '참여·기반': 'bg-sky',
};

export const CATEGORY_ICON: Record<PolicyCategory, LucideIcon> = {
  일자리: Briefcase,
  주거: House,
  '교육·직업훈련': GraduationCap,
  '금융·복지·문화': PiggyBank,
  '참여·기반': Users,
};
