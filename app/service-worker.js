const CACHE = 'kimse-pwa-20260923-release46-evidence-questions';
const CORE = [
  './',
  './index.html',
  './app.css',
  './capture-polish.css',
  './accessibility-enhancements.css',
  './premium-ux.css',
  './govtech-p0.css',
  './app.js',
  './native-bridge.js',
  './authhub.js',
  './push.js',
  './accessibility-enhancements.js',
  './premium-ux.js',
  './govtech-p0.js',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable-source.svg'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE).then(c => c.put(event.request, copy));
    return resp;
  }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html'))));
});
self.addEventListener('push', event => {
  let data={};
  try{data=event.data?event.data.json():{}}catch{try{data={body:event.data?.text()||''}}catch{}}
  const title=data.title||'낌새 · 최근 변화가 보여요';
  const options={
    body:data.body||'평소와 다른 변화가 함께 관찰되었습니다.',
    icon:'./assets/icons/icon.svg',
    badge:'./assets/icons/icon.svg',
    tag:data.tag||('kimse-change-'+(data.alert_id||'latest')),
    renotify:false,
    data:{url:data.url||'./#/monitoring-status',alert_id:data.alert_id||null,kind:data.kind||'CHANGE_ALERT'}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target=new URL(event.notification?.data?.url||'./#/monitoring-status',self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('navigate'in client){try{await client.navigate(target)}catch{}}
      if('focus'in client)return client.focus();
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  })());
});
