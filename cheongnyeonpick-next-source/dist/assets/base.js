const ICONS = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  switch:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
  check:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 3 3 5-6M9 3v2h6V3"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/>',
  arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  back:'<path d="M20 12H5m5-5-5 5 5 5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  circleCheck:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  circle:'<circle cx="12" cy="12" r="8"/>',
  file:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Zm0 0v6h5M9 13h6m-6 4h6"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8V5a2 2 0 0 1 2-2h12M21 10h-6v5h6m-3-2.5h.1"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  filter:'<path d="M4 6h16M7 12h10m-7 6h4"/>',
  school:'<path d="m3 9 9-5 9 5-9 5Zm4 3v5c3 2 7 2 10 0v-5m4-3v7"/>'
};
function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`; }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const NAVS = [
  {key:'home', label:'나의 보드', mobile:'홈', icon:'home', title:'내 정책 보드'},
  {key:'policies', label:'정책 찾기', mobile:'정책 찾기', icon:'search', title:'정책 찾기'},
  {key:'switch', label:'생활변화 비교', mobile:'생활변화', icon:'switch', title:'생활변화 비교'},
  {key:'apply', label:'신청 준비', mobile:'신청 준비', icon:'check', title:'신청 준비'},
  {key:'profile', label:'내 정보', mobile:'내 정보', icon:'user', title:'내 정보'},
  {key:'wallet', label:'전자지갑', mobile:'전자지갑', icon:'wallet', title:'전자지갑'}
];
const DEFAULT_PROFILE = {age:23, residence:'경기도', school:'천안시', workRegion:'', status:'대학 재학', interests:['일자리','주거','교육']};
const STORAGE_KEY = 'cheongnyeonpick-next-clean-v1';
const state = {profile:structuredClone(DEFAULT_PROFILE), completed:new Set([0,1]), wallet:new Set([2]), preparedPolicy:1, from:'current', to:'graduateMove'};
let category='전체', searchTerm='', statusFilter='all', sort='related';
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    const p = saved.profile;
    if (p && Number.isInteger(p.age) && p.age >= 15 && p.age <= 100 && typeof p.residence==='string' && typeof p.school==='string' && typeof p.status==='string') {
      state.profile = {age:p.age,residence:p.residence.slice(0,50),school:p.school.slice(0,50),workRegion:typeof p.workRegion==='string'?p.workRegion.slice(0,50):'',status:['대학 재학','휴학','졸업','구직 중','재직 중','창업'].includes(p.status)?p.status:'대학 재학',interests:Array.isArray(p.interests)?p.interests.filter(v=>['일자리','주거','교육','창업'].includes(v)):[]};
    }
    for (const [key,target] of [['completed','completed'],['wallet','wallet']]) {
      if (Array.isArray(saved[key])) state[target]=new Set(saved[key].filter(v=>Number.isInteger(v)&&v>=0&&v<5));
    }
    if ([1,2,3].includes(saved.preparedPolicy)) state.preparedPolicy=saved.preparedPolicy;
    if (['current','graduate','move','graduateMove'].includes(saved.from)) state.from=saved.from;
    if (['current','graduate','move','graduateMove'].includes(saved.to)) state.to=saved.to;
  }
} catch (_) { storageAvailable=false; }
function persist() {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify({...state, completed:[...state.completed],wallet:[...state.wallet]})); return true; }
  catch (_) { storageAvailable=false; return false; }
}
const policies = [
  {id:1,title:'청년 주거 지원 정책',cat:'주거',state:'check',stateText:'추가 확인',org:'중앙·지자체 정책 예시',desc:'거주지와 재학 지역의 인정 범위를 먼저 확인해요.',reason:'주민등록지와 학교 소재지 요건 확인',deadline:'공고별 상이',explanation:'학교가 천안에 있더라도 모든 정책이 재학 지역을 인정하는 것은 아니에요. 주민등록상 거주지가 필수인지, 재학·근무 지역도 인정하는지 공고에서 확인해 주세요.'},
  {id:2,title:'청년 취업 지원 프로그램',cat:'일자리',state:'good',stateText:'검토 후보',org:'청년 일자리 정책 예시',desc:'나이와 구직 상태를 기준으로 참여 조건을 살펴봐요.',reason:'재학생 참여 여부와 구직 상태 확인',deadline:'모집 일정 확인 필요',explanation:'취업 지원 프로그램은 재학생 참여 여부와 구직 상태에 따라 조건이 달라질 수 있어요. 졸업 예정자 인정 범위와 과거 참여 이력도 함께 확인해 주세요.'},
  {id:3,title:'청년 역량 강화 교육 지원',cat:'교육',state:'check',stateText:'추가 확인',org:'교육·훈련 정책 예시',desc:'관심 있는 교육의 참여 대상과 수강 조건을 확인해요.',reason:'재학 여부와 과거 참여 이력 확인',deadline:'공고별 상이',explanation:'교육·훈련 지원은 재학 여부, 교육 과정, 과거 참여 이력에 따라 지원 범위가 달라질 수 있어요. 신청 과정의 세부 요건과 중복 참여 제한을 확인해 주세요.'}
];

// The original prototype's five text templates are inserted here unchanged.
const taskList=[
 {title:'공식 공고·모집 상태 확인',desc:'시행기관의 최신 공고와 모집 여부 확인',file:'공고 확인 기록표.txt',content:'청년픽 NEXT · 공고 확인 기록표\n\n정책명: (직접 입력)\n시행기관: (직접 입력)\n공고 게시일: (직접 입력)\n모집 기간: (공고 원문 확인)\n모집 상태: (모집 중 / 마감 / 예정 / 확인 필요)\n공식 공고 URL: (직접 입력)\n최종 확인일: (직접 입력)\n\n※ 시연용 기록 양식입니다. 공식 공고 원문을 대체하지 않습니다.'},
 {title:'연령·지역 조건 재확인',desc:'신청 기준일과 생활권 요건 대조',file:'연령·지역 조건 점검표.txt',content:'청년픽 NEXT · 연령·지역 조건 점검표\n\n연령 기준일: (공고 원문 확인)\n신청자 연령: (직접 입력)\n주민등록상 주소지: (직접 입력)\n재학·근무 지역: (직접 입력)\n거주 필수 여부: (공고 원문 확인)\n재학·근무 지역 인정 여부: (공고 원문 확인)\n전입 기준일: (공고 원문 확인)\n\n※ 자격 판정용 공식 문서가 아닌 개인 확인용 양식입니다.'},
 {title:'재학/졸업 증빙서류 준비',desc:'재학증명서 또는 졸업 관련 서류 등 공고 기준 확인',file:'재학·졸업 증빙서류 안내.txt',content:'청년픽 NEXT · 재학·졸업 증빙서류 안내\n\n확인할 수 있는 서류 예시\n- 재학증명서\n- 졸업증명서\n- 졸업예정증명서\n\n발급 가능 여부와 인정 서류는 정책 공고마다 다릅니다.\n신청 전에 시행기관의 제출서류 항목과 발급일 기준을 확인하세요.\n\n※ 이 파일은 안내문이며 실제 증명서가 아닙니다.'},
 {title:'소득조건 및 추가 서류 검토',desc:'소득 기준·과거 수혜·제외 조건 점검',file:'소득·추가서류 준비표.txt',content:'청년픽 NEXT · 소득·추가서류 준비표\n\n소득 기준: (공고 원문 확인)\n가구 기준: (공고 원문 확인)\n소득 확인 기준일: (공고 원문 확인)\n과거 수혜 여부: (공고 원문 확인)\n중복수혜 제한: (공고 원문 확인)\n추가 제출서류: (직접 기록)\n\n※ 민감한 소득·재산 정보를 이 파일에 저장하지 마세요. 실제 제출 방식은 공식 기관 안내를 따르세요.'},
 {title:'공식 신청 페이지 제출',desc:'공식 신청 페이지에서 최종 제출',file:'최종 제출 확인표.txt',content:'청년픽 NEXT · 최종 제출 확인표\n\n□ 공식 신청 페이지 주소 확인\n□ 신청 기간 내 제출 여부 확인\n□ 필수 입력 항목 확인\n□ 첨부파일 형식·용량 확인\n□ 제출 완료 화면 또는 접수번호 확인\n□ 접수 내역 보관\n\n※ 실제 신청·제출은 반드시 시행기관의 공식 홈페이지에서 진행하세요.'}
];

function getPolicy(id) { return policies.find(p=>p.id===Number(id)) || policies[0]; }
function currentRoute() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('detail/')) return {page:'detail', id:getPolicy(hash.split('/')[1]).id};
  return {page:NAVS.some(n=>n.key===hash)?hash:'home'};
}
function go(page) {
  if (location.hash === '#'+page) render(true);
  else location.hash = page;
}
let toastTimer;
function toast(message) {
  const el=document.getElementById('toast');
  el.textContent=message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2700);
}
function pageIntro(eyebrow,title,description,extra='',className='') {
  return `<div class="page-intro ${className}"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="page-description">${description}</p></div>${extra}</div>`;
}
function footer() { return '<footer class="footer"><div><span class="footer-brand">청년픽 NEXT</span><span> &nbsp; 내 다음을, 가볍게 픽.</span></div><span>A NEXT:UP PROJECT</span></footer>'; }
function demoNote(text='시연용 정책 예시예요. 실제 모집 여부와 자격은 시행기관의 공식 공고에서 확인해 주세요.') {
  return `<p class="quiet-note">${icon('info')}<span>${text}</span></p>`;
}
function categories(isHome=false) {
  const activeCategory=isHome?'전체':category;
  return `<div class="category-tabs" role="group" aria-label="정책 분야">${['전체','일자리','주거','교육','창업'].map(c=>`<button class="category-tab ${activeCategory===c?'active':''}" data-category="${c}" aria-pressed="${activeCategory===c}">${c}</button>`).join('')}</div>`;
}
function searchForm(home=false) {
  return `<form class="search-form" id="${home?'homeSearchForm':'policySearchForm'}" role="search">${icon('search')}<input type="search" autocomplete="off" name="search" aria-label="정책명 또는 관심 분야 검색" placeholder="어떤 지원을 찾고 있나요?" value="${home?'':esc(searchTerm)}" maxlength="100"><button type="button" class="search-clear" data-action="clear-search" aria-label="검색어 지우기" ${!searchTerm||home?'hidden':''}>${icon('close')}</button>${home?'<button class="search-submit" type="submit">검색</button>':''}</form>`;
}
function card(p) {
  const catIcon={주거:'home',일자리:'user',교육:'school'}[p.cat] || 'file';
  const code={주거:'HOUSING',일자리:'WORK',교육:'LEARNING'}[p.cat] || 'NEXT';
  return `<article class="policy-card" data-category="${p.cat}"><div class="ticket-band"><span class="ticket-category">${icon(catIcon)}${p.cat}</span><span class="ticket-number">${code} / 0${p.id}</span></div><div class="ticket-content"><div class="policy-meta"><span class="badge ${p.state}">${p.stateText}</span><span class="category-label">정책 예시</span></div><h3><button class="policy-title-button" data-policy="${p.id}">${p.title}</button></h3><p class="policy-description">${p.desc}</p><p class="policy-hint">${icon('info')}<span>${p.reason}</span></p></div><div class="policy-foot"><span>${p.deadline}</span><button class="text-button" data-policy="${p.id}" aria-label="${p.title} 조건 확인">조건 확인 ${icon('arrow')}</button></div></article>`;
}
function profilePanel() {
  const p=state.profile, destination=p.school || p.workRegion || '미입력';
  const destinationLabel=p.school?'학교 소재지':p.workRegion?'근무 지역':'재학·근무 지역';
  return `<section class="policy-pass" aria-label="내 생활권 패스"><div class="pass-header"><strong>MY POLICY PASS</strong><span>나의 생활권</span></div><div class="pass-body"><div class="pass-greeting"><h2>나의 출발점</h2><span>만 ${p.age}세 · ${esc(p.status)}</span></div><div class="pass-route"><div class="pass-stop"><small>주민등록지</small><strong>${esc(p.residence)}</strong></div><span class="pass-connector">${icon('arrow')}</span><div class="pass-stop"><small>${destinationLabel}</small><strong>${esc(destination)}</strong></div></div>${p.school&&p.workRegion?`<p class="pass-work">근무 지역 · ${esc(p.workRegion)}</p>`:''}</div><div class="pass-bottom"><span class="pass-code"><span class="barcode" aria-hidden="true"></span>MY NEXT</span><button class="text-button" data-route="profile" aria-label="생활권 정보 수정">내 조건 수정 ${icon('chevron')}</button></div></section>`;
}
function home() {
  const p=getPolicy(state.preparedPolicy), done=state.completed.size;
  const next=taskList.findIndex((_,i)=>!state.completed.has(i));
  return `<section class="board-hero"><div class="hero-copy"><div class="mono-kicker"><span class="kicker-dot"></span>MY NEXT / 내 정책 보드</div><h1>내 다음을,<br><span class="highlight-word">가볍게 픽!</span><span class="hero-sticker">나에게 맞게</span></h1><p>어디에 살든, 무엇을 준비하든.<br>지금의 나와 연결되는 정책을 찾아요.</p><div class="hero-actions"><button class="button primary" data-action="all-policies">내게 맞는 정책 찾기 ${icon('arrow')}</button><span class="hero-caption">조건 확인부터 신청 준비까지,<br>한 번에 이어가요.</span></div><span class="hero-spark" aria-hidden="true"><svg viewBox="0 0 70 70" fill="none"><path d="M35 3c0 20-12 32-32 32 20 0 32 12 32 32 0-20 12-32 32-32C47 35 35 23 35 3Z" stroke="currentColor" stroke-width="1.8"/><path d="m53 4 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill="currentColor"/></svg></span></div><div class="hero-pass">${profilePanel()}</div></section>
  <section class="overview" aria-label="내 정책 현황"><button class="overview-item" data-overview="all" aria-label="검토할 정책 ${policies.length}건"><span class="overview-copy"><span class="overview-code">TO EXPLORE</span><span class="overview-label">검토할 정책</span></span><span class="overview-value">${String(policies.length).padStart(2,'0')}<em>건</em></span><span class="overview-arrow">${icon('arrow')}</span></button><button class="overview-item" data-overview="check" aria-label="추가 확인 필요 ${policies.filter(p=>p.state==='check').length}건"><span class="overview-copy"><span class="overview-code">TO CHECK</span><span class="overview-label">추가 확인 필요</span></span><span class="overview-value">${String(policies.filter(p=>p.state==='check').length).padStart(2,'0')}<em>건</em></span><span class="overview-arrow">${icon('arrow')}</span></button><button class="overview-item" data-route="apply" aria-label="${done===taskList.length?'준비 완료':'신청 준비 중'} 1건"><span class="overview-copy"><span class="overview-code">TO GET READY</span><span class="overview-label">${done===taskList.length?'준비 완료':'신청 준비 중'}</span></span><span class="overview-value">01<em>건</em></span><span class="overview-arrow">${icon('arrow')}</span></button></section>
  <section class="pick-section"><div class="section-heading"><div class="section-title-group"><span class="section-index" aria-hidden="true">01</span><h2>오늘의 정책 픽</h2></div><button class="text-button" data-action="all-policies">전체 보기 ${icon('arrow')}</button></div><div class="discovery-tools">${searchForm(true)}${categories(true)}</div><div class="home-policy-grid">${policies.map(card).join('')}</div>${demoNote()}</section>
  <section class="next-section" aria-label="다음 준비와 생활변화"><div class="prep-note"><div><p class="mono-kicker">02 / MY CHECK NOTE</p><h2>준비는 한 칸씩.</h2><p class="prep-policy">${p.title}</p><button class="button" data-route="apply">${done===taskList.length?'준비 내역 보기':'준비 이어가기'} ${icon('arrow')}</button></div><div class="prep-note-detail"><div class="prep-note-progress"><strong>${done}/${taskList.length}</strong><span>준비 완료 · ${Math.round(done/taskList.length*100)}%</span></div><div class="progress-steps" role="progressbar" aria-label="신청 준비 진행률" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${taskList.length}">${taskList.map((_,i)=>`<span class="progress-step ${state.completed.has(i)?'done':''}"></span>`).join('')}</div><div class="prep-note-list">${taskList.slice(0,3).map((t,i)=>`<div class="mini-task ${state.completed.has(i)?'done':i===next?'next':''}">${icon(state.completed.has(i)?'circleCheck':'circle')}<span>${t.title}</span></div>`).join('')}</div></div></div><button class="switch-link" data-route="switch"><div class="switch-link-head"><span class="mono-kicker">03 / LIFE SWITCH</span>${icon('arrow')}</div><strong>내 상황이 달라지면,<br>다음 픽도 달라질까?</strong><p>생활변화 전후의 조건을 비교해 봐요.</p><div class="change-route" aria-hidden="true"><span>재학</span>${icon('arrow')}<span>졸업·구직</span>${icon('arrow')}<span>전입</span></div></button></section>${footer()}`;
}
function filteredPolicies() {
  const needle=searchTerm.trim().toLocaleLowerCase();
  const result=policies.filter(p=>(category==='전체'||p.cat===category)&&(statusFilter==='all'||p.state===statusFilter)&&(!needle||`${p.title} ${p.cat} ${p.desc} ${p.reason}`.toLocaleLowerCase().includes(needle)));
  if(sort==='name') result.sort((a,b)=>a.title.localeCompare(b.title,'ko'));
  return result;
}
function emptyResults() {
  return `<div class="empty-state">${icon('search')}<h3>조건에 맞는 정책이 없어요</h3><p>검색어를 바꾸거나 다른 분야를 선택해 보세요.</p><button class="button" data-action="reset-filters">검색 조건 초기화</button></div>`;
}
function resultsHTML() { const arr=filteredPolicies(); return arr.length?arr.map(card).join(''):emptyResults(); }
function updateResults() {
  const result=document.getElementById('policyResults'); if(!result)return;
  result.innerHTML=resultsHTML();
  document.getElementById('resultCount').textContent=filteredPolicies().length;
  const clear=document.querySelector('#policySearchForm .search-clear'); if(clear)clear.hidden=!searchTerm;
}
function policiesPage() {
  return `${pageIntro('01 / 정책 픽 리스트','나의 조건, 나의 정책 픽.','생활권과 관심 분야를 기준으로 확인할 정책을 모았어요.')}<div class="content-two"><section>${searchForm()}${categories()}${statusFilter!=='all'?'<button class="preset active" data-action="clear-status" aria-label="추가 확인 필터 해제">추가 확인 필요 ×</button>':''}<div class="filters-head"><span>시연용 정책 <b id="resultCount" aria-live="polite">${filteredPolicies().length}</b>건</span><select class="filter-sort" id="sortSelect" aria-label="정렬 기준"><option value="related" ${sort==='related'?'selected':''}>관련도순</option><option value="name" ${sort==='name'?'selected':''}>정책명순</option></select></div><div class="policy-list" id="policyResults">${resultsHTML()}</div>${demoNote()}</section><aside class="policy-aside">${profilePanel()}<div class="surface filter-summary"><strong>이렇게 확인해 보세요</strong>정책의 이름보다 나의 조건이 더 중요해요. 각 정책의 ‘조건 확인’에서 연령·지역·이력 항목을 살펴보세요.</div></aside></div>${footer()}`;
}
function detail(id) {
  const p=getPolicy(id), profile=state.profile;
  return `<button class="text-button back-button" data-route="policies">${icon('back')} 정책 목록</button><section class="surface detail-head"><div class="policy-meta"><span class="category-label">${p.cat}</span><span class="meta-dot"></span><span class="category-label">${p.org}</span><span class="badge neutral">시연용</span></div><h1>${p.title}</h1><p>${p.desc}</p><div class="detail-meta"><span>신청 기간<strong>${p.deadline}</strong></span><span>내 정보<strong>만 ${profile.age}세 · ${esc(profile.status)}</strong></span></div></section><div class="content-two detail-grid"><section><div class="surface panel"><div class="panel-heading"><h2>내 조건과 비교했어요</h2><span class="badge check">추가 확인 필요</span></div><p class="panel-description">아직 확인할 항목이 있어요.<br>아래 조건을 공고 원문과 함께 살펴봐 주세요.</p><div class="checks"><div class="check-row"><div><strong>연령</strong><p>만 ${profile.age}세 · 공고의 연령 범위와 기준일 확인</p></div><span class="badge check">추가 확인</span></div><div class="check-row"><div><strong>거주·생활권</strong><p>주민등록지 ${esc(profile.residence)} / 학교 ${esc(profile.school||'미입력')}${profile.workRegion?` / 근무 ${esc(profile.workRegion)}`:''}<br>공고의 지역 인정 범위 확인</p></div><span class="badge check">추가 확인</span></div><div class="check-row"><div><strong>소득·참여 이력</strong><p>소득 기준과 과거 수혜 여부 미확인</p></div><span class="badge check">추가 확인</span></div></div><details class="source-detail"><summary>어떤 근거로 확인하나요?</summary><p>실제 서비스에서는 공식 공고의 원문, 기준일, 시행기관 링크를 함께 제공할 예정이에요. 이 프로토타입은 공고 데이터와 연결되어 있지 않아 자격을 확정하지 않아요.</p></details></div><div class="surface panel"><h2>이 부분을 먼저 확인해 보세요</h2><div class="explanation"><p>${p.explanation}</p></div></div></section><aside><section class="surface side-panel action-panel"><h2>신청 전, 하나씩 준비해요</h2><p>공고 확인부터 서류 점검까지<br>내 준비 목록에서 이어갈 수 있어요.</p><button class="button primary full" data-prepare="${p.id}">신청 준비하기 ${icon('arrow')}</button><button class="button full" data-route="switch">생활변화 비교하기</button></section>${demoNote('자격 충족이나 최종 선정을 보장하지 않아요. 신청 전 시행기관의 최신 공고를 확인해 주세요.')}</aside></div>${footer()}`;
}
function profileStates() {
  const p=state.profile;
  const study=p.status==='대학 재학'?(p.school?`${p.school} 소재 대학 재학`:'재학 지역 미입력'):'졸업·재학 상태 확인';
  return {
    current:{label:'현재 내 정보',title:`${p.status} · ${p.residence}`,residence:p.residence,study,work:p.status,detail:'내 정보에 저장한 현재 생활 상태'},
    graduate:{label:'졸업 후 구직',title:`졸업·구직 중 · ${p.residence}`,residence:p.residence,study:'졸업',work:'구직 중',detail:'졸업 이후 구직 활동을 하는 경우'},
    move:{label:'천안 전입',title:`${p.status} · 천안시`,residence:'천안시',study,work:p.status,detail:'주민등록상 주소지만 천안으로 옮기는 경우'},
    graduateMove:{label:'졸업 후 천안 전입',title:'졸업·구직 중 · 천안시',residence:'천안시',study:'졸업',work:'구직 중',detail:'졸업과 천안 전입을 함께 가정하는 경우'}
  };
}
function routeSelect(which,states) {
  const key=which==='from'?state.from:state.to, title=which==='from'?'현재·출발 상태':'변화 후 상태';
  return `<div><label class="field-label route-label" for="route-${which}"><span class="route-dot ${which==='to'?'to':''}"></span>${title}</label><select class="field" id="route-${which}" data-route-select="${which}">${Object.entries(states).map(([k,s])=>`<option value="${k}" ${key===k?'selected':''}>${esc(s.title)}</option>`).join('')}</select><p class="field-help">${states[key].detail}</p></div>`;
}
function switchPage() {
  const states=profileStates(), from=states[state.from], to=states[state.to];
  const diffs=[{label:'주민등록지',before:from.residence,after:to.residence},{label:'학적 상태',before:from.study,after:to.study},{label:'활동 상태',before:from.work,after:to.work}];
  const count=diffs.filter(d=>d.before!==d.after).length;
  return `${pageIntro('03 / LIFE SWITCH','바뀌는 내일, 미리 픽해봐요.','졸업, 구직, 이사. 내 상황이 달라졌을 때 확인할 항목을 비교해요.')}<div class="content-narrow"><section class="surface panel"><div class="panel-heading"><h2>어떤 변화가 있나요?</h2><span class="badge neutral">가정한 상황 비교</span></div><div class="route-editor">${routeSelect('from',states)}<button class="swap-button" data-action="swap-route" aria-label="출발 상태와 변화 후 상태 바꾸기">${icon('switch')}</button>${routeSelect('to',states)}</div><div class="scenario-presets" role="group" aria-label="자주 비교하는 변화">${[['graduate','졸업 후 구직'],['move','천안 전입'],['graduateMove','졸업 + 천안 전입']].map(([k,l])=>`<button class="preset ${state.to===k?'active':''}" data-preset="${k}" aria-pressed="${state.to===k}">${l}</button>`).join('')}</div></section><div class="result-summary" aria-live="polite">${icon('switch')}<div><h2>${count?`생활 조건 <b>${count}개</b>가 달라져요`:'선택한 두 상태의 생활 조건이 같아요'}</h2><p>변화 전후의 차이를 기준으로 다시 확인할 내용을 정리했어요.</p></div></div><section class="surface panel" aria-label="생활 조건 비교"><table class="comparison"><thead><tr><th scope="col">비교 항목</th><th scope="col">출발 상태</th><th scope="col">변화 후</th></tr></thead><tbody>${diffs.map(d=>`<tr><td>${d.label}</td><td>${esc(d.before)}</td><td class="${d.before!==d.after?'changed':''}">${esc(d.after)}<span class="change-label">${d.before!==d.after?'변경':'동일'}</span></td></tr>`).join('')}</tbody></table></section><section class="surface panel"><h2>신청 전에 다시 확인해요</h2><div class="checks"><div class="check-row"><div><strong>지역 요건</strong><p>${from.residence!==to.residence?`${esc(from.residence)} → ${esc(to.residence)}<br>공고의 거주 기준일과 전입일을 대조해 주세요.`:'주소지 변화는 없어요. 공고의 지역 인정 범위를 확인해 주세요.'}</p></div><span class="badge check">공고별 확인</span></div><div class="check-row"><div><strong>학적·취업 요건</strong><p>${from.study!==to.study||from.work!==to.work?'재학생·졸업생 인정 범위와 구직 상태 조건을 다시 살펴보세요.':'학적과 활동 상태의 변화는 없어요.'}</p></div><span class="badge ${from.study!==to.study||from.work!==to.work?'check':'neutral'}">${from.study!==to.study||from.work!==to.work?'재확인 필요':'변화 없음'}</span></div><div class="check-row"><div><strong>신청 기준일</strong><p>변화가 생긴 날짜와 공고의 자격 기준일을 함께 확인해요.</p></div><span class="badge check">추가 확인</span></div></div></section><button class="button primary" data-action="all-policies">정책 다시 살펴보기 ${icon('arrow')}</button>${demoNote('가정한 상태의 차이를 보여주는 화면이에요. 미래의 지원 자격이나 선정 여부를 확정하지 않으며, 저장된 내 정보는 바뀌지 않아요.')}</div>${footer()}`;
}
function walletPanel() {
  const list=[...state.wallet].sort((a,b)=>a-b);
  return `<section class="surface side-panel"><div class="section-heading"><h2 class="wallet-heading">${icon('wallet')} 내 전자지갑</h2><span class="badge neutral">${list.length}개</span></div>${list.length?list.map(i=>`<div class="wallet-file"><strong>${esc(taskList[i].file)}</strong><small>준비 안내 · TXT</small><div class="wallet-actions"><button data-download="${i}" aria-label="${esc(taskList[i].file)} 다운로드">다운로드</button><button data-remove="${i}" aria-label="${esc(taskList[i].file)} 보관 해제">보관 해제</button></div></div>`).join(''):'<p class="wallet-empty">보관한 안내 파일이 없어요.<br>체크리스트에서 필요한 파일을 담아보세요.</p>'}<p class="mini-note">${storageAvailable?'이 브라우저에 안내 파일 목록을 보관해요.':'현재 화면에서 안내 파일 목록을 보관해요.'} 실제 증빙서류는 업로드하지 않아요.</p><button class="text-button blue wallet-all-link" data-route="wallet">전자지갑 전체 보기 ${icon('arrow')}</button></section>`;
}
function applyPage() {
  const p=getPolicy(state.preparedPolicy), done=state.completed.size;
  return `${pageIntro('02 / 나의 체크 노트','준비는 한 칸씩, 확실하게.','공고 확인부터 서류 점검까지, 완료한 항목에 표시해 주세요.')}<section class="surface prep-overview"><div><span class="badge neutral">시연용 준비 목록</span><h2>${p.title}</h2></div><div class="prep-progress"><div class="progress-label"><span>${done} / ${taskList.length} 단계 완료</span><strong>${Math.round(done/taskList.length*100)}%</strong></div><div class="progress-track" role="progressbar" aria-label="준비 단계 완료" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${taskList.length}"><div class="progress-fill" style="width:${done/taskList.length*100}%"></div></div></div></section><div class="content-two prep-grid"><section><div class="surface panel"><div class="panel-heading"><h2>내 준비 체크리스트</h2><span class="badge blue">${done===taskList.length?'모두 완료':`${taskList.length-done}개 남았어요`}</span></div>${taskList.map((t,i)=>`<div class="task-row"><div class="task-main"><input type="checkbox" id="task-${i}" data-task="${i}" ${state.completed.has(i)?'checked':''}><label class="task-label" for="task-${i}"><strong>${t.title}</strong><small>${t.desc}</small></label><span class="badge ${state.completed.has(i)?'good':'neutral'}">${state.completed.has(i)?'완료':'준비 전'}</span></div><div class="task-document">${icon('file')}<span>${t.file}</span><button class="small-action ${state.wallet.has(i)?'saved':''}" data-save="${i}" aria-label="${esc(t.file)} ${state.wallet.has(i)?'보관됨':'전자지갑에 보관'}" ${state.wallet.has(i)?'disabled':''}>${state.wallet.has(i)?'보관됨':'지갑 보관'}</button><button class="small-action" data-download="${i}" aria-label="${esc(t.file)} 받기">받기</button></div></div>`).join('')}</div><button class="button primary" data-action="save-prep">준비 현황 저장 ${icon('check')}</button>${demoNote('다운로드 파일은 준비를 돕는 시연용 안내·점검 양식이에요. 실제 증명서나 신청서가 아니며, 최종 신청은 시행기관의 공식 홈페이지에서 진행해 주세요.')}</section><aside>${walletPanel()}<section class="surface side-panel"><div class="section-heading"><h2>놓치지 말고 확인해요</h2></div><div class="reminder-row"><span>공고별 제출서류</span><span>원문 대조</span></div><div class="reminder-row"><span>접수 마감 일정</span><span>변경 여부 확인</span></div><div class="reminder-row"><span>다른 정책 참여 이력</span><span>중복수혜 확인</span></div></section></aside></div>${footer()}`;
}
function profilePage() {
  const p=state.profile;
  return `${pageIntro('MY POLICY PASS / 내 정보','나를 알아야, 픽도 정확하게.','정책을 살펴보는 데 필요한 정보만 입력해요.')}<div class="content-two profile-grid"><form id="profileForm" novalidate><section class="surface panel"><div class="panel-heading"><h2>기본 정보</h2><span class="badge neutral">입력 예시</span></div><p class="panel-description">거주지와 재학·근무 지역을 나누어 확인해요.</p><div class="form-grid"><div><label class="field-label" for="profileAge">연령</label><div class="field-unit"><input class="field" type="number" id="profileAge" name="age" min="15" max="100" required value="${p.age}" inputmode="numeric"><span>만 나이</span></div></div><div><label class="field-label" for="profileStatus">현재 상태</label><select class="field" id="profileStatus" name="status">${['대학 재학','휴학','졸업','구직 중','재직 중','창업'].map(v=>`<option ${p.status===v?'selected':''}>${v}</option>`).join('')}</select></div><div><label class="field-label" for="profileResidence">주민등록상 주소지</label><input class="field" id="profileResidence" name="residence" maxlength="50" value="${esc(p.residence)}" placeholder="예: 경기도" required><p class="field-help">시·도 또는 시·군·구까지만 입력해요.</p></div><div><label class="field-label" for="profileSchool">학교 소재지</label><input class="field" id="profileSchool" name="school" maxlength="50" value="${esc(p.school)}" placeholder="예: 천안시"><p class="field-help">학교에 다니고 있다면 입력해 주세요.</p></div><div><label class="field-label" for="profileWork">근무 지역 <span class="subtle">(선택)</span></label><input class="field" id="profileWork" name="workRegion" maxlength="50" value="${esc(p.workRegion)}" placeholder="예: 천안시"></div></div></section><section class="surface panel"><h2>관심 분야</h2><p class="section-caption">관심 있는 지원을 여러 개 선택할 수 있어요.</p><div class="interest-options">${['일자리','주거','교육','창업'].map(v=>`<label class="interest-option"><input type="checkbox" name="interest" value="${v}" ${p.interests.includes(v)?'checked':''}>${v}</label>`).join('')}</div></section><div class="form-actions"><button class="button" type="button" data-action="cancel-profile">취소</button><button class="button primary" type="submit">내 정보 저장</button></div></form><aside class="profile-aside">${profileWalletPreview()}<section class="surface side-panel"><div class="section-heading"><h2>정보를 입력하기 전에</h2></div><ul class="profile-tips"><li><strong>주소지는 서로 달라도 돼요</strong>실제 주민등록지와 학교·근무 지역을 구분하면 확인할 조건을 놓치지 않아요.</li><li><strong>민감한 정보는 입력하지 않아요</strong>주민등록번호, 상세 주소, 소득·재산 정보는 이 화면에서 받지 않아요.</li><li><strong>내 브라우저에만 반영해요</strong>입력 정보는 이 브라우저에 저장돼요. 시연용 정책 예시의 자격을 자동으로 확정하지 않아요.</li></ul></section></aside></div>${footer()}`;
}
function render(resetScroll=false) {
  const route=currentRoute(), active=route.page==='detail'?'policies':route.page;
  document.body.dataset.page=route.page;
  document.getElementById('main').innerHTML=({home,policies:policiesPage,switch:switchPage,apply:applyPage,profile:profilePage,wallet:walletPage}[route.page] || (()=>detail(route.id)))();
  document.getElementById('sideNav').innerHTML=NAVS.map(n=>`<a href="#${n.key}" class="nav-link ${active===n.key?'active':''}" ${active===n.key?'aria-current="page"':''}>${icon(n.icon)}<span>${n.label}</span>${n.key==='apply'?'<span class="nav-count">1</span>':''}</a>`).join('');
  document.getElementById('bottomNav').innerHTML=NAVS.map(n=>`<a href="#${n.key}" class="bottom-link ${active===n.key?'active':''}" ${active===n.key?'aria-current="page"':''}>${icon(n.icon)}<span>${n.mobile}</span></a>`).join('');
  document.getElementById('topbarTitle').textContent=NAVS.find(n=>n.key===active)?.title || '정책 찾기';
  document.getElementById('sideRegion').innerHTML=icon('pin')+esc(state.profile.school || state.profile.workRegion || state.profile.residence)+' 생활권';
  document.title=`${route.page==='detail'?getPolicy(route.id).title:NAVS.find(n=>n.key===active).title} · 청년픽 NEXT`;
  refreshNavigatorContext();
  if(resetScroll) { window.scrollTo({top:0,behavior:'instant'}); document.getElementById('main').focus({preventScroll:true}); }
}
function rerenderKeepingFocus(selector) {
  const scroll=window.scrollY;
  render();
  window.scrollTo({top:scroll,behavior:'instant'});
  if(selector) document.querySelector(selector)?.focus({preventScroll:true});
}
function openDialog(title,body) {
  document.getElementById('dialogTitle').textContent=title;
  document.getElementById('dialogBody').innerHTML=body;
  document.getElementById('infoDialog').showModal();
}
function downloadTaskFile(index) {
  const item=taskList[index]; if(!item)return;
  const content=`준비 중인 정책: ${getPolicy(state.preparedPolicy).title}\n\n${item.content}`;
  const url=URL.createObjectURL(new Blob(['\ufeff'+content],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url;a.download=item.file;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);toast('안내 파일을 다운로드했어요.');
}
function allPolicies() { category='전체';searchTerm='';statusFilter='all';go('policies'); }

document.addEventListener('click',event=>{
  const el=event.target.closest('button'); if(!el || el.disabled)return;
  if(el.dataset.route) { go(el.dataset.route); return; }
  if(el.dataset.policy) { go('detail/'+el.dataset.policy);return; }
  if(el.dataset.category) {
    category=el.dataset.category;
    if(currentRoute().page==='home') {statusFilter='all';searchTerm='';go('policies');}
    else rerenderKeepingFocus(`[data-category="${category}"]`);
    return;
  }
  if(el.dataset.overview) { statusFilter=el.dataset.overview; category='전체'; searchTerm=''; go('policies'); return; }
  if(el.dataset.prepare) {
    const nextId=Number(el.dataset.prepare);
    if(nextId!==state.preparedPolicy) {state.completed=new Set();}
    state.preparedPolicy=nextId;persist();go('apply');toast('이 정책의 준비 목록을 열었어요.');return;
  }
  if(el.dataset.preset) {state.to=el.dataset.preset;persist();rerenderKeepingFocus(`[data-preset="${state.to}"]`);return;}
  if(el.dataset.save!==undefined) {state.wallet.add(Number(el.dataset.save));persist();rerenderKeepingFocus(`[data-download="${el.dataset.save}"]`);toast('전자지갑에 안내 파일을 보관했어요.');return;}
  if(el.dataset.remove!==undefined) {state.wallet.delete(Number(el.dataset.remove));persist();rerenderKeepingFocus();toast('안내 파일의 보관을 해제했어요.');return;}
  if(el.dataset.download!==undefined) {downloadTaskFile(Number(el.dataset.download));return;}
  switch(el.dataset.action) {
    case 'all-policies':allPolicies();break;
    case 'reset-filters':category='전체';searchTerm='';statusFilter='all';sort='related';rerenderKeepingFocus('#policySearchForm input');break;
    case 'clear-status':statusFilter='all';rerenderKeepingFocus('#policySearchForm input');break;
    case 'clear-search':{searchTerm='';const input=el.closest('form').querySelector('input');input.value='';input.focus();updateResults();break;}
    case 'swap-route':{[state.from,state.to]=[state.to,state.from];persist();rerenderKeepingFocus('[data-action="swap-route"]');break;}
    case 'save-prep':toast(persist()?'준비 현황을 이 브라우저에 저장했어요.':'준비 현황을 현재 화면에 반영했어요.');break;
    case 'cancel-profile':go('home');break;
    case 'close-dialog':document.getElementById('infoDialog').close();break;
    case 'notifications':openDialog('알림','<p>새로운 알림이 없어요.</p><p>준비할 내용은 ‘신청 준비’에서 확인할 수 있어요.</p><button class="button primary full" data-action="notification-prep">신청 준비 보기</button>');break;
    case 'notification-prep':document.getElementById('infoDialog').close();go('apply');break;
    case 'about':openDialog('청년픽 NEXT 프로토타입','<p><strong>내게 맞는 정책을 찾고, 신청 준비까지 이어가는 서비스</strong>를 미리 체험하는 화면이에요.</p><p>정책 3건과 체크리스트는 모두 시연용 예시예요. 공식 정책 데이터, 실제 증명서 보관, 기관 제출과는 연결되어 있지 않아요.</p><p>검색, 생활변화 비교, 준비 체크, 안내 파일 보관·다운로드를 직접 이용할 수 있어요.</p>');break;
  }
});
document.addEventListener('input',event=>{
  if(event.target.matches('#policySearchForm input')) {searchTerm=event.target.value;updateResults();}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.task!==undefined) {const i=Number(el.dataset.task);el.checked?state.completed.add(i):state.completed.delete(i);persist();rerenderKeepingFocus('#task-'+i);}
  if(el.dataset.routeSelect) {state[el.dataset.routeSelect]=el.value;persist();rerenderKeepingFocus('#'+el.id);}
  if(el.id==='sortSelect') {sort=el.value;updateResults();}
});
document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.id==='homeSearchForm'||form.id==='policySearchForm') {
    event.preventDefault();searchTerm=form.elements.search.value.trim();
    if(form.id==='homeSearchForm') {category='전체';statusFilter='all';go('policies');}else updateResults();
  }
  if(form.id==='profileForm') {
    event.preventDefault();if(!form.reportValidity())return;
    const data=new FormData(form), residence=String(data.get('residence')).trim();
    if(!residence) {form.elements.residence.setCustomValidity('주민등록상 주소지를 입력해 주세요.');form.elements.residence.reportValidity();form.elements.residence.addEventListener('input',()=>form.elements.residence.setCustomValidity(''),{once:true});return;}
    state.profile={age:Number(data.get('age')),residence,school:String(data.get('school')).trim(),workRegion:String(data.get('workRegion')).trim(),status:String(data.get('status')),interests:data.getAll('interest')};
    const saved=persist();go('home');toast(saved?'내 정보를 저장했어요.':'내 정보를 현재 화면에 반영했어요.');
  }
});
document.getElementById('infoDialog').addEventListener('click',event=>{
  if(event.target===event.currentTarget) {const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();}
});
window.addEventListener('hashchange',()=>{if(location.hash!=='#main')render(true);});
initWalletUI();
render();

  