/* Versioned, local-only exhibition data. A single write makes publishing atomic. */
(function (root) {
  'use strict';
  const KEY = 'minna-exhibitions-v1';
  const MAX_WORKS = 30;
  const copy = value => JSON.parse(JSON.stringify(value));
  const id = () => 'ex-' + (root.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const empty = () => ({ version: 1, exhibitions: [], draft: null, reactions: {}, visits: {} });
  function load() {
    try {
      const raw = root.localStorage.getItem(KEY);
      if (!raw) return empty();
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.exhibitions) || !data.reactions || !data.visits ||
          !data.exhibitions.every(ex => ex.id && Array.isArray(ex.works) && ex.works.length <= MAX_WORKS) ||
          (data.draft && !Array.isArray(data.draft.works))) throw new Error();
      return data;
    } catch (_) {
      throw new Error('保存データを読み込めません。ブラウザーの保存設定を確認してください。既存のデータは上書きしていません。');
    }
  }
  function save(data) {
    try { root.localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (_) { throw new Error('保存できませんでした。保存容量が不足しているか、ブラウザーの保存が無効です。大きな写真・動画を削除または小さなファイルに変更して、もう一度お試しください。'); }
  }
  function update(change) {
    const data = load();
    change(data);
    save(data);
    return data;
  }
  const newDraft = () => ({ id: id(), title: '', description: '', works: [], createdAt: new Date().toISOString() });
  const newWork = () => ({ id: id(), title: '', text: '', media: null });
  function saveDraft(draft) {
    if (draft.works.length > MAX_WORKS) throw new Error('作品は最大30点までです。');
    return update(data => { data.draft = copy(draft); });
  }
  function validate(draft) {
    if (!draft.title.trim()) throw new Error('展覧会のタイトルを入力してください。');
    if (!draft.works.length || draft.works.length > MAX_WORKS) throw new Error('作品を1〜30点追加してください。');
    draft.works.forEach((work, index) => {
      if (!work.title.trim()) throw new Error('作品 ' + (index + 1) + ' のタイトルを入力してください。');
      if (!work.text.trim() && !work.media) throw new Error('作品 ' + (index + 1) + ' に文章、写真、動画のいずれかを追加してください。');
    });
  }
  function publish(draft) {
    validate(draft);
    return update(data => {
      if (data.exhibitions.some(ex => ex.id === draft.id)) throw new Error('この展覧会はすでに公開されています。展示室からご覧ください。');
      data.exhibitions.unshift({ ...copy(draft), title: draft.title.trim(), publishedAt: new Date().toISOString() });
      if (data.draft?.id === draft.id) data.draft = null;
    });
  }
  function move(works, from, to) {
    if (from < 0 || to < 0 || from >= works.length || to >= works.length) return;
    works.splice(to, 0, works.splice(from, 1)[0]);
  }
  root.ExhibitionStore = { KEY, MAX_WORKS, id, load, saveDraft, update, newDraft, newWork, validate, publish, move };
})(typeof window === 'undefined' ? globalThis : window);
