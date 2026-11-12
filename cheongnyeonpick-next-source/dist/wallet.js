/* Wallet workspace and the contextual navigator share the prototype's profile
   and saved guide list. No certificates, provider tokens or chat are uploaded. */
const walletUI = {tab:'documents', category:'all', query:'', selected:'student', history:[]};
try {
  const history = JSON.parse(localStorage.getItem('cheongnyeonpick-wallet-history-v1') || '[]');
  if (Array.isArray(history)) walletUI.history = history.filter(v => v && typeof v.name === 'string' && typeof v.time === 'string').slice(0,20);
} catch (_) {}
const walletDocuments = [
  {id:'student', name:'재학·졸업 증빙서류', short:'재학증명서', kind:'학적', tone:'lilac', issuer:'재학·졸업한 대학교', policy:'교육·취업 지원', purpose:'공고가 인정하는 재학생·졸업생 범위를 확인할 때 살펴봐요.', criteria:'재학·졸업·졸업예정 중 인정되는 서류와 발급일 기준을 공고에서 확인해 주세요.', task:2},
  {id:'residence', name:'주민등록표 등본', short:'주민등록표 등본', kind:'거주', tone:'lime', issuer:'정부24 등 공식 발급처', policy:'주거·생활 지원', purpose:'주민등록상 지역과 세대 관련 요건을 확인할 때 살펴봐요.', criteria:'주소지 기준일, 세대원 표시 범위, 발급일 기준을 공고에서 확인해 주세요.', task:1},
  {id:'income', name:'소득 관련 증빙서류', short:'소득 증빙서류', kind:'소득', tone:'peach', issuer:'공고에 명시된 발급처', policy:'소득 요건이 있는 지원', purpose:'정책별 소득 요건과 가구 기준을 확인할 때 살펴봐요.', criteria:'소득금액증명, 건강보험료 자료 등 공고에서 요구하는 서류의 종류와 기준 기간을 먼저 확인해 주세요.', task:3}
];
function navigatorMark() {
  return '<svg class="navigator-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="1.6"/><path d="M24 2v5m0 34v5M2 24h5m34 0h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="m31 14-3 14-11 7 3-14 11-7Z" fill="currentColor"/><path d="m31 14-7 11-4-4 11-7Z" fill="#d9ef76"/><circle cx="24" cy="24" r="2.3" fill="#f6f5ed"/></svg>';
}
function walletArtwork(compact=false) {
  return `<div class="wallet-art ${compact?'compact':''}" aria-hidden="true"><div class="art-card art-card-back"><span>MY NEXT</span><i></i><i></i></div><div class="art-card art-card-front"><span>나의 다음을 위한 서류</span><i></i><i></i><b>↗</b></div><div class="art-pocket"><span class="pocket-symbol">N<span>↗</span></span><span class="pocket-label">NEXT WALLET</span><span class="pocket-clasp"></span></div></div>`;
}
function walletProviderButtons() {
  return `<div class="wallet-provider-list"><button class="wallet-provider" data-wallet-provider="kakao"><span class="provider-letter kakao">K</span><span><strong>카카오 지갑</strong><small>연결 전</small></span><span class="provider-action">연결 안내 ${icon('chevron')}</span></button><button class="wallet-provider" data-wallet-provider="naver"><span class="provider-letter naver">N</span><span><strong>네이버 전자증명서</strong><small>연결 전</small></span><span class="provider-action">연결 안내 ${icon('chevron')}</span></button></div>`;
}
function profileWalletPreview() {
  return `<section class="profile-wallet-card" aria-labelledby="profileWalletTitle"><div class="wallet-mini-head"><span class="mono-kicker">MY NEXT WALLET</span>${icon('wallet')}</div><h2 id="profileWalletTitle">내 서류도, 한 곳에.</h2><p>정책에 필요한 서류와<br>준비 안내를 함께 살펴봐요.</p>${walletArtwork(true)}<div class="wallet-mini-stats"><span>증명서 연결 <strong>0</strong></span><span>보관한 안내 <strong>${state.wallet.size}</strong></span></div><button class="button wallet-dark full" data-route="wallet">내 전자지갑 열기 ${icon('arrow')}</button><small class="wallet-mini-caption">카카오·네이버 연결 화면을 미리 볼 수 있어요.</small></section>`;
}
function walletPage() {
  const p=state.profile;
  return `${pageIntro('04 / MY NEXT WALLET','필요한 서류, 한 곳에서.','내 정보와 서류를 잇고, 다음 준비를 가볍게 시작해요.', '<span class="wallet-page-tag">'+icon('wallet')+' 나의 서류 보드</span>')}
  <div class="wallet-layout"><aside class="wallet-sidebar"><section class="wallet-pass"><div class="wallet-pass-top"><span class="mono-kicker">MY NEXT WALLET</span><span class="wallet-number">01 / NEXT</span></div>${walletArtwork()}<div class="wallet-pass-copy"><span class="wallet-owner">나의 생활권</span><h2>${esc(p.residence)} <span>↔</span> ${esc(p.school||p.workRegion||'지역 미입력')}</h2><p>만 ${p.age}세 · ${esc(p.status)}</p></div><div class="wallet-pass-foot"><span>${icon('user')} 직접 입력한 정보</span><button class="text-button" data-route="profile" aria-label="내 정보 수정">수정 ${icon('chevron')}</button></div></section>
  <section class="wallet-provider-box"><h3>나의 전자지갑 연결</h3><p>쓰고 있는 지갑에서 이어갈 수 있게.</p>${walletProviderButtons()}<p class="wallet-provider-note">지금은 연결 흐름을 확인하는 시연 화면이에요.</p></section>
  <button class="wallet-sidebar-help" data-wallet-ask="documents"><span class="sidebar-help-mark">${navigatorMark()}</span><span><strong>어떤 서류부터 준비할까요?</strong><small>내비게이터에게 물어보기</small></span>${icon('arrow')}</button></aside>
  <section class="wallet-main"><div class="wallet-summary" aria-label="전자지갑 현황"><div><span>연결된 증명서</span><strong>00<small>개</small></strong><em>지갑 연결이 필요해요</em></div><div><span>보관한 안내 양식</span><strong>${String(state.wallet.size).padStart(2,'0')}<small>개</small></strong><em>필요할 때 바로 꺼내요</em></div><div><span>준비 중인 정책</span><strong>01<small>건</small></strong><em>신청 준비와 이어져요</em></div></div>
  ${walletWorkspace()}
  <div class="wallet-next-step"><span class="wallet-next-icon">${icon('check')}</span><div><strong>서류를 살폈다면, 다음 한 칸.</strong><p>${esc(getPolicy(state.preparedPolicy).title)}의 준비 목록을 이어가요.</p></div><button class="text-button" data-route="apply">신청 준비 ${icon('arrow')}</button></div>
  <p class="wallet-demo-note">${icon('info')}<span>UI 시연 화면이에요. 실제 문서 발급과 외부 지갑 연동은 아직 연결되지 않았어요.</span></p></section></div>${footer()}`;
}
function walletTabs() {
  return `<div class="wallet-tabs" role="tablist" aria-label="전자지갑 자료">${[['documents','필요한 서류',walletDocuments.length],['guides','안내 양식',state.wallet.size],['activity','활용 내역',walletUI.history.length]].map(([key,label,count])=>`<button id="wallet-tab-${key}" role="tab" aria-selected="${walletUI.tab===key}" aria-controls="wallet-tabpanel" tabindex="${walletUI.tab===key?'0':'-1'}" class="wallet-tab ${walletUI.tab===key?'active':''}" data-wallet-tab="${key}">${label}<span>${count}</span></button>`).join('')}</div>`;
}
function visibleWalletItems() {
  const q=walletUI.query.trim().toLocaleLowerCase();
  if(walletUI.tab==='guides') return [...state.wallet].sort((a,b)=>a-b).map(i=>({id:'guide-'+i,index:i,name:taskList[i].file,kind:'안내',tone:'paper',issuer:'청년픽 NEXT',guide:true})).filter(d=>!q||d.name.toLocaleLowerCase().includes(q));
  return walletDocuments.filter(d=>(walletUI.category==='all'||d.kind===walletUI.category)&&(!q||`${d.name} ${d.kind} ${d.issuer}`.toLocaleLowerCase().includes(q)));
}
function walletWorkspace() {
  return `<section class="wallet-workspace" aria-label="내 서류 작업 공간">${walletTabs()}<div id="wallet-tabpanel" role="tabpanel" aria-labelledby="wallet-tab-${walletUI.tab}" tabindex="0">${walletUI.tab==='activity'?walletActivity():walletDocumentsPanel()}</div></section>`;
}
function walletDocumentsPanel() {
  const items=visibleWalletItems();
  const selected=items.find(d=>d.id===walletUI.selected)||items[0];
  if(selected)walletUI.selected=selected.id;
  return `<div class="wallet-tools"><label class="wallet-search">${icon('search')}<input id="walletSearch" type="search" value="${esc(walletUI.query)}" placeholder="서류 이름으로 찾아보세요" aria-label="전자지갑 서류 검색" maxlength="100">${walletUI.query?'<button type="button" data-wallet-clear aria-label="서류 검색어 지우기">'+icon('close')+'</button>':''}</label>${walletUI.tab==='documents'?`<div class="wallet-filters" role="group" aria-label="서류 종류">${[['all','전체'],['학적','학적'],['거주','거주'],['소득','소득']].map(([k,l])=>`<button data-wallet-filter="${k}" aria-pressed="${walletUI.category===k}" class="${walletUI.category===k?'active':''}">${l}</button>`).join('')}</div>`:`<span class="wallet-format-tag">준비 안내 · TXT</span>`}</div>
  <div class="wallet-document-grid"><div class="wallet-list-area"><div class="wallet-list-heading"><h2>${walletUI.tab==='guides'?'내가 보관한 안내 양식':'신청 전, 살펴볼 서류'} <span>${items.length}</span></h2><span>${walletUI.tab==='guides'?'내 브라우저 보관':'공고별 확인'}</span></div><p class="wallet-list-description">${walletUI.tab==='guides'?'체크리스트에서 담아둔 준비 안내예요.':'준비 중인 정책의 공고와 대조할 서류 예시예요.'}</p>
  <div class="wallet-document-list" role="list" aria-label="${walletUI.tab==='guides'?'보관한 안내 파일':'필요한 서류 목록'}">${items.length?items.map(d=>`<div role="listitem"><button class="wallet-document-row ${walletUI.selected===d.id?'selected':''}" data-wallet-doc="${d.id}" aria-pressed="${walletUI.selected===d.id}"><span class="wallet-doc-icon ${d.tone}">${icon('file')}</span><span class="wallet-doc-text"><strong>${esc(d.name)}</strong><small>${d.guide?'청년픽 NEXT · 안내 양식':esc(d.issuer)}</small></span><span class="wallet-document-status ${d.guide?'saved':''}">${d.guide?'보관 중':'확인 필요'}</span>${icon('chevron')}</button></div>`).join(''):`<div class="wallet-list-empty">${icon('file')}<h3>${walletUI.query?'찾는 서류가 없어요':'아직 보관한 안내가 없어요'}</h3><p>${walletUI.query?'검색어를 줄이거나 다른 종류를 선택해 보세요.':'신청 준비에서 필요한 안내를 지갑에 담아보세요.'}</p><button class="text-button blue" ${walletUI.query?'data-wallet-reset':'data-route="apply"'}>${walletUI.query?'검색 조건 초기화':'신청 준비로 가기'} ${icon('arrow')}</button></div>`}</div>
  <div class="wallet-list-foot">${icon('info')}<span>${walletUI.tab==='guides'?'안내 양식은 실제 발급된 증명서와 구분해요.':'필요 서류와 발급 기준은 실제 공고에 따라 달라져요.'}</span></div></div><aside class="wallet-document-detail" aria-label="선택한 서류 상세">${selected?walletDocumentDetail(selected):'<div class="wallet-detail-empty">'+icon('file')+'<p>서류를 선택하면<br>관련 안내를 볼 수 있어요.</p></div>'}</aside></div>`;
}
function walletDocumentDetail(d) {
  const isGuide=!!d.guide;
  return `<div class="wallet-detail-topline"><span>DOCUMENT ${isGuide?'GUIDE':'DETAIL'}</span><span class="detail-index">${isGuide?'TXT':String(walletDocuments.indexOf(d)+1).padStart(2,'0')}</span></div><div class="wallet-document-preview ${d.tone}"><div class="document-paper"><span class="paper-corner"></span><span class="paper-title">${isGuide?'준비 안내':esc(d.kind)+' 증빙'}</span><span class="paper-line long"></span><span class="paper-line"></span><span class="paper-line long"></span><span class="paper-line short"></span><span class="paper-stamp">${isGuide?'GUIDE':'발급 전'}</span></div><span class="preview-caption">${isGuide?'안내 파일':'서류 미리보기 예시'}</span></div><h3 class="wallet-detail-title">${esc(d.name)}</h3><span class="wallet-detail-state">${icon(isGuide?'circleCheck':'clock')}${isGuide?'이 브라우저에 안내 목록을 보관했어요':'아직 연결된 증명서가 없어요'}</span>
  <dl class="wallet-detail-meta"><div><dt>종류</dt><dd>${isGuide?'안내 양식 · TXT':esc(d.kind)+' 증빙서류'}</dd></div><div><dt>발급처</dt><dd>${esc(d.issuer)}</dd></div><div><dt>연결 정책</dt><dd>${esc(getPolicy(state.preparedPolicy).title)}</dd></div><div><dt>${isGuide?'파일 내용':'발급 기준'}</dt><dd>${isGuide?'신청 준비를 돕는 안내문':'공고 확인 필요'}</dd></div></dl>
  ${isGuide?`<button class="button wallet-dark full" data-download="${d.index}">안내 파일 받기 ${icon('arrow')}</button><button class="text-button wallet-remove" data-remove="${d.index}">안내 양식 보관 해제</button>`:`<button class="button wallet-dark full" data-wallet-issuance="${d.id}">발급·준비 안내 ${icon('arrow')}</button><button class="text-button wallet-detail-next" data-route="apply">준비 목록에서 확인 ${icon('chevron')}</button>`}`;
}
function walletActivity() {
  return `<div class="wallet-activity"><div class="wallet-list-heading"><h2>서류를 살펴본 기록</h2><span>이 브라우저에서</span></div>${walletUI.history.length?`<div class="wallet-activity-list">${walletUI.history.map(h=>`<div class="wallet-activity-row"><span class="activity-dot"></span><div><strong>${esc(h.name)}</strong><p>발급·준비 안내를 확인했어요.</p></div><time datetime="${esc(h.time)}">${new Date(h.time).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'})}</time></div>`).join('')}</div>`:`<div class="wallet-activity-empty"><span class="empty-folder">${icon('clock')}</span><h3>다음 준비의 기록이 쌓일 곳.</h3><p>서류의 발급·준비 안내를 열면 여기에 남겨요.<br>기관에 실제 제출한 내역과는 구분해요.</p><button class="button" data-wallet-tab="documents">필요한 서류 살펴보기 ${icon('arrow')}</button></div>`}</div>`;
}
function updateWalletWorkspace(focusSelector) {
  const node=document.querySelector('.wallet-workspace'); if(!node)return;
  const scrollY=window.scrollY;
  node.outerHTML=walletWorkspace();
  window.scrollTo({top:scrollY,behavior:'instant'});
  if(focusSelector)document.querySelector(focusSelector)?.focus({preventScroll:true});
}
function recordWalletView(d) {
  walletUI.history=walletUI.history.filter(h=>h.name!==d.name);
  walletUI.history.unshift({name:d.name,time:new Date().toISOString()});
  walletUI.history=walletUI.history.slice(0,20);
  try {localStorage.setItem('cheongnyeonpick-wallet-history-v1',JSON.stringify(walletUI.history));}catch(_){}
}
function showIssuance(id) {
  const d=walletDocuments.find(d=>d.id===id); if(!d)return;
  recordWalletView(d);
  openDialog(d.name+' 준비 안내',`<p class="dialog-eyebrow">서류를 준비하기 전에</p><p>${d.purpose}</p><div class="issuance-note"><strong>공고에서 먼저 확인해요</strong><p>${d.criteria}</p></div><div class="issuance-steps"><div><span>01</span><p><strong>요구 서류 확인</strong>공고의 제출서류 항목을 살펴봐요.</p></div><div><span>02</span><p><strong>공식 발급처에서 준비</strong>${esc(d.issuer)}의 발급 방법을 확인해요.</p></div><div><span>03</span><p><strong>제출 기준 대조</strong>발급일·제출 형식·표시 범위를 확인해요.</p></div></div><button class="button wallet-dark full" data-wallet-dialog-prep>준비 목록으로 이동 ${icon('arrow')}</button><p class="dialog-footnote">이 화면에서 증명서를 발급하거나 제출하지는 않아요.</p>`);
}
function showProviderFlow(provider) {
  const name=provider==='kakao'?'카카오 지갑':'네이버 전자증명서';
  const url=provider==='kakao'?'https://www.kakaocorp.com/page/service/service/KakaoTalkWallet':'https://ekyc.naver.com/home/main';
  openDialog(name+' 연결 안내',`<div class="provider-dialog-intro"><span class="provider-letter ${provider}">${provider==='kakao'?'K':'N'}</span><div><strong>익숙한 지갑에서, 나의 다음으로.</strong><p>전자지갑 연결 흐름 미리 보기</p></div></div><div class="issuance-steps"><div><span>01</span><p><strong>연결할 지갑 선택</strong>사용 중인 전자지갑을 선택해요.</p></div><div><span>02</span><p><strong>제공할 정보 확인</strong>가져올 서류와 정보 범위를 확인해요.</p></div><div><span>03</span><p><strong>정책 준비와 연결</strong>연결된 정보가 어디에 쓰이는지 살펴봐요.</p></div></div><p class="provider-demo-box">현재는 UI 시연 단계예요. 실제 인증이나 문서 가져오기는 진행되지 않아요.</p><a class="button wallet-dark full" href="${url}" target="_blank" rel="noopener noreferrer">공식 서비스 안내 보기 <span aria-hidden="true">↗</span><span class="sr-only">(새 창)</span></a>`);
}

