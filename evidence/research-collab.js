/* KIMSE Evidence private expert collaboration UI. Intentionally no patient/call identifiers. */
(() => {
  'use strict';
  const BASE = 'https://api-kimse.suaveforge.com/api/v1/evidence/research';
  const $ = id => document.getElementById(id);
  const STAT = {
    received: '접수', in_review: '검토 중', in_progress: '수정 중',
    ready_to_verify: '재검증 요청', verified: '전문가 확인',
    reopened: '재검토', closed: '종료'
  };
  const KIND = {issue:'오류 제보',improvement:'개선 요청',research:'연구 제안',validation:'검증 결과'};
  const TARGET = {
    general:'전체·공통','voice-self':'음성 자가테스트','voice-retell':'Retell AI 통화',
    eye:'눈 감김 분석',cognition:'인지 평가',report:'보고서·자료',other:'기타'
  };
  const OP = {
    received:['in_review','in_progress','closed'],in_review:['in_progress','ready_to_verify','closed'],
    in_progress:['ready_to_verify','closed'],ready_to_verify:['in_progress','closed'],
    reopened:['in_review','in_progress','ready_to_verify','closed'],
    verified:['in_progress','closed'],closed:['in_review']
  };
  const REVIEW = {ready_to_verify:['verified','reopened']};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fdate = s => {
    if (!s) return '';
    const d=new Date(s);
    return Number.isNaN(+d) ? '' : new Intl.DateTimeFormat('ko-KR',{
      timeZone:'Asia/Seoul',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'
    }).format(d);
  };
  const prettyBytes = n => n >= 1048576 ? (n/1048576).toFixed(1)+'MB' : Math.ceil(n/1024)+'KB';
  const TKEY='kimse-research-invite-v1';
  let token='',who=null,threads=[],selected='',current=null,threadRequest=0,detailRequest=0,toastTimer=0;
  let intentStatus='',sending=false,sourceTarget='',sourceOrigin='';
  const query = new URLSearchParams(location.search);
  sourceTarget = TARGET[query.get('target')] ? query.get('target') : 'general';
  sourceOrigin = /^[A-Za-z0-9_-]{1,80}$/.test(query.get('origin')||'') ? query.get('origin') : '';

  function toast(msg,bad=false){
    const b=$('toaster');b.textContent=msg;b.style.background=bad?'#973d37':'#193a39';b.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>b.hidden=true,4600);
  }
  async function api(path, opt={}){
    const headers={...(opt.headers||{})};
    if(token)headers['X-KIMSE-RESEARCH-TOKEN']=token;
    const response=await fetch(BASE+path,{...opt,headers,cache:'no-store'});
    if(!response.ok){
      const j=await response.json().catch(()=>({}));
      const details=typeof j.detail==='string'?j.detail:'HTTP '+response.status;
      const reasons={
        RESEARCH_INVITATION_REQUIRED:'초대받은 링크로 접속해야 합니다.',
        RESEARCH_INVITATION_INVALID:'이 초대 링크가 만료됐거나 사용이 중지됐습니다.',
        RESEARCH_OPERATOR_UNAUTHORIZED:'운영자 인증이 올바르지 않습니다.',
        RESEARCH_OPERATOR_UNCONFIGURED:'운영자 초대 발급 설정이 아직 준비되지 않았습니다.',
        RESEARCH_RATE_LIMIT:'짧은 시간에 등록할 수 있는 글 수를 초과했습니다.',
        RESEARCH_ATTACHMENT_TOO_LARGE:'첨부파일은 12MB 이하만 가능합니다.',
        RESEARCH_THREAD_ATTACHMENT_LIMIT:'게시글의 첨부 용량·개수 한도를 초과했습니다.',
        RESEARCH_ATTACHMENT_FILE_TYPE_INVALID:'선택한 파일의 실제 형식을 확인할 수 없습니다.',
        RESEARCH_ATTACHMENT_TYPE_NOT_ALLOWED:'이 형식은 첨부할 수 없습니다.',
        RESEARCH_STATUS_TRANSITION_NOT_ALLOWED:'현재 상태에서는 허용되지 않는 변경입니다.',
        RESEARCH_ORIGIN_NOT_ALLOWED:'공식 Evidence 사이트에서 열어주세요.'
      };
      const err=Error(reasons[details]||'서버 오류: '+details);err.status=response.status;throw err;
    }
    return response.status===204?null:response.json();
  }
  const json = (method,body)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

  function modal(id){const d=$(id);if(!d.open)d.showModal();return d;}
  function close(id){const d=$(id);if(d.open)d.close();}
  function gate(msg){$('app').hidden=true;$('gate').hidden=false;$('gate-status').textContent=msg||'연구 공간 연결을 확인해 주세요.';who=null;}

  async function createGuestSession(){
    const response=await fetch(BASE+'/guest-session',{method:'POST',cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok){
      const reason=response.status===429?'접속 요청이 많아 잠시 제한됐습니다. 잠시 뒤 다시 열어주세요.':
        result.detail==='RESEARCH_GUEST_ACCESS_DISABLED'?'현재 간편 접속이 중지됐습니다. 전문가 초대 링크를 사용해주세요.':
        '간편 접속에 실패했습니다. ('+response.status+')';
      throw Error(reason);
    }
    if(!result.token||result.role!=='guest')throw Error('접속 정보를 받지 못했습니다.');
    token=result.token;
    try{sessionStorage.setItem(TKEY,token);}catch(err){}
  }

  async function enter(){
    // Invite code is in URL fragment only, not in GET requests, Referer or server logs.
    const match=location.hash.match(/^#invite=([A-Za-z0-9_-]{32,128})$/);
    if(match){
      token=match[1];
      try{sessionStorage.setItem(TKEY,token);}catch(err){}
      history.replaceState(null,'',location.pathname+location.search);
    }else{
      try{token=sessionStorage.getItem(TKEY)||'';}catch(err){token='';}
    }
    $('gate-status').textContent='공동연구 공간에 연결하는 중입니다.';
    try{
      if(!token)await createGuestSession();
      try{who=await api('/session');}
      catch(err){
        if(err.status!==401||match)throw err;
        try{sessionStorage.removeItem(TKEY);}catch(e){}
        await createGuestSession();
        who=await api('/session');
      }
      $('gate').hidden=true;$('app').hidden=false;
      $('identity').textContent=who.name+' · '+who.affiliation+
        (who.role==='operator'?' · 운영자':who.role==='guest'?' · 간편 접속':'');
      $('new-thread').disabled=false;
      // The admin panel still enforces server-side operator authentication.
      $('manage-invites').hidden=false;
      $('board-list-heading').textContent=who.role==='guest'?'내 연구 기록':'연구 기록';
      $('guest-notice').hidden=who.role!=='guest';
      $('attachments-guide').textContent=who.role==='guest'?
        '최대 5개 · 파일당 8MB · 총 20MB. 다른 사용자의 비공개 자료는 볼 수 없습니다. 민감정보는 올리지 마세요.':
        '최대 5개 · 파일당 12MB · 총 36MB. 환자 식별정보·민감 자료는 업로드하지 마세요.';
      await loadThreads();
    }catch(err){
      try{sessionStorage.removeItem(TKEY);}catch(e){}
      token='';gate(err.message);
    }
  }
  async function issueInvite(){
    const secret=$('admin-secret').value;
    const name=$('invite-name').value.trim();
    const affiliation=$('invite-org').value.trim();
    const role=$('invite-role').value;
    if(!secret||name.length<2||affiliation.length<2){toast('인증 정보와 이름·소속을 입력해주세요.',true);return;}
    $('issue-invite').disabled=true;
    try{
      // No operator code is kept in local/session storage.
      const resp=await fetch(BASE+'/admin/invitations',{
        method:'POST',headers:{'Content-Type':'application/json','X-KIMSE-ADMIN-TOKEN':secret},
        body:JSON.stringify({name,affiliation,role}),cache:'no-store'
      });
      const value=await resp.json().catch(()=>({}));
      if(!resp.ok)throw Error(value.detail||'초대 발급 실패');
      $('invite-link').textContent=value.link;
      $('invite-output').hidden=false;
      toast('개별 초대 링크가 발급됐습니다. 보안 채널로 전달하세요.');
    }catch(err){toast(err.message,true);}
    finally{$('issue-invite').disabled=false;}
  }

  async function listInvites(){
    const secret=$('admin-secret').value;
    if(!secret){toast('초대 현황을 보려면 운영자 인증을 입력하세요.',true);return;}
    try{
      const response=await fetch(BASE+'/admin/invitations',{headers:{'X-KIMSE-ADMIN-TOKEN':secret},cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.detail||'초대 이력을 가져오지 못했습니다.');
      $('invite-history').hidden=false;
      $('invite-history').innerHTML=(data.items||[]).map(x=>
        '<div class="invite-entry"><div><strong>'+esc(x.name)+'</strong> · '+esc(x.affiliation)+
        '<small>'+esc(x.role==='operator'?'운영자':'연구 전문가')+' · '+esc(fdate(x.expires_at))+(x.revoked_at?' · 접근 차단':'')+'</small></div>'+
        (!x.revoked_at?'<button type="button" data-revoke="'+esc(x.id)+'">접근 차단</button>':'')+'</div>'
      ).join('')||'<div class="muted" style="font-size:12px">발급된 초대가 없습니다.</div>';
    }catch(err){toast(err.message,true);}
  }
  async function revokeInvite(id){
    if(!window.confirm('이 연구자의 게시판 접근을 중지할까요? 작성된 연구 기록은 보존됩니다.'))return;
    const secret=$('admin-secret').value;
    if(!secret){toast('운영자 인증을 다시 입력해주세요.',true);return;}
    try{
      const response=await fetch(BASE+'/admin/invitations/'+encodeURIComponent(id)+'/revoke',{
        method:'POST',headers:{'X-KIMSE-ADMIN-TOKEN':secret},cache:'no-store'});
      if(!response.ok)throw Error('접근 차단에 실패했습니다.');
      toast('초대 접근을 차단했습니다.');await listInvites();
    }catch(err){toast(err.message,true);}
  }
  function manageInvites(){
    $('app').hidden=true;$('gate').hidden=false;
    $('return-workspace').hidden=false;$('operator-panel').open=true;
    $('gate-status').textContent='운영자 전용 · 초대 링크는 연구자별로 발급됩니다.';
  }
  function returnWorkspace(){
    if(!who)return;
    $('admin-secret').value='';$('invite-output').hidden=true;$('invite-history').hidden=true;
    $('return-workspace').hidden=true;$('gate').hidden=true;$('app').hidden=false;
  }
  async function loadThreads(){
    if(!who)return;
    const args = new URLSearchParams({status:$('filter-status').value,kind:$('filter-kind').value});
    const seq=++threadRequest;
    try{
      const result=await api('/threads?'+args);
      if(seq!==threadRequest)return;
      threads=result.items||[];
      $('thread-count').textContent=threads.length+'건';
      renderList();
      if(selected){
        if(threads.some(t=>t.id===selected))await showThread(selected,false);
        else {selected='';current=null;renderEmpty();}
      }else if(threads.length)await showThread(threads[0].id,false);
    }catch(err){$('thread-list').innerHTML='<div class="empty">'+esc(err.message)+'</div>';}
  }
  function renderList(){
    if(!threads.length){$('thread-list').innerHTML='<div class="empty">아직 등록된 연구 의견이 없습니다.<div style="margin-top:8px">첫 의견을 등록해 검토를 시작하세요.</div></div>';return;}
    $('thread-list').innerHTML=threads.map(t=>
      '<button class="thread-row" type="button" data-thread="'+esc(t.id)+'" aria-selected="'+(selected===t.id)+'">'+
      '<span class="meta"><span>'+esc(t.id)+' · '+esc(KIND[t.kind]||t.kind)+'</span><span>'+esc(fdate(t.updatedAt))+'</span></span>'+
      '<strong>'+esc(t.title)+'</strong>'+
      '<span class="bottom"><span class="badge" data-state="'+esc(t.status)+'">'+esc(STAT[t.status]||t.status)+'</span> · '+
      esc(TARGET[t.target]||t.target)+' · '+esc(t.author)+
      (t.attachmentCount?' · 첨부 '+t.attachmentCount+'건':'')+'</span></button>'
    ).join('');
  }
  function renderEmpty(){
    $('thread-detail').innerHTML='<div class="empty">목록에서 의견을 선택하면 근거와 검토 이력을 확인할 수 있습니다.</div>';
  }
  async function showThread(id,mobile=true){
    if(!who)return;
    selected=id;
    const seq=++detailRequest;
    if(mobile)document.body.dataset.view='detail';
    renderList();
    $('thread-detail').innerHTML='<div class="empty">검토 기록 불러오는 중…</div>';
    try{
      const detail=await api('/threads/'+encodeURIComponent(id));
      if(seq!==detailRequest)return;
      current=detail;
      const actions=(who.role==='operator'?OP:REVIEW)[detail.status]||[];
      const eventHtml=(detail.events||[]).map(e=>
        '<div class="event"><div class="event-head">'+esc(e.author)+(e.role==='operator'?' · 운영자':' · 전문가')+
        ' · '+esc(fdate(e.createdAt))+'</div>'+
        (e.type==='status'?'<div class="status-change">'+esc(STAT[e.from]||e.from)+' → '+esc(STAT[e.to]||e.to)+'</div>':
        e.type==='created'?'<div class="status-change">의견 접수</div>':
        e.type==='file'?'<div class="status-change">근거 파일 첨부</div>':'')+
        '<div class="copy">'+esc(e.body)+'</div></div>'
      ).join('');
      const attachments=(detail.attachments||[]).map(f=>
        '<div class="attachment"><span>▤ &nbsp;'+esc(f.file_name)+' <span class="muted">· '+prettyBytes(f.bytes)+'</span></span>'+
        '<button type="button" data-download="'+esc(f.id)+'">다운로드</button></div>'
      ).join('');
      const statusActions=actions.map(s=>
        '<button type="button" class="'+(s==='verified'?'primary':'tertiary')+'" data-status="'+esc(s)+'">'+
        esc(s==='verified'?'검증 완료 확인':s==='reopened'?'재검토 요청':STAT[s])+'</button>'
      ).join('');
      $('thread-detail').innerHTML=
        '<div class="detail-meta"><span class="badge" data-state="'+esc(detail.status)+'">'+esc(STAT[detail.status])+'</span>'+
        '<span>'+esc(detail.id)+'</span><span>'+esc(KIND[detail.kind])+'</span><span>'+esc(TARGET[detail.target])+'</span></div>'+
        '<h2>'+esc(detail.title)+'</h2>'+
        '<p class="muted" style="font-size:12px;margin-bottom:15px">'+esc(detail.author)+' · '+esc(detail.affiliation)+' · '+esc(fdate(detail.createdAt))+'</p>'+
        '<p class="body">'+esc(detail.detail)+'</p>'+
        '<div class="section-title">첨부 근거 · '+(detail.attachments||[]).length+'개</div>'+
        '<div class="attachment-list">'+(attachments||'<div class="muted" style="font-size:12px">첨부 파일 없음</div>')+'</div>'+
        '<label class="secondary" style="margin-top:10px;cursor:pointer;font-size:11px">+ 근거 파일 추가'+
        '<input type="file" id="add-files" multiple hidden accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.mp4,.wav"></label>'+
        '<div class="section-title">검토 및 변경 이력</div>'+
        '<div>'+eventHtml+'</div>'+
        (statusActions?'<div class="section-title">다음 처리</div><div class="review-actions">'+statusActions+'</div>':'')+
        '<form id="reply-form" class="reply"><div class="field"><label for="reply-body">추가 의견 또는 검증 기록</label>'+
        '<textarea id="reply-body" maxlength="4000" minlength="2" required placeholder="판단 근거, 재현 결과, 수정 후 확인한 내용을 남겨주세요."></textarea></div>'+
        '<div class="buttons"><span class="muted" style="font-size:11px">작성자·시간이 검토 이력에 남습니다.</span><button class="primary" type="submit">기록 남기기</button></div></form>';
      $('reply-form').addEventListener('submit',submitReply);
      $('add-files').addEventListener('change',async e=>{
        const files=Array.from(e.target.files||[]);
        if(!files.length)return;
        if(!validateFiles(files,(detail.attachments||[]).length))return;
        try{await uploadFiles(id,files);toast('근거 파일이 추가됐습니다.');await loadThreads();}
        catch(err){toast(err.message,true);}
      });
      renderList();
    }catch(err){$('thread-detail').innerHTML='<div class="empty">'+esc(err.message)+'</div>';}
  }
  async function submitReply(e){
    e.preventDefault();
    const value=$('reply-body').value.trim();
    if(value.length<2||!current)return;
    const submit=e.target.querySelector('[type=submit]');submit.disabled=true;
    try{
      await api('/threads/'+current.id+'/comments',json('POST',{body:value}));
      toast('검토 기록이 등록됐습니다.');await loadThreads();
    }catch(err){toast(err.message,true);}
    finally{submit.disabled=false;}
  }
  function validateFiles(files,already=0){
    const allowed=/\.(png|jpe?g|webp|pdf|docx|txt|mp4|wav)$/i;
    const guest=who?.role==='guest',perFile=guest?8:12,totalLimit=guest?20:36;
    if(files.length+already>5){toast('첨부 파일은 게시글당 5개까지 가능합니다.',true);return false;}
    if(files.some(f=>f.size>perFile*1048576||!allowed.test(f.name))){
      toast('허용한 형식과 파일당 '+perFile+'MB 이하 조건을 확인해주세요.',true);return false;
    }
    const total=files.reduce((s,f)=>s+f.size,0);
    if(total>totalLimit*1048576){toast('첨부파일은 총 '+totalLimit+'MB 이하여야 합니다.',true);return false;}
    return true;
  }
  async function uploadFiles(id,files){
    for(let i=0;i<files.length;i++){
      const f=files[i];
      toast('파일 업로드 중 · '+(i+1)+'/'+files.length);
      await api('/threads/'+encodeURIComponent(id)+'/attachments',{
        method:'POST',headers:{'Content-Type':'application/octet-stream',
          'X-Research-Filename':encodeURIComponent(f.name)},body:f
      });
    }
  }
  function openCompose(){
    if(!who)return;
    $('compose-form').reset();
    $('post-target').value=sourceTarget;
    $('post-error').hidden=true;$('file-preview').textContent='';
    modal('compose');$('post-title').focus();
  }
  async function submitPost(e){
    e.preventDefault();
    if(sending)return;
    const files=Array.from($('post-files').files||[]);
    if(!validateFiles(files))return;
    const title=$('post-title').value.trim(),detail=$('post-detail').value.trim();
    if(title.length<5||detail.length<12){toast('제목과 검토 내용을 조금 더 구체적으로 입력해주세요.',true);return;}
    sending=true;$('submit-post').disabled=true;$('post-error').hidden=true;
    let createdId='';
    try{
      const result=await api('/threads',json('POST',{
        kind:$('post-kind').value,target:$('post-target').value,title,detail,
        context:sourceOrigin?{origin:sourceOrigin}:{}
      }));
      createdId=result.id;
      if(files.length)await uploadFiles(createdId,files);
      close('compose');toast('연구 의견을 접수하고 이력을 생성했습니다.');
      await loadThreads();await showThread(createdId);
    }catch(err){
      const note=createdId?('의견 '+createdId+'은 접수됐지만 일부 파일 첨부가 실패했습니다. 해당 글에서 다시 첨부할 수 있습니다.'):err.message;
      $('post-error').hidden=false;$('post-error').textContent=note;
      if(createdId)await loadThreads();
    }finally{sending=false;$('submit-post').disabled=false;}
  }
  function askStatus(next){
    if(!current)return;
    intentStatus=next;
    $('status-heading').textContent=next==='verified'?'수정 결과 확인':next==='reopened'?'재검증 결과 · 재검토 요청':'검토 상태 변경';
    $('status-description').textContent=next==='ready_to_verify'?'개발자가 수정한 내용과 검증 방법을 적고 전문가에게 재검증을 요청합니다.':
      next==='verified'?'전문가가 확인한 테스트 조건과 검증 결과를 적습니다.':
      next==='reopened'?'재현된 문제와 아직 해결되지 않은 점을 적습니다.':
      '처리 상태를 '+(STAT[next]||next)+'으로 변경하는 이유를 기록합니다.';
    $('status-rationale').value='';modal('status-dialog');
    $('status-rationale').focus();
  }
  async function commitStatus(e){
    e.preventDefault();if(!current||!intentStatus)return;
    const rationale=$('status-rationale').value.trim();if(rationale.length<3)return;
    const submit=e.target.querySelector('[type=submit]');submit.disabled=true;
    try{
      await api('/threads/'+current.id+'/status',json('POST',{status:intentStatus,rationale}));
      close('status-dialog');toast('검토 상태와 판단 근거가 기록됐습니다.');
      await loadThreads();
    }catch(err){toast(err.message,true);}
    finally{submit.disabled=false;}
  }
  async function downloadFile(id){
    if(!token)return;
    try{
      const response=await fetch(BASE+'/attachments/'+encodeURIComponent(id),
        {headers:{'X-KIMSE-RESEARCH-TOKEN':token},cache:'no-store'});
      if(!response.ok)throw Error('첨부파일을 가져올 수 없습니다.');
      const data=await response.blob();
      const listed=current?.attachments?.find(x=>x.id===id);
      const blobUrl=URL.createObjectURL(data),a=document.createElement('a');
      a.href=blobUrl;a.download=listed?.file_name||'research-attachment';document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
    }catch(err){toast(err.message,true);}
  }
  function delegate(e){
    const item=e.target.closest('[data-thread]');
    if(item){showThread(item.dataset.thread);return;}
    const dl=e.target.closest('[data-download]');
    if(dl){downloadFile(dl.dataset.download);return;}
    const st=e.target.closest('[data-status]');
    if(st){askStatus(st.dataset.status);return;}
    const cl=e.target.closest('[data-close]');
    if(cl)close(cl.dataset.close);
  }

  document.addEventListener('click',delegate);
  $('issue-invite').addEventListener('click',issueInvite);
  $('list-invites').addEventListener('click',listInvites);
  $('manage-invites').addEventListener('click',manageInvites);
  $('return-workspace').addEventListener('click',returnWorkspace);
  $('invite-history').addEventListener('click',e=>{
    const b=e.target.closest('[data-revoke]');if(b)revokeInvite(b.dataset.revoke);
  });
  $('copy-invite').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('invite-link').textContent);toast('초대 링크를 복사했습니다.');}
    catch(err){toast('복사 권한이 없어 링크를 직접 선택해야 합니다.',true);}
  });
  $('new-thread').addEventListener('click',openCompose);
  $('compose-form').addEventListener('submit',submitPost);
  $('status-form').addEventListener('submit',commitStatus);
  $('filter-status').addEventListener('change',()=>{selected='';loadThreads();});
  $('filter-kind').addEventListener('change',()=>{selected='';loadThreads();});
  $('back-list').addEventListener('click',()=>document.body.dataset.view='list');
  $('post-files').addEventListener('change',e=>{
    const files=Array.from(e.target.files||[]);
    $('file-preview').textContent=files.map(f=>f.name+' ('+prettyBytes(f.size)+')').join(' · ');
    validateFiles(files);
  });
  for(const id of ['compose','status-dialog']){
    $(id).addEventListener('click',e=>{if(e.target===$(id))close(id);});
  }
  enter();
})();
