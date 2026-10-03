import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { createBookmarklet } from '../src/utils/bookmarklet.js';
import { sharedLink } from '../src/utils/quick-add.js';

test('bookmarklet opens the installation with encoded page details and no opener', () => {
 const page = 'https://example.org/a?q=ä&value=%23#section';
 const title = 'A "title" & <markup> — Übersicht';
 let opened;
 const bookmarklet = createBookmarklet('/jump-key/', 'https://dashboard.example/jump-key/?old=1#old');
 runInNewContext(decodeURIComponent(bookmarklet.slice('javascript:'.length)), {
  URL, location:{href:page}, document:{title}, window:{open:(...args)=>{opened=args;}}
 });
 const target = new URL(opened[0]);
 assert.equal(target.origin + target.pathname, 'https://dashboard.example/jump-key/');
 assert.equal(target.searchParams.get('share'), '1');
 assert.equal(target.searchParams.has('old'), false);
 assert.equal(target.hash, '');
 assert.deepEqual(sharedLink(target.searchParams), {url:page, name:title});
 assert.deepEqual(opened.slice(1), ['_blank','noopener,noreferrer']);
});