const navigatorUI={open:false,messages:[]};
function navigatorContext() {
  const route=currentRoute();
  return {home:'나의 보드',policies:'정책 찾기',detail:'정책 상세',switch:'생활변화 비교',apply:'신청 준비',profile:'내 정보',wallet:'전자지갑'}[route.page]||'나의 보드';
}
function navigatorAnswer(kind) {
  const policy=getPolicy(state.preparedPolicy);
  if(kind==='connect')return {title:'쓰고 있는 지갑부터 살펴봐요.',text:'전자지갑의 카카오·네이버 연결 안내에서 흐름을 미리 볼 수 있어요. 지금은 시연 단계라 실제 인증과 문서 가져오기는 진행되지 않아요.',route:'wallet',action:'전자지갑 연결 안내 보기'};
  if(kind==='documents')return {title:'공고의 제출서류부터 확인해요.',text:'재학·졸업, 주민등록상 지역, 소득 관련 서류를 예시로 정리했어요. 실제로 필요한 종류와 발급일 기준은 정책의 공식 공고에서 확인해 주세요.',route:'wallet',action:'필요한 서류 살펴보기'};
  if(kind==='income')return {title:'소득 서류는 공고마다 달라요.',text:'정책의 가구 기준과 소득 확인 기간을 먼저 살펴봐요. 전자지갑의 소득 서류 안내에서 확인할 항목을 볼 수 있어요.',route:'wallet',action:'소득 서류 안내 보기',doc:'income'};
  if(kind==='region')return {title:'사는 곳과 학교는 나누어 봐요.',text:`현재 입력된 정보는 주민등록지 ${state.profile.residence}, 학교 ${state.profile.school||'미입력'}예요. 학교 소재지를 인정하는지는 각 공고의 지역 조건을 확인해야 해요.`,route:'profile',action:'내 생활권 정보 확인'};
  if(kind==='next')return {title:'다음 한 칸은, 신청 준비.',text:`현재 준비 중인 정책은 ‘${policy.title}’예요. ${taskList.length-state.completed.size}개 항목이 남아 있어요. 체크리스트에서 다음 단계를 이어가세요.`,route:'apply',action:'준비 목록 이어가기'};
  if(kind==='switch')return {title:'바뀌는 조건을 미리 비교해요.',text:'졸업·구직·천안 전입을 가정해 현재와 달라지는 조건을 볼 수 있어요. 비교한 상황은 저장된 내 정보를 바꾸지 않아요.',route:'switch',action:'생활변화 비교하기'};
  return {title:'다음 행동을 함께 찾아볼게요.',text:'이 내비게이터는 화면 사용법을 안내하는 시연이에요. 필요한 서류, 지갑 연결, 생활권, 다음 준비에 관해 입력하거나 아래 바로가기를 선택해 주세요.',route:'policies',action:'정책부터 살펴보기'};
}
function classifyNavigator(text) {
  if(/소득|건강보험|금액증명/.test(text))return 'income';
  if(/연결|연동|카카오|네이버/.test(text))return 'connect';
  if(/서류|증명|지갑/.test(text))return 'documents';
  if(/거주|지역|주소|경기도|생활권|학교/.test(text))return 'region';
  if(/변화|졸업|전입|이사/.test(text))return 'switch';
  if(/다음|준비|신청|체크/.test(text))return 'next';
  return 'general';
}
function navigatorThread() {
  if(!navigatorUI.messages.length)return `<div class="navigator-welcome"><span class="navigator-welcome-mark">${navigatorMark()}</span><p class="mono-kicker">YOUR NEXT, TOGETHER</p><h3>어디서부터<br>시작하면 좋을까요?</h3><p>지금 보고 있는 화면에서<br>필요한 다음 한 걸음을 안내해요.</p></div><div class="navigator-suggestions"><button data-navigator-prompt="documents">어떤 서류가 필요해? ${icon('arrow')}</button><button data-navigator-prompt="connect">지갑은 어떻게 연결해? ${icon('arrow')}</button><button data-navigator-prompt="next">다음에 뭘 하면 돼? ${icon('arrow')}</button></div>`;
  return navigatorUI.messages.map(m=>m.user?`<div class="navigator-user-message">${esc(m.user)}</div>`:`<div class="navigator-answer"><span class="answer-brand">NEXT NAVIGATOR</span><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p><button data-navigator-go="${m.route}" ${m.doc?'data-navigator-doc="'+m.doc+'"':''}>${esc(m.action)} ${icon('arrow')}</button></div>`).join('')+`<div class="navigator-followups"><button data-navigator-prompt="documents">필요한 서류</button><button data-navigator-prompt="connect">지갑 연결</button><button data-navigator-prompt="next">다음 준비</button></div>`;
}
function updateNavigatorThread() {
  const el=document.getElementById('navigatorThread'); if(!el)return;
  el.innerHTML=navigatorThread();el.scrollTop=navigatorUI.messages.length?el.scrollHeight:0;
}
function refreshNavigatorContext() {
  const node=document.getElementById('navigatorContext');
  if(node)node.textContent='현재 화면 · '+navigatorContext();
}
function toggleNavigator(open=!navigatorUI.open) {
  navigatorUI.open=open;
  document.getElementById('navigatorPanel').hidden=!open;
  document.getElementById('navigatorLauncher').setAttribute('aria-expanded',String(open));
  document.getElementById('navigatorLauncher').setAttribute('aria-label',open?'AI 내비게이터 접기':'AI 내비게이터 열기');
  document.body.classList.toggle('navigator-is-open',open);
  refreshNavigatorContext();
  if(open){updateNavigatorThread();document.getElementById('navigatorInput').focus({preventScroll:true});}
  else document.getElementById('navigatorLauncher').focus({preventScroll:true});
}
function askNavigator(kind,question) {
  const labels={documents:'어떤 서류가 필요해?',connect:'지갑은 어떻게 연결해?',next:'다음에 뭘 하면 돼?'};
  navigatorUI.messages.push({user:question||labels[kind]||'다음 준비를 알려줘'},navigatorAnswer(kind));
  if(navigatorUI.messages.length>16)navigatorUI.messages=navigatorUI.messages.slice(-16);
  if(!navigatorUI.open)toggleNavigator(true);else updateNavigatorThread();
}
function initWalletUI() {
  document.body.insertAdjacentHTML('beforeend',`<div class="navigator-dock"><section id="navigatorPanel" class="navigator-panel" role="dialog" aria-label="AI 내비게이터" hidden><header class="navigator-header"><span class="navigator-header-mark">${navigatorMark()}</span><div><h2>AI 내비게이터</h2><p>나의 다음 한 걸음</p></div><button class="icon-button" type="button" data-navigator-close aria-label="AI 내비게이터 닫기">${icon('close')}</button></header><div class="navigator-context"><span></span><p id="navigatorContext"></p><button data-navigator-reset aria-label="안내 대화 새로 시작">새로 시작</button></div><div id="navigatorThread" class="navigator-thread" aria-live="polite" aria-relevant="additions text"></div><form id="navigatorForm" class="navigator-input-form"><label class="sr-only" for="navigatorInput">내비게이터에게 질문하기</label><input id="navigatorInput" placeholder="어떤 준비가 궁금한가요?" autocomplete="off" maxlength="300"><button type="submit" aria-label="질문 보내기">${icon('arrow')}</button></form><p class="navigator-disclosure">시연 안내 · 질문은 외부로 전송되지 않아요.</p></section><button id="navigatorLauncher" class="navigator-launcher" aria-expanded="false" aria-controls="navigatorPanel" aria-label="AI 내비게이터 열기"><span class="launcher-icon">${navigatorMark()}</span><span class="launcher-label"><small>나의 다음 한 걸음</small><strong>AI 내비게이터</strong></span><span class="launcher-mobile-label">AI</span></button></div>`);
  document.addEventListener('click',event=>{
    const el=event.target.closest('button'); if(!el||el.disabled)return;
    if(el.id==='navigatorLauncher'){toggleNavigator();return;}
    if(el.hasAttribute('data-navigator-close')){toggleNavigator(false);return;}
    if(el.hasAttribute('data-navigator-reset')){navigatorUI.messages=[];updateNavigatorThread();document.getElementById('navigatorInput').focus();return;}
    if(el.dataset.navigatorPrompt){askNavigator(el.dataset.navigatorPrompt);return;}
    if(el.dataset.walletAsk){askNavigator(el.dataset.walletAsk);return;}
    if(el.dataset.navigatorGo){
      if(el.dataset.navigatorGo==='wallet'){walletUI.tab='documents';walletUI.query='';walletUI.category='all';if(el.dataset.navigatorDoc)walletUI.selected=el.dataset.navigatorDoc;}
      toggleNavigator(false);go(el.dataset.navigatorGo);return;
    }
    if(el.dataset.walletTab){walletUI.tab=el.dataset.walletTab;walletUI.query='';walletUI.category='all';updateWalletWorkspace('[data-wallet-tab="'+walletUI.tab+'"]');return;}
    if(el.dataset.walletFilter){walletUI.category=el.dataset.walletFilter;updateWalletWorkspace('[data-wallet-filter="'+walletUI.category+'"]');return;}
    if(el.dataset.walletDoc){walletUI.selected=el.dataset.walletDoc;updateWalletWorkspace('[data-wallet-doc="'+walletUI.selected+'"]');if(matchMedia('(max-width: 600px)').matches)document.querySelector('.wallet-document-detail')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(el.hasAttribute('data-wallet-clear')||el.hasAttribute('data-wallet-reset')){walletUI.query='';walletUI.category='all';updateWalletWorkspace('#walletSearch');return;}
    if(el.dataset.walletProvider){showProviderFlow(el.dataset.walletProvider);return;}
    if(el.dataset.walletIssuance){showIssuance(el.dataset.walletIssuance);return;}
    if(el.hasAttribute('data-wallet-dialog-prep')){document.getElementById('infoDialog').close();go('apply');return;}
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='walletSearch'){
      walletUI.query=event.target.value;
      const caret=event.target.selectionStart;updateWalletWorkspace('#walletSearch');
      try{document.getElementById('walletSearch').setSelectionRange(caret,caret);}catch(_){}
    }
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='navigatorForm')return;
    event.preventDefault();const input=document.getElementById('navigatorInput'),q=input.value.trim();if(!q)return;
    input.value='';askNavigator(classifyNavigator(q),q);input.focus();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&navigatorUI.open){event.preventDefault();toggleNavigator(false);}
    const tab=event.target.closest('[role="tab"][data-wallet-tab]');
    if(tab&&['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){
      event.preventDefault();const tabs=['documents','guides','activity'];
      const index=tabs.indexOf(walletUI.tab);
      walletUI.tab=tabs[event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3];
      walletUI.query='';walletUI.category='all';updateWalletWorkspace('[data-wallet-tab="'+walletUI.tab+'"]');
    }
  });
}
