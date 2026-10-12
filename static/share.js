const $ = id => document.getElementById(id);
const token = location.pathname.split('/').filter(Boolean).pop();
let watchId = null, active = false;
function setStatus(text) { $('status').textContent = text; }
async function post(action, body) {
  const r = await fetch('/api/share/' + encodeURIComponent(token) + '/' + action, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined
  });
  const d = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(d.detail || 'Request failed');
  return d;
}
$('startBtn').addEventListener('click', async () => {
  if (!navigator.geolocation) { setStatus('This browser does not support geolocation.'); return; }
  $('startBtn').disabled = true;
  try {
    await post('start'); active = true; $('stopBtn').classList.remove('hidden');
    setStatus('Consent recorded. Waiting for browser location permission…');
    watchId = navigator.geolocation.watchPosition(async pos => {
      if (!active) return;
      const data = {latitude:pos.coords.latitude, longitude:pos.coords.longitude, accuracy:pos.coords.accuracy, captured_at:Math.floor(pos.timestamp/1000)};
      try {
        await post('location',data);
        $('coords').textContent='Last sent: '+data.latitude.toFixed(5)+', '+data.longitude.toFixed(5)+' (±'+Math.round(data.accuracy)+' m)';
        setStatus('Sharing is active. You can stop at any time.');
      } catch(e) { setStatus(e.message); stopLocal(false); }
    }, err => {
      const msgs={1:'Location permission denied. Nothing more will be sent.',2:'Location unavailable. Check location services.',3:'Location request timed out. Try again.'};
      setStatus(msgs[err.code] || 'Could not get location.'); stopLocal(true);
    }, {enableHighAccuracy:true, maximumAge:5000, timeout:20000});
  } catch(e) { setStatus(e.message); $('startBtn').disabled=false; }
});
async function stopLocal(sendStop) {
  active=false; if (watchId!==null) navigator.geolocation.clearWatch(watchId); watchId=null;
  $('startBtn').disabled=false; $('stopBtn').classList.add('hidden');
  if (sendStop) { try { await post('stop'); } catch {} }
}
$('stopBtn').addEventListener('click', async () => {
  await stopLocal(true); setStatus('Sharing stopped. No further updates will be sent.');
});
window.addEventListener('pagehide', () => {
  if (watchId!==null) navigator.geolocation.clearWatch(watchId);
  if (active) navigator.sendBeacon('/api/share/'+encodeURIComponent(token)+'/stop');
});
