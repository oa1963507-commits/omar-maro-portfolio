import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,mergeCatalog,projectIdFromUrl,decodeEntities} from '../scripts/sync-behance.mjs';

test('RSS discovers legitimate Behance gallery projects and cover images',()=>{
const xml=`<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/"><channel>
<item><title><![CDATA[Book Cover &amp; Art]]></title><link>https://www.behance.net/gallery/123456789/Book-Cover</link><pubDate>Tue, 27 Oct 2026 11:00:00 GMT</pubDate><description><![CDATA[<p>New cover</p>]]></description><media:thumbnail url="https://mir-s3-cdn-cf.behance.net/cover.jpg" /></item>
<item><title>Unrelated</title><link>https://evil.example/x</link></item>
</channel></rss>`;
const list=parseFeed(xml,'application/rss+xml');
assert.equal(list.length,1);assert.equal(list[0].id,'behance-123456789');assert.equal(list[0].title,'Book Cover & Art');assert.equal(list[0].category,'covers');assert.equal(list[0].year,'2026');assert.equal(list[0].cover,'https://mir-s3-cdn-cf.behance.net/cover.jpg');
});

test('Atom and JSON use only verified Behance gallery URLs',()=>{
  const atom=`<feed><entry><title>AI campaign</title><link href="https://www.behance.net/gallery/987654321/ai-campaign"/><updated>2026-10-28</updated></entry></feed>`;
  assert.equal(parseFeed(atom)[0].category,'ai');
  const json=JSON.stringify({projects:[{title:'Brand',url:'https://behance.net/gallery/111222333/brand',images:['https://cdn.example/pic.webp']},{title:'Wrong source',url:'https://example.com/gallery/123/malicious'}]});
  assert.equal(parseFeed(json).length,1);
});

test('Merge keeps all manually authored records and existing projects when feed is partial',()=>{
  const manual={id:'omar-maro-identity',source:'original'};
  const previous={id:'behance-123456789',source:'behance',cover:'https://old.example/a.png',images:['https://old.example/a.png'],category:'branding',story:'curated case study'};
  const result=mergeCatalog([manual,previous],[{id:'behance-123456789',source:'behance',cover:'',images:[],category:'social',title:'updated'}]);
  assert.equal(result.length,2);assert.equal(result[0],manual);assert.equal(result[1].title,'updated');assert.equal(result[1].story,'curated case study');assert.equal(result[1].category,'branding');assert.equal(result[1].cover,'https://old.example/a.png');
});

test('Rejects lookalike domains and safely decodes XML entities',()=>{
  assert.equal(projectIdFromUrl('https://behance.net.attacker.test/gallery/123456/hello'),'');
  assert.equal(projectIdFromUrl('https://www.behance.net/gallery/123456/hello'),'123456');
  assert.equal(decodeEntities('Omar &amp; Maro &#x1F31F;'),'Omar & Maro 🌟');
});