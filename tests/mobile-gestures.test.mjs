import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [code,html,mobile,lightbox,sw,workflow]=await Promise.all([
  read('mobile-gestures.js'),read('index.html'),read('mobile-polish.css'),
  read('lightbox.js'),read('service-worker.js'),read('.github/workflows/deploy-pages.yml')
]);

function simulation(matches=true){
  const handlers=new Map();
  const context={
    window:{matchMedia(query){assert.equal(query,'(max-width: 920px) and (pointer: coarse)');return {matches};}},
    document:{addEventListener(name,fn,options){handlers.set(name,{fn,options});}}
  };
  vm.runInNewContext(code,context);
  function event(name,touches,cancelable=true){
    let prevented=false;
    const e={touches,cancelable,preventDefault(){prevented=true;}};
    handlers.get(name)?.fn(e);
    return prevented;
  }
  return {handlers,event};
}

test('phone pinch zoom is disabled, while regular one-finger scrolling stays native',()=>{
  const ui=simulation(true);
  assert.ok(ui.handlers.has('touchstart'));
  assert.ok(ui.handlers.has('touchmove'));
  assert.equal(ui.event('touchstart',[{}]),false);
  assert.equal(ui.event('touchmove',[{}]),false);
  assert.equal(ui.event('touchmove',[{},{}]),true);
  assert.equal(ui.event('touchstart',[{},{}]),true);
  assert.equal(ui.event('touchmove',[{},{}],false),false);
  assert.equal(ui.event('touchmove',[]),false);
  for(const x of ui.handlers.values()){
    assert.equal(x.options.capture,true);
    assert.equal(x.options.passive,false);
  }
});

test('iOS Safari zoom gestures are blocked, without affecting desktop devices',()=>{
  const mobile=simulation(true);
  assert.equal(mobile.event('gesturestart',undefined),true);
  assert.equal(mobile.event('gesturechange',undefined),true);
  const desktop=simulation(false);
  assert.equal(desktop.handlers.size,0);
  assert.equal(desktop.event('touchmove',[{},{}]),false);
});

test('viewport and app shell include fresh gesture handling without disturbing galleries',()=>{
  assert.match(html,/name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/);
  assert.match(html,/src="mobile-gestures\.js\?v=pinch-off-20261102" defer/);
  assert.match(html,/id="lightbox-zoom"/);
  assert.match(lightbox,/zoomButton\.addEventListener\('click',toggleZoom\)/);
  assert.match(mobile,/\.filters\{\s*max-inline-size:100%;\s*overflow-x:auto/);
  assert.match(sw,/BASE\+'mobile-gestures\.js'/);
  assert.match(sw,/omar-maro-shell-v20261102-request-similar/);
  assert.match(workflow,/tests\/mobile-gestures\.test\.mjs/);
});
