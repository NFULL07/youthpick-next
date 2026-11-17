import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { bootstrapPolicyCatalog, hasSupabaseConfig } from './data/policyCatalog';
import './index.css';

const container = document.getElementById('root')!;

// Supabase 설정이 있으면 정책 데이터를 받는 동안 안내를 보여 준다
if (hasSupabaseConfig()) {
  const waiting = document.createElement('p');
  waiting.textContent = '정책 데이터를 불러오는 중이에요…';
  waiting.setAttribute('role', 'status');
  waiting.style.cssText = 'margin:0;padding:48px 20px;text-align:center;font-size:15px;';
  container.replaceChildren(waiting);
}

// 받아 오기에 실패해도 받아 둔 사본이나 시연용 예시 데이터로 화면을 그린다
bootstrapPolicyCatalog().finally(() => {
  container.replaceChildren();
  createRoot(container).render(<App />);
});
