import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:8787';
const api = async (path, actor = 'me', body) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'X-Flex-Dev-User': actor, 'Content-Type': 'application/json' }, ...(body ? {body:JSON.stringify(body)} : {}) });
const rooms = async actor => (await (await api('/rooms', actor)).json()).rooms;
const history = async room => (await (await api(`/rooms/${room}/messages`)).json()).messages;
const open = (room, actor) => new Promise((resolve, reject) => {
 const ws = new WebSocket(`${base.replace('http','ws')}/rooms/${room}/ws?devActor=${actor}`);
 ws.addEventListener('open', () => resolve(ws), {once:true}); ws.addEventListener('error',reject,{once:true});
});
const next = ws => new Promise((resolve,reject) => { const t = setTimeout(()=>reject(Error('message timeout')),5000); ws.addEventListener('message',e=>{clearTimeout(t);resolve(JSON.parse(e.data));},{once:true}); });
assert.equal((await rooms('me')).length,8);
assert.ok((await rooms('kim')).every(r=>r.members.includes('kim')));
assert.equal((await api('/rooms/rnd/messages','kim')).status,403);
assert.equal((await api('/rooms/rnd/read','kim',{messageId:'fixture-rnd-01'})).status,403);
const [a,b,c] = await Promise.all([open('all','me'),open('all','kim'),open('sales','kim')]);
try {
 let outsider = false; c.addEventListener('message',()=>outsider=true);
 const beforeMe = (await rooms('me')).find(r=>r.id==='all').unreadCount;
 const beforeKim = (await rooms('kim')).find(r=>r.id==='all').unreadCount;
 const pa=next(a),pb=next(b); a.send(JSON.stringify({type:'message.create',body:`검증 ${Date.now()}`}));
 const [ea,eb]=await Promise.all([pa,pb]); assert.deepEqual(ea,eb);
 assert.equal((await rooms('me')).find(r=>r.id==='all').unreadCount,beforeMe);
 assert.equal((await rooms('kim')).find(r=>r.id==='all').unreadCount,beforeKim+1);
 assert.equal((await api('/rooms/all/read','kim',{messageId:ea.message.id})).status,200);
 assert.equal((await rooms('kim')).find(r=>r.id==='all').unreadCount,0);
 await api('/rooms/all/read','kim',{messageId:'fixture-all-01'});
 assert.equal((await rooms('kim')).find(r=>r.id==='all').unreadCount,0,'cursor cannot move backwards');
 assert.equal((await api('/rooms/all/read','me',{messageId:'fixture-rnd-01'})).status,400);
 assert.ok((await history('all')).some(m=>m.id===ea.message.id));
 a.close(); const reconnected=await open('all','me'); reconnected.close();
 await new Promise(resolve=>setTimeout(resolve,250)); assert.equal(outsider,false);
 console.log('PASS: 8 rooms, actor membership, history, 2-client broadcast, room isolation, reconnect, unread increment, own-message exclusion, read reset, monotonic cursor, cross-room cursor rejection.');
} finally { a.close();b.close();c.close(); }
