import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,css,install,sw,manifest,app,settings,originalCSS]=await Promise.all([
 read('index.html'),read('mobile.css'),read('install.js'),read('service-worker.js'),
 read('manifest.webmanifest').then(JSON.parse),read('app.js'),read('data/site-controls.json'),read('styles.css')
]);

test('home screen manifest uses correct GitHub Pages scope and original brand icon',async()=>{
 assert.equal(manifest.name,'OMAR MARO | Graphic Design Portfolio');
 assert.equal(manifest.short_name,'OMAR MARO');
 assert.equal(manifest.scope,'/omar-maro-portfolio/');
 assert.equal(manifest.start_url,'/omar-maro-portfolio/');
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.background_color,'#070c16');
 assert.equal(manifest.theme_color,'#070c16');
 assert.ok(manifest.icons.some(icon=>icon.src==='assets/omar-mark.png'&&icon.type==='image/png'));
 for(const icon of manifest.icons){await fs.access(new URL('../'+icon.src,import.meta.url))}
 assert.deepEqual(manifest.shortcuts.map(item=>item.url),[
  '/omar-maro-portfolio/#work','/omar-maro-portfolio/#about','/omar-maro-portfolio/#contact'
 ]);
 assert.match(html,/href="manifest.webmanifest"/);
 assert.match(html,/rel="apple-touch-icon" href="assets\/omar-mark\.png"/);
 assert.match(html,/apple-mobile-web-app-title" content="OMAR MARO"/);
 assert.match(html,/viewport-fit=cover/);
});
test('touch layout improves mobile readability and standalone safe areas without changing desktop CSS',()=>{
 assert.match(html,/href="mobile\.css\?v=/);
 assert.match(css,/@media\(max-width:920px\)/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.match(css,/@media\(max-width:365px\)/);
 assert.match(css,/@media\(display-mode:standalone\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.project-info h3/);
 assert.match(css,/\.filter\{flex:none;white-space:nowrap/);
 assert.match(css,/\.contact-form input/);
 assert.match(css,/\.menu-toggle/);
 assert.ok(originalCSS.includes('--accent:#6aafff'));
 assert.match(html,/id="projects-grid"/);
 assert.match(html,/id="brief-form"/);
});
test('install action is accessible on Android and iOS with manual fallback',()=>{
 assert.match(html,/src="install\.js\?v=/);
 assert.match(install,/beforeinstallprompt/);
 assert.match(install,/appinstalled/);
 assert.match(install,/navigator\.standalone/);
 assert.match(install,/Add to Home screen/);
 assert.match(install,/Safari/);
 assert.match(install,/requestInstall/);
 assert.match(install,/window\.addEventListener\('om-language-change',update\)/);
 assert.match(install,/role','status/);
 assert.match(install,/navigator\.serviceWorker\.register\('\.\/service-worker\.js'/);
});
test('offline shell is limited to this site and never serves stale admin/catalog',()=>{
 assert.match(sw,/BASE='\/omar-maro-portfolio\/'/);
 assert.match(sw,/cache: 'reload'|cache:'reload'/);
 assert.match(sw,/if\(req\.method!=='GET'\)return/);
 assert.match(sw,/url\.origin!==self\.location\.origin/);
 assert.match(sw,/url\.pathname\.startsWith\(BASE\+'data\/'\)/);
 assert.match(sw,/url\.pathname\.startsWith\(BASE\+'tools\/'\)/);
 assert.match(sw,/url\.pathname\.startsWith\(BASE\+'projects\/'\)/);
 assert.match(sw,/cache\.match\(req,\{ignoreSearch:true\}\)/);
 assert.match(app,/data\/projects\.json/);
 assert.ok(Array.isArray(JSON.parse(settings).order));
});
