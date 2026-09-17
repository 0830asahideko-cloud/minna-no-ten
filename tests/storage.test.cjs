// Run: node --test tests/storage.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../storage.js'), 'utf8');
function setup() {
  let raw = null, fail = false;
  const context = vm.createContext({ localStorage: {
    getItem: () => raw,
    setItem: (_, value) => { if (fail) throw new Error('quota'); raw = value; }
  } });
  vm.runInContext(source, context);
  return { store: context.ExhibitionStore, quota: value => { fail = value; }, corrupt: () => { raw = '{'; } };
}
function draft(store, title = '思い出 展') {
  return { ...store.newDraft(), title, description: '展示の説明', works: [
    { ...store.newWork(), title: '写真', text: '一日目', media: { kind: 'image', src: 'data:image/jpeg;base64,YQ==' } },
    { ...store.newWork(), title: '動画', text: '二日目', media: { kind: 'video', src: 'data:video/mp4;base64,Yg==' } }
  ] };
}
test('drafts retain media, text and order across loads; multiple exhibitions publish independently', () => {
  const { store: s } = setup(); const first = draft(s);
  s.move(first.works, 1, 0); s.saveDraft(first);
  assert.equal(s.load().draft.works[0].title, '動画');
  assert.equal(s.load().draft.works[1].media.src, first.works[1].media.src);
  s.publish(s.load().draft);
  assert.equal(s.load().draft, null);
  const second = draft(s, '別の展'); s.saveDraft(second); s.publish(second);
  assert.equal(s.load().exhibitions.length, 2);
  assert.equal(s.load().exhibitions[1].description, first.description);
  assert.throws(() => s.publish(first), /すでに公開/);
});
test('30 works accepted, 31 rejected; empty title/content rejected; text-only allowed', () => {
  const { store: s } = setup(); const d = draft(s);
  d.works = Array.from({ length: 30 }, () => ({ ...s.newWork(), title: '作品', text: '文章' }));
  s.saveDraft(d); s.validate(d);
  d.works.push(s.newWork());
  assert.throws(() => s.saveDraft(d), /最大30/);
  assert.throws(() => s.publish(d), /1〜30/);
  d.works = [{ ...s.newWork(), title: '空の作品' }];
  assert.throws(() => s.publish(d), /文章、写真、動画/);
  d.works[0].text = '物語'; d.title = ' ';
  assert.throws(() => s.publish(d), /展覧会のタイトル/);
});
test('failed save or publish preserves the previously saved draft and exhibition', () => {
  const { store: s, quota } = setup(); const published = draft(s); s.publish(published);
  const next = draft(s, '作成途中'); s.saveDraft(next); quota(true);
  next.title = '未保存の変更';
  assert.throws(() => s.saveDraft(next), /保存できません/);
  assert.throws(() => s.publish(next), /保存できません/);
  assert.equal(s.load().draft.title, '作成途中');
  assert.equal(s.load().exhibitions.length, 1);
});
test('reactions and visits are isolated by exhibition/work and survive reload', () => {
  const { store: s } = setup(); const d = draft(s); s.publish(d);
  s.update(data => { data.reactions[d.id + ':' + d.works[0].id] = { liked: true, comments: [{ text: '<script>test</script>' }] }; data.visits[d.id] = { at: '2026-09-17' }; });
  const loaded = s.load();
  assert.equal(Object.keys(loaded.reactions).length, 1);
  assert.equal(loaded.reactions[d.id + ':' + d.works[0].id].comments[0].text, '<script>test</script>');
  assert.equal(loaded.visits[d.id].at, '2026-09-17');
});
test('corrupt data fails closed without overwriting', () => {
  const { store: s, corrupt } = setup(); corrupt();
  assert.throws(() => s.load(), /読み込めません/);
  assert.throws(() => s.saveDraft(draft(s)), /読み込めません/);
});
