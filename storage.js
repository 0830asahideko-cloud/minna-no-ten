(function (root) {
  'use strict';

  const MAX_WORKS = 30;

  const id = () =>
    'ex-' + (root.crypto?.randomUUID?.() ||
      Date.now().toString(36) + Math.random().toString(36).slice(2));

  const newDraft = () => ({
    id: id(),
    title: '',
    description: '',
    works: [],
    createdAt: new Date().toISOString()
  });

  const newWork = () => ({
    id: id(),
    title: '',
    text: '',
    media: null
  });

  let draft = null;

  function savedDraft() {
    if (!draft) draft = newDraft();
    return draft;
  }

  function saveDraft(value) {
    if (value.works.length > MAX_WORKS) {
      throw new Error('作品は最大30点までです。');
    }

    draft = JSON.parse(JSON.stringify(value));
    return draft;
  }

  function validate(value) {
    if (!value.title.trim()) {
      throw new Error('展覧会のタイトルを入力してください。');
    }

    if (!value.works.length || value.works.length > MAX_WORKS) {
      throw new Error('作品を1〜30点追加してください。');
    }

    value.works.forEach((work, index) => {
      if (!work.title.trim()) {
        throw new Error(
          '作品 ' + (index + 1) + ' のタイトルを入力してください。'
        );
      }

      if (!work.text.trim() && !work.media) {
        throw new Error(
          '作品 ' +
            (index + 1) +
            ' に文章、写真、動画のいずれかを追加してください。'
        );
      }
    });

    return true;
  }

  async function publish(value) {
    validate(value);

    const { client } = await root.ExhibitionCloud.getClient();

    const payload = {
      id: value.id,
      title: value.title.trim(),
      description: value.description?.trim() || '',
      works: value.works,
      created_at: value.createdAt || new Date().toISOString(),
      published_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('exhibitions')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    if (draft?.id === value.id) draft = null;

    return data;
  }

  function move(works, from, to) {
    if (
      from < 0 ||
      to < 0 ||
      from >= works.length ||
      to >= works.length
    ) return;

    works.splice(to, 0, works.splice(from, 1)[0]);
  }

  root.ExhibitionStore = {
    MAX_WORKS,
    id,
    newDraft,
    newWork,
    savedDraft,
    saveDraft,
    validate,
    publish,
    move
  };

})(typeof window === 'undefined' ? globalThis : window);