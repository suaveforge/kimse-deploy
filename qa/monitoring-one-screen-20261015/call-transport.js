(()=>{'use strict';

function emit(target,type,detail={}){target.dispatchEvent(new CustomEvent(type,{detail}))}
function ensureJsSip(){
  if(!window.JsSIP)throw new Error('JSSIP_UNAVAILABLE');
}
function audioElement(){
  let el=document.querySelector('audio[data-kimse-call-remote]');
  if(!el){
    el=document.createElement('audio');
    el.dataset.kimseCallRemote='1';
    el.autoplay=true;el.playsInline=true;el.setAttribute('playsinline','');el.setAttribute('webkit-playsinline','');
    el.style.display='none';document.body.appendChild(el);
  }
  return el;
}

class KimseCallPhone extends EventTarget{
  constructor(){
    super();
    this.ua=null;this.session=null;this.config=null;this.callSessionId='';
    this.registered=false;this.confirmed=false;this.startedAt=0;
    this.remoteStream=null;this.remoteTimer=null;this.boundPeerConnections=[];
    this.recorder=null;this.recordChunks=[];this.recordAudioContext=null;this.recordDestination=null;this.recordSources=[];
    this.analysisRecorder=null;this.analysisChunks=[];
  }
  async configure(config,callSessionId){
    ensureJsSip();
    if(!config?.sipUri||!config?.sipSecret||!config?.websocketUrl)throw new Error('CALL_PHONE_CONFIG_INVALID');
    this.stop();
    this.config=config;this.callSessionId=String(callSessionId||'');
    const socket=new window.JsSIP.WebSocketInterface(config.websocketUrl);
    this.ua=new window.JsSIP.UA({
      sockets:[socket],uri:config.sipUri,password:config.sipSecret,
      register:true,register_expires:120,session_timers:false,
      display_name:config.username||config.extension||'KIMSE'
    });
    this.ua.on('connected',()=>emit(this,'transport',{state:'connected'}));
    this.ua.on('disconnected',event=>{this.registered=false;emit(this,'transport',{state:'disconnected',cause:event?.cause||event?.reason||''})});
    this.ua.on('registered',()=>{this.registered=true;emit(this,'registered',{extension:config.extension})});
    this.ua.on('unregistered',()=>{this.registered=false;emit(this,'unregistered',{})});
    this.ua.on('registrationFailed',event=>{this.registered=false;emit(this,'error',{code:'REGISTRATION_FAILED',cause:event?.cause||''})});
    this.ua.on('newRTCSession',data=>this.handleSession(data.session,data.originator));
    this.ua.start();
    return this.waitUntilRegistered();
  }
  waitUntilRegistered(timeoutMs=15000){
    if(this.registered)return Promise.resolve(true);
    return new Promise((resolve,reject)=>{
      const started=Date.now(),timer=setInterval(()=>{
        if(this.registered){clearInterval(timer);resolve(true);return}
        if(Date.now()-started>=timeoutMs){clearInterval(timer);reject(new Error('CALL_REGISTER_TIMEOUT'))}
      },200);
    });
  }
  incomingSessionId(session){
    try{return String(session?.request?.getHeader?.('X-KIMSE-Session')||'').trim()}catch{return ''}
  }
  handleSession(session,originator){
    if(this.session&&this.session!==session){try{session.terminate({status_code:486,reason_phrase:'Busy Here'})}catch{}return}
    const incoming=originator==='remote',incomingId=incoming?this.incomingSessionId(session):this.callSessionId;
    if(incoming&&this.callSessionId&&incomingId&&incomingId!==this.callSessionId){
      try{session.terminate({status_code:403,reason_phrase:'KIMSE Session Mismatch'})}catch{}
      return;
    }
    this.session=session;this.confirmed=false;this.startedAt=0;
    this.attachRemoteMedia(session);
    session.on('progress',()=>emit(this,'progress',{incoming,callSessionId:incomingId||this.callSessionId}));
    session.on('accepted',()=>this.onAccepted(incomingId));
    session.on('confirmed',()=>this.onAccepted(incomingId));
    session.on('ended',data=>this.finish(data?.cause||'ended',false));
    session.on('failed',data=>this.finish(data?.cause||'failed',true));
    if(incoming)emit(this,'incoming',{callSessionId:incomingId||this.callSessionId});
    else emit(this,'outgoing',{callSessionId:this.callSessionId});
  }
  onAccepted(incomingId){
    if(!this.startedAt)this.startedAt=Date.now();
    this.confirmed=true;
    this.syncRemoteReceivers(this.session?.connection);
    this.playRemoteAudio(false);
    emit(this,'active',{callSessionId:incomingId||this.callSessionId,startedAt:this.startedAt});
  }
  bindPeerConnection(pc){
    if(!pc||this.boundPeerConnections.includes(pc))return;
    this.boundPeerConnections.push(pc);
    const onTrack=event=>{
      const stream=event.streams&&event.streams.length?event.streams[0]:null;
      this.attachRemoteStream(stream,event.track);
    };
    if(pc.addEventListener){
      pc.addEventListener('track',onTrack);
      pc.addEventListener('addstream',event=>this.attachRemoteStream(event.stream));
      pc.addEventListener('connectionstatechange',()=>this.syncRemoteReceivers(pc));
      pc.addEventListener('iceconnectionstatechange',()=>this.syncRemoteReceivers(pc));
    }else pc.ontrack=onTrack;
    this.syncRemoteReceivers(pc);
  }
  attachRemoteMedia(session){
    this.clearRemoteTimer();this.remoteStream=null;this.boundPeerConnections=[];
    if(session?.on)session.on('peerconnection',data=>this.bindPeerConnection(data?.peerconnection||session.connection));
    this.bindPeerConnection(session?.connection);
    const start=Date.now();
    this.remoteTimer=setInterval(()=>{
      if(!this.session||this.session!==session||Date.now()-start>20000){this.clearRemoteTimer();return}
      this.bindPeerConnection(session.connection);this.syncRemoteReceivers(session.connection);
    },250);
  }
  attachRemoteStream(stream,track){
    let selected=stream;
    if(!selected&&track&&window.MediaStream)selected=new window.MediaStream([track]);
    if(!selected)return;
    if(track&&selected.getTracks&&!selected.getTracks().includes(track)&&selected.addTrack){try{selected.addTrack(track)}catch{}}
    this.remoteStream=selected;
    const audio=audioElement();
    if(audio.srcObject!==selected){try{audio.pause()}catch{}audio.srcObject=selected}
    this.playRemoteAudio(false);
    emit(this,'remote-stream',{stream:selected});
  }
  syncRemoteReceivers(pc){
    if(!pc?.getReceivers||!window.MediaStream)return;
    const tracks=pc.getReceivers().map(r=>r?.track).filter(t=>t&&t.kind==='audio'&&t.readyState!=='ended');
    if(!tracks.length)return;
    let stream=this.remoteStream;
    if(!stream?.getTracks)stream=new window.MediaStream();
    tracks.forEach(track=>{if(!stream.getTracks().includes(track)){try{stream.addTrack(track)}catch{}}});
    this.attachRemoteStream(stream);
  }
  playRemoteAudio(userInitiated=false){
    const audio=audioElement();
    if(!audio.srcObject)return Promise.resolve(false);
    audio.muted=false;audio.volume=1;audio.autoplay=true;
    let p;try{p=audio.play()}catch(error){emit(this,'audio-blocked',{error,userInitiated});return Promise.resolve(false)}
    if(!p?.then)return Promise.resolve(true);
    return p.then(()=>true).catch(error=>{emit(this,'audio-blocked',{error,userInitiated});return false});
  }
  resumeRemoteAudio(){this.syncRemoteReceivers(this.session?.connection);return this.playRemoteAudio(true)}
  localAudioStream(){
    const pc=this.session?.connection;
    if(!pc?.getSenders||!window.MediaStream)return null;
    const tracks=pc.getSenders().map(s=>s?.track).filter(t=>t&&t.kind==='audio'&&t.readyState!=='ended');
    return tracks.length?new window.MediaStream(tracks):null;
  }
  async startMixedRecording(){
    if(this.recorder&&this.recorder.state==='recording')return true;
    if(!window.MediaRecorder)throw new Error('MEDIARECORDER_UNAVAILABLE');
    const local=this.localAudioStream(),remote=this.remoteStream;
    if(!local?.getAudioTracks().length||!remote?.getAudioTracks().length)throw new Error('CALL_AUDIO_STREAM_NOT_READY');
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)throw new Error('AUDIOCONTEXT_UNAVAILABLE');
    const ctx=new AC(),dest=ctx.createMediaStreamDestination(),sources=[];
    for(const stream of [local,remote]){
      const src=ctx.createMediaStreamSource(stream);src.connect(dest);sources.push(src);
    }
    const preferred=['audio/webm;codecs=opus','audio/webm','audio/mp4'];
    const mime=preferred.find(x=>!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(x))||'';
    this.recordChunks=[];this.recordAudioContext=ctx;this.recordDestination=dest;this.recordSources=sources;
    this.recorder=new MediaRecorder(dest.stream,mime?{mimeType:mime}:undefined);
    this.recorder.ondataavailable=e=>{if(e.data?.size)this.recordChunks.push(e.data)};
    this.recorder.start(1000);
    emit(this,'recording',{state:'started',mimeType:this.recorder.mimeType});
    return true;
  }
  stopMixedRecording(){
    if(!this.recorder||this.recorder.state==='inactive')return Promise.resolve(null);
    return new Promise(resolve=>{
      const recorder=this.recorder;
      recorder.addEventListener('stop',async()=>{
        const blob=new Blob(this.recordChunks,{type:recorder.mimeType||'audio/webm'});
        this.recordChunks=[];this.recorder=null;
        for(const src of this.recordSources){try{src.disconnect()}catch{}}
        this.recordSources=[];try{await this.recordAudioContext?.close()}catch{}
        this.recordAudioContext=null;this.recordDestination=null;
        emit(this,'recording',{state:'stopped',blob});
        resolve(blob);
      },{once:true});
      recorder.stop();
    });
  }
  async startLocalAnalysisRecording(){
    if(this.analysisRecorder&&this.analysisRecorder.state==='recording')return true;
    if(!window.MediaRecorder)throw new Error('MEDIARECORDER_UNAVAILABLE');
    const local=this.localAudioStream();
    if(!local?.getAudioTracks().length)throw new Error('LOCAL_AUDIO_STREAM_NOT_READY');
    const preferred=['audio/webm;codecs=opus','audio/webm','audio/mp4'];
    const mime=preferred.find(x=>!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(x))||'';
    this.analysisChunks=[];
    this.analysisRecorder=new MediaRecorder(local,mime?{mimeType:mime}:undefined);
    this.analysisRecorder.ondataavailable=e=>{if(e.data?.size)this.analysisChunks.push(e.data)};
    this.analysisRecorder.start(1000);
    emit(this,'analysis-recording',{state:'started',scope:'self-local-track',rawRetention:'ephemeral'});
    return true;
  }
  stopLocalAnalysisRecording(){
    if(!this.analysisRecorder||this.analysisRecorder.state==='inactive')return Promise.resolve(null);
    return new Promise(resolve=>{
      const recorder=this.analysisRecorder;
      recorder.addEventListener('stop',()=>{
        const blob=new Blob(this.analysisChunks,{type:recorder.mimeType||'audio/webm'});
        this.analysisChunks=[];this.analysisRecorder=null;
        emit(this,'analysis-recording',{state:'stopped',scope:'self-local-track',rawRetention:'discard-after-feature-extraction'});
        resolve(blob);
      },{once:true});
      recorder.stop();
    });
  }
  call(uri){
    if(!this.ua||!this.registered)throw new Error('CALL_PHONE_NOT_REGISTERED');
    const headers=this.callSessionId?['X-KIMSE-Session: '+this.callSessionId]:[];
    this.ua.call(uri,{
      extraHeaders:headers,
      mediaConstraints:{audio:true,video:false},
      pcConfig:{iceServers:this.config?.iceServers||[]},
      rtcOfferConstraints:{offerToReceiveAudio:true,offerToReceiveVideo:false}
    });
  }
  answer(){
    if(!this.session||this.confirmed)return;
    this.session.answer({mediaConstraints:{audio:true,video:false},pcConfig:{iceServers:this.config?.iceServers||[]}});
  }
  reject(){if(this.session)try{this.session.terminate({status_code:486,reason_phrase:'Busy Here'})}catch{}}
  hangup(){if(this.session)try{this.session.terminate()}catch{}}
  toggleMute(){
    if(!this.session)return false;
    const muted=!!this.session.isMuted?.().audio;
    if(muted)this.session.unmute({audio:true});else this.session.mute({audio:true});
    return !muted;
  }
  elapsedSeconds(){return this.startedAt?Math.max(0,Math.floor((Date.now()-this.startedAt)/1000)):0}
  async finish(cause,failed){
    const [blob,analysisBlob]=await Promise.all([
      this.stopMixedRecording().catch(()=>null),
      this.stopLocalAnalysisRecording().catch(()=>null)
    ]);
    this.clearRemoteTimer();
    const audio=audioElement();try{audio.pause()}catch{}audio.srcObject=null;
    this.session=null;this.confirmed=false;this.startedAt=0;this.remoteStream=null;this.boundPeerConnections=[];
    emit(this,'ended',{cause:String(cause||''),failed:!!failed,recording:blob,analysisRecording:analysisBlob});
  }
  clearRemoteTimer(){if(this.remoteTimer)clearInterval(this.remoteTimer);this.remoteTimer=null}
  stop(){
    this.clearRemoteTimer();
    if(this.recorder&&this.recorder.state!=='inactive'){try{this.recorder.stop()}catch{}}
    if(this.analysisRecorder&&this.analysisRecorder.state!=='inactive'){try{this.analysisRecorder.stop()}catch{}}
    if(this.session){try{this.session.terminate()}catch{}}
    if(this.ua){try{this.ua.stop()}catch{}}
    this.ua=null;this.session=null;this.config=null;this.callSessionId='';this.registered=false;this.confirmed=false;this.startedAt=0;this.remoteStream=null;this.boundPeerConnections=[];
    const audio=document.querySelector('audio[data-kimse-call-remote]');if(audio){try{audio.pause()}catch{}audio.srcObject=null}
  }
}
window.KIMSECallPhone=KimseCallPhone;
})();