import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,css,motion,admin,app,seo]=await Promise.all([
  read('index.html'),read('minimal-3d.css'),read('minimal-3d.js'),
  read('tools/manage-projects.html'),read('app.js'),read('scripts/build-seo.mjs')
]);
await import('../site-cms.js');
const cms=globalThis.OMSiteCMS;

test('Minimal 3D is progressive enhancement with original portfolio intact',()=>{
  assert.match(html,/href="minimal-3d\.css\?v=mm-/);
  assert.match(html,/src="minimal-3d\.js\?v=mm-/);
  assert.match(html,/class="mm-orbit"/);
  assert.match(html,/id="hero-featured"/);
  assert.match(html,/id="projects-grid"/);
  assert.match(html,/id="about"/);
  assert.match(html,/id="brief-form"/);
  assert.match(html,/https:\/\/www\.facebook\.com\/omar\.maro\.38382/);
  assert.match(html,/https:\/\/www\.instagram\.com\/_omar_maro_ds\//);
});
test('Motion is opt-out, respects reduced motion and never depends on 3D packages',()=>{
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/html\[data-mm-effects="off"\]/);
  assert.match(motion,/matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(motion,/requestAnimationFrame/);
  assert.match(motion,/pointerType!=='mouse'/);
  assert.match(motion,/\.project-card/);
  assert.ok(!/three(?:\.min)?\.js|@react-three|babylonjs|webgl|<canvas/i.test(html+css+motion));
  assert.ok(!motion.includes('localStorage'));
});
test('Owner can disable motion without changing project records',()=>{
  assert.equal(cms.normalize({}).visual.effects,'on');
  assert.equal(cms.normalize({visual:{effects:'off'}}).visual.effects,'off');
  assert.equal(cms.normalize({visual:{effects:'broken'}}).visual.effects,'on');
  assert.match(admin,/id="cmsEffects"/);
});
test('Build pipeline styles public case studies but retains SEO and files',()=>{
  assert.match(seo,/Minimal 3D styling for crawlable standalone project case studies/);
  assert.match(seo,/sitemap\.xml/);
  assert.match(seo,/robots\.txt/);
  assert.match(app,/data\/site-controls\.json/);
  assert.match(html,/google-site-verification|og:description/);
});
