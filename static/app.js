const $ = id => document.getElementById(id);
let session = null, map = null, marker = null, circle = null, poller = null;
function initMap() {
  if (!window.L) { $('mapEmpty').textContent = 'Map library unavailable. Coordinates will still be shown.'; return; }
  map = L.map('map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
}
initMap();
$('createBtn').addEventListener('click', async () => {
  $('createBtn').disabled = true; $('message').textContent = 'Creating a temporary session…';
  try {
    const res = await fetch('/api/sessions', {method:'POST'});
    if (!res.ok) throw new Error('Could not create session');
    session = await res.json();
    $('shareUrl').value = new URL(session.share_url, location.href).href;
    $('sessionPanel').classList.remove('hidden');
    $('message').textContent = 'Link ready. Send it to the person who will choose whether to share.';
    poller = setInterval(refreshLocation, 2500); await refreshLocation();
  } catch(e) { $('message').textContent = e.message; }
  finally { $('createBtn').disabled = false; }
});
$('copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('shareUrl').value); }
  catch { $('shareUrl').select(); document.execCommand('copy'); }
  $('copyBtn').textContent = 'Copied!'; setTimeout(()=>$('copyBtn').textContent='Copy link',1600);
});
async function refreshLocation() {
  if (!session) return;
  try {
    const r = await fetch('/api/sessions/' + session.session_id + '/location', {headers:{'X-Owner-Key':session.owner_key}});
    if (!r.ok) { $('sharingStatus').textContent='Session ended'; clearInterval(poller); return; }
    const d = await r.json();
    $('sharingStatus').textContent = d.sharing ? 'Sharing live' : d.consent ? 'Sharing stopped' : 'Waiting for consent';
    const loc = d.location; if (!loc) return;
    $('mapEmpty').classList.add('hidden');
    $('coordinates').textContent = loc.latitude.toFixed(6) + ', ' + loc.longitude.toFixed(6);
    $('accuracy').textContent = loc.accuracy == null ? 'Not reported' : '±' + Math.round(loc.accuracy) + ' m';
    $('updated').textContent = new Date(loc.received_at * 1000).toLocaleTimeString();
    const p = [loc.latitude, loc.longitude];
    if (map) {
      if (!marker) { marker=L.marker(p).addTo(map); circle=L.circle(p,{radius:loc.accuracy||0,color:'#3d63f2'}).addTo(map); map.setView(p,15); }
      else { marker.setLatLng(p); circle.setLatLng(p).setRadius(loc.accuracy||0); }
    }
  } catch {}
}
$('revokeBtn').addEventListener('click', async () => {
  if (!session || !confirm('Revoke this link and clear the stored location?')) return;
  $('revokeBtn').disabled = true;
  try {
    const r = await fetch('/api/sessions/' + session.session_id + '/revoke',{method:'POST',headers:{'X-Owner-Key':session.owner_key}});
    if (!r.ok) throw new Error('Could not revoke session');
    clearInterval(poller); $('sharingStatus').textContent='Revoked';
    $('coordinates').textContent='—'; $('accuracy').textContent='—'; $('updated').textContent='—';
    $('mapEmpty').classList.remove('hidden'); $('mapEmpty').textContent='Session revoked. Location cleared.';
    $('revokeBtn').textContent='Link revoked'; $('message').textContent='Session revoked and stored location cleared.';
  } catch(e) { $('message').textContent=e.message; $('revokeBtn').disabled=false; }
});
