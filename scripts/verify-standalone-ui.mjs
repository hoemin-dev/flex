import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({headless:true,channel:'msedge'});
await mkdir('artifacts/flex-standalone',{recursive:true});
const page=await browser.newPage({viewport:{width:360,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://localhost:1420');
 await page.getByRole('button',{name:'전체',exact:true}).waitFor();
 await page.screenshot({path:'artifacts/flex-standalone/rooms-360.png'});
 await page.getByRole('button',{name:'전체',exact:true}).click();
 await page.getByText('실시간 연결됨',{exact:false}).waitFor();
 const input=page.getByRole('textbox',{name:/메시지 작성/});
 const body='UI 검증 '+Date.now()+' https://example.com/'+ 'longEnglish'.repeat(55)+'\n한글 줄바꿈 확인';
 await input.fill(body);await input.press('Enter');
 await page.locator('article p').filter({hasText:body}).waitFor();
 await page.waitForFunction(()=>document.querySelector('textarea').value==='');
 for(const [width,height] of [[320,800],[360,800],[400,800],[360,360],[1280,800]]) {
  await page.setViewportSize({width,height});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('.message-list').evaluate(el=>el.scrollWidth<=el.clientWidth));
  const box=await page.getByRole('button',{name:'메시지 보내기'}).boundingBox();
  assert.ok(box.y+box.height<=height);
  assert.ok(await page.locator('.standalone').evaluate(el=>el.clientWidth<=360));
  await page.screenshot({path:`artifacts/flex-standalone/chat-${width}x${height}.png`});
 }
 await page.getByRole('button',{name:'방 목록으로 돌아가기'}).click();
 await page.getByRole('combobox',{name:'개발 사용자'}).selectOption('kim');
 await page.getByRole('button',{name:'전체',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'연구개발',exact:true}).count(),0);
 await page.getByRole('button',{name:'전체',exact:true}).click();
 await page.locator('article p').filter({hasText:body}).waitFor();
 await page.waitForTimeout(500);
 const state=await page.evaluate(async()=> (await (await fetch('http://localhost:8787/rooms',{headers:{'X-Flex-Dev-User':'kim'}})).json()).rooms);
 assert.equal(state.find(r=>r.id==='all').unreadCount,0);
 // A message in another room reaches the list through actor-scoped polling.
 const before=state.find(r=>r.id==='sales').unreadCount;
 const sender=new WebSocket('ws://127.0.0.1:8787/rooms/sales/ws?devActor=me');
 await new Promise((resolve,reject)=>{sender.addEventListener('open',resolve,{once:true});sender.addEventListener('error',reject,{once:true});});
 const confirmed=new Promise(resolve=>sender.addEventListener('message',resolve,{once:true}));
 sender.send(JSON.stringify({type:'message.create',body:'다른 방 unread UI 검증 '+Date.now()}));await confirmed;sender.close();
 await page.getByRole('button',{name:'방 목록으로 돌아가기'}).click();
 await page.getByRole('button',{name:'영업',exact:true}).getByLabel(`${before+1}개 안 읽음`).waitFor();
 // Controlled browser fixtures stress long labels, large badges and 60 messages.
 const longName='매우 긴 연구개발 대화방 이름 '.repeat(6);
 await page.route('**/rooms',route=>route.fulfill({json:{rooms:[{id:'all',name:longName,members:['kim'],unreadCount:12345,lastMessage:'미리보기'.repeat(100)}]}}));
 const many=Array.from({length:60},(_,i)=>({id:`stress-${i}`,sequence:i+1,roomId:'all',senderId:'aVeryLongUserName'.repeat(8),type:'text',body:`메시지 ${i} `+'longURL'.repeat(25),createdAt:'2026-09-09T00:00:00Z'}));
 await page.route('**/rooms/all/messages',route=>route.fulfill({json:{messages:many}}));
 await page.route('**/rooms/all/read',route=>route.fulfill({json:{ok:true}}));
 const connections=[];
 await page.routeWebSocket(/\/rooms\/all\/ws(?:\?.*)?$/,ws=>{const record={ws,closed:false};connections.push(record);ws.onClose(()=>record.closed=true);});
 await page.reload();await page.getByRole('button',{name:longName,exact:true}).waitFor();
 for(const width of [320,360,400]) {
  await page.setViewportSize({width,height:360});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.getByRole('button',{name:longName,exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('article.message').length===60);
 connections.at(-1).ws.send(JSON.stringify({event:'message.created',message:many[59]}));
 await page.waitForTimeout(100);assert.equal(await page.locator('article.message').count(),60);
 assert.ok(await page.locator('.message-list').evaluate(el=>el.scrollWidth<=el.clientWidth));
 await page.screenshot({path:'artifacts/flex-standalone/stress-400x360.png'});
 connections.at(-1).ws.close({code:1011,reason:'reconnect test'});
 await page.getByText('다시 연결 중',{exact:false}).waitFor();
 await page.getByText('실시간 연결됨',{exact:false}).waitFor();
 await page.getByRole('button',{name:'방 목록으로 돌아가기'}).click();
 await page.waitForTimeout(100);assert.ok(connections.every(c=>c.closed));
 assert.deepEqual(errors,[]);
 console.log('PASS: live Worker UI send/history, actor switch/membership/read, 320/360/400/1280 widths, short viewport, long URL/wrapping, composer bounds, screenshots.');
} finally {await browser.close();}
