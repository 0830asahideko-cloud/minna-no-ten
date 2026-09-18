(function () {
  'use strict';
  const S = window.ExhibitionStore;
  const $ = id => document.getElementById(id);
  const page = location.pathname.split('/').pop() || 'index.html';
  const number = n => String(n).padStart(2, '0');
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function message(text = '') {
    $('message').textContent = text;
    $('message').hidden = !text;
  }
  const icons = ['😂','📷','🌙','🎒','☀️','🚲','🍜','🎧','🌊','🎆','🚃','☕','🌸','⚽','🎮','🍂','🏫','🌧️','🎂','🎡','🐕','📚','🎤','🍙','🌅','🎬','⭐','🛣️','🫶','✨'];
  const samples = [
    ['sample-laugh', '人生で一番笑った日 展', 12842, 'そら'],
    ['sample-road', '忘れられない帰り道 展', 8201, 'そら'],
    ['sample-music', '私を作った音楽 展', 6920, 'そら']
  ].map(([id, title, visitors, author]) => ({ id, title, visitors, author, sample: true,
    description: 'サンプル展覧会です。あなたも、思い出を展示してみませんか。',
    works: icons.map((emoji, index) => ({ id: id + '-' + index, title: '思い出の景色 ' + (index + 1),
      text: index === 0 && id === 'sample-laugh' ? '「笑いすぎて、息ができなかった日。」' : '「思い出の中に残っている、' + (index + 1) + '番目の景色。」', emoji }))
  }));
  const href = ex => 'exhibition.html?id=' + encodeURIComponent(ex.id);
  function card(ex, data) {
    const link = element('a', 'card exhibition-card');
    link.href = href(ex);
    const cover = ex.works.find(work => work.media)?.media;
    if (cover?.kind === 'image') {
      const image = mediaNode(cover, ex.title);
      if (image) { image.loading = 'lazy'; link.append(image); }
    } else if (cover?.kind === 'video') {
      link.append(element('p', 'muted', '▶ 動画のある展覧会'));
    }
    link.append(element('div', 'tiny', ex.sample ? 'SAMPLE EXHIBITION' : 'MY EXHIBITION'),
      element('h3', '', ex.title), element('p', 'muted', ex.works.length + '作品 ・ ' + (ex.sample ? ex.visitors : (data.visits[ex.id] ? 1 : 0)) + ' 来場'), element('span', 'card-enter', '入場する →'));
    if (ex.description) link.querySelector('h3').after(element('p', 'description card-description', ex.description));
    return link;
  }
  function mediaNode(media, title) {
    if (!media || !/^data:(image|video)\//.test(media.src)) return null;
    const node = element(media.kind === 'video' ? 'video' : 'img', 'media');
    node.src = media.src;
    if (media.kind === 'video') {
      node.controls = true;
      node.playsInline = true;
      node.preload = 'metadata';
      node.setAttribute('aria-label', title || '展示動画');
      node.append(document.createTextNode('このブラウザーでは動画を再生できません。'));
    } else node.alt = title || '展示写真';
    node.onerror = () => {
      if (!node.nextElementSibling?.classList.contains('media-error')) node.after(element('p', 'muted media-error', 'このメディアを表示できません。対応する形式で追加し直してください。'));
    };
    return node;
  }
  function readDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('ファイルを読み込めませんでした。'));
      reader.readAsDataURL(file);
    });
  }
  async function importMedia(file) {
    if (!/^(image|video)\//.test(file.type)) throw new Error('写真または動画を選んでください。');
    if (file.type.startsWith('video/')) {
      if (file.size > 1024 * 1024) throw new Error('動画は1本1MBまでです。短い動画、または圧縮した動画を選んでください。');
      const video = document.createElement('video');
      if (!video.canPlayType(file.type)) throw new Error('この動画形式を再生できません。MP4やWebMなど、ブラウザー対応の動画を選んでください。');
      return { kind: 'video', name: file.name, src: await readDataURL(file) };
    }
    if (file.size > 25 * 1024 * 1024) throw new Error('写真は25MB以下のファイルを選んでください。');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('この写真形式を読み込めません。JPEG・PNG・WebPなどの写真を選んでください。'));
        img.src = url;
      });
      const ratio = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return { kind: 'image', name: file.name, src: canvas.toDataURL('image/jpeg', 0.78) };
    } finally { URL.revokeObjectURL(url); }
  }

  function create(data) {
    let draft = data.draft || S.newDraft();
    let dirty = false;
    let busy = false;
    let conflict = false;
    $('title').value = draft.title;
    $('desc').value = draft.description;
    $('save-status').textContent = data.draft ? '保存した下書きを開きました。' : '作成途中の内容は自動保存されます。';
    function persist() {
      dirty = true;
      if (conflict) return false;
      try {
        S.saveDraft(draft);
        dirty = false;
        $('save-status').textContent = '下書きをこのブラウザーに保存しました。';
        message();
        return true;
      } catch (error) {
        $('save-status').textContent = '未保存の変更があります。';
        message(error.message);
        return false;
      }
    }
    function setBusy(value) {
      busy = value;
      document.querySelectorAll('main button, main input, main textarea').forEach(node => { node.disabled = value || conflict; });
      if (!value) render();
    }
    function action(text, handler, disabled = false) {
      const button = element('button', 'pill', text);
      button.type = 'button';
      button.disabled = disabled || busy || conflict;
      button.onclick = handler;
      return button;
    }
    function render(focusId) {
      $('wc').textContent = draft.works.length + ' / 30作品';
      $('works').replaceChildren();
      draft.works.forEach((work, index) => {
        const box = element('section', 'work');
        box.id = 'work-' + work.id;
        box.append(element('h3', 'tiny', 'EXHIBIT ' + number(index + 1)));
        const titleLabel = element('label', 'label', '作品のタイトル');
        const title = element('input', 'field');
        title.id = 'title-' + work.id;
        titleLabel.htmlFor = title.id;
        title.value = work.title;
        title.maxLength = 100;
        title.placeholder = '例：あの日の帰り道';
        title.oninput = () => { work.title = title.value; persist(); };
        const textLabel = element('label', 'label', '作品に添える文章');
        const text = element('textarea', 'field');
        text.id = 'text-' + work.id;
        textLabel.htmlFor = text.id;
        text.value = work.text;
        text.rows = 3;
        text.maxLength = 5000;
        text.placeholder = 'この作品の物語を、あなたの言葉で。';
        text.oninput = () => { work.text = text.value; persist(); };
        box.append(titleLabel, title, textLabel, text);
        const media = mediaNode(work.media, work.title);
        if (media) box.append(media, element('p', 'muted filename', work.media.name));
        const label = element('label', 'pill file-picker', work.media ? '写真・動画を変更' : '写真・動画を選ぶ');
        const file = element('input');
        file.type = 'file'; file.accept = 'image/*,video/*';
        file.setAttribute('aria-label', '作品 ' + (index + 1) + ' の写真・動画');
        file.onchange = async () => {
          if (!file.files[0] || busy) return;
          setBusy(true);
          message('写真・動画を読み込んでいます…');
          try { work.media = await importMedia(file.files[0]); persist(); }
          catch (error) { message(error.message); }
          finally { setBusy(false); }
        };
        label.append(file);
        const mediaActions = element('div', 'actions');
        mediaActions.append(label);
        if (work.media) mediaActions.append(action('メディアを外す', () => { work.media = null; persist(); render(); }));
        const orderActions = element('div', 'actions work-order');
        orderActions.append(
          action('↑ 前へ', () => { S.move(draft.works, index, index - 1); persist(); render(work.id); }, index === 0),
          action('↓ 後へ', () => { S.move(draft.works, index, index + 1); persist(); render(work.id); }, index === draft.works.length - 1),
          action('作品を削除', () => {
            if (!confirm('作品 ' + (index + 1) + ' を削除しますか？')) return;
            draft.works.splice(index, 1); persist(); render();
          })
        );
        box.append(mediaActions, orderActions);
        $('works').append(box);
      });
      $('add-work').disabled = $('files').disabled = draft.works.length >= S.MAX_WORKS || busy || conflict;
      if (!draft.works.length) $('works').append(element('p', 'empty muted', '最初の作品を追加して、展示をはじめましょう。'));
      if (focusId) $('title-' + focusId)?.focus();
      if (conflict) document.querySelectorAll('main button, main input, main textarea').forEach(node => { node.disabled = true; });
    }
    $('title').oninput = () => { draft.title = $('title').value; persist(); };
    $('desc').oninput = () => { draft.description = $('desc').value; persist(); };
    $('add-work').onclick = () => {
      if (draft.works.length >= S.MAX_WORKS || busy) return;
      const work = S.newWork(); draft.works.push(work); persist(); render(work.id);
    };
    $('files').onchange = async event => {
      const selected = Array.from(event.target.files);
      if (!selected.length || busy) return;
      setBusy(true);
      const remaining = S.MAX_WORKS - draft.works.length;
      const errors = selected.length > remaining ? ['最大30作品のため、追加できる分だけ読み込みました。'] : [];
      message('写真・動画を読み込んでいます…');
      try {
        for (const file of selected.slice(0, remaining)) {
          try {
            const media = await importMedia(file);
            draft.works.push({ ...S.newWork(), title: file.name.replace(/\.[^.]+$/, '').slice(0, 100), media });
          } catch (error) { errors.push(file.name + '：' + error.message); }
        }
        if (!persist()) errors.push($('message').textContent);
        message(errors.join('\n'));
      } finally { event.target.value = ''; setBusy(false); }
    };
    $('preview').onclick = () => {
      if (busy) return;
      if (!draft.works.length) { message('プレビューする作品を追加してください。'); return; }
      if (persist()) location.href = 'exhibition.html?preview=1';
    };
    $('publish').onclick = () => {
      if (busy || conflict) return;
      try {
        S.publish(draft);
        dirty = false;
        location.href = 'profile.html?published=' + encodeURIComponent(draft.id);
      } catch (error) { message(error.message); }
    };
    window.addEventListener('beforeunload', event => {
      if (dirty || busy) { event.preventDefault(); event.returnValue = ''; }
    });
    window.addEventListener('storage', event => {
      if (event.key === S.KEY || event.key === null) {
        conflict = true;
        message('別のタブで保存内容が更新されました。上書きを防ぐため編集を止めています。このページを再読み込みしてください。');
        render();
      }
    });
    render();
  }

  function exhibition(data) {
    const params = new URLSearchParams(location.search);
    const preview = params.get('preview') === '1';
    const id = params.get('id') || 'sample-laugh';
    const ex = preview ? data.draft : [...data.exhibitions, ...samples].find(item => item.id === id);
    if (preview) { $('back-link').href = 'create.html'; $('back-link').textContent = '← 編集に戻る'; }
    else if (ex && !ex.sample) { $('back-link').href = 'profile.html'; $('back-link').textContent = '← 自分の展示室へ'; }
    if (!ex || !ex.works.length) { message('展覧会が見つかりません。展示室から入場するか、作品を追加してください。'); return; }
    function roomIndex() {
      const match = /^#room=(\d+)$/.exec(location.hash);
      return match ? Math.max(0, Math.min(ex.works.length - 1, Number(match[1]) - 1)) : 0;
    }
    let p = roomIndex();
    let previewReactions = {};
    if (!preview) {
      try {
        data = S.update(state => { state.visits[ex.id] = { at: new Date().toISOString() }; });
      } catch (error) { message(error.message); }
    }
    $('exhibition-content').hidden = false;
    $('preview-notice').hidden = !preview;
    $('exhibition-label').textContent = preview ? 'EXHIBITION PREVIEW' : ex.sample ? 'SAMPLE EXHIBITION' : 'YOUR EXHIBITION';
    $('ex-title').textContent = ex.title || '無題の展覧会';
    document.title = ex.title || '展覧会プレビュー';
    $('ex-desc').textContent = ex.description;
    $('ex-meta').textContent = preview ? ex.works.length + '作品 ・ 公開前' : 'by ' + (ex.author || 'あなた') + ' ｜ ' + (ex.sample ? ex.visitors.toLocaleString() : (data.visits[ex.id] ? 1 : 0)) + ' 来場' + (ex.sample ? '（サンプル）' : '（このブラウザー）');
    function key() { return ex.id + ':' + ex.works[p].id; }
    function reaction() { return (preview ? previewReactions : data.reactions)[key()] || { liked: false, comments: [] }; }
    function renderReactions() {
      const item = reaction();
      $('like').textContent = item.liked ? '♥ 共感済み' : '♡ 共感';
      $('like').setAttribute('aria-pressed', String(item.liked));
      $('comments').replaceChildren();
      if (!item.comments.length) $('comments').append(element('p', 'muted', 'まだコメントはありません。'));
      item.comments.forEach(comment => $('comments').append(element('p', 'description', 'あなた　' + comment.text)));
    }
    function render() {
      const work = ex.works[p];
      $('room').textContent = 'ROOM ' + number(p + 1) + ' / ' + number(ex.works.length);
      $('num').textContent = number(p + 1) + ' / ' + number(ex.works.length);
      $('count').textContent = (p + 1) + ' / ' + ex.works.length;
      $('art-media').querySelector('video')?.pause();
      $('art-media').replaceChildren();
      const media = mediaNode(work.media, work.title);
      if (media) $('art-media').append(media);
      else if (work.emoji) $('art-media').append(element('div', 'emoji', work.emoji));
      $('art-media').hidden = !media && !work.emoji;
      $('work-title').textContent = work.title || '無題の作品';
      $('work-text').textContent = work.text;
      $('prev').disabled = p === 0;
      $('next').disabled = p === ex.works.length - 1;
      $('finish').hidden = p !== ex.works.length - 1;
      $('ci').value = '';
      renderReactions();
    }
    function changeReaction(change) {
      try {
        if (preview) {
          const item = reaction(); change(item); previewReactions[key()] = item;
        } else {
          data = S.update(state => {
            const item = state.reactions[key()] || { liked: false, comments: [] };
            change(item); state.reactions[key()] = item;
          });
        }
        message(); renderReactions(); return true;
      } catch (error) { message(error.message); return false; }
    }
    function goToRoom(index) {
      if (index < 0 || index >= ex.works.length) return;
      location.hash = 'room=' + (index + 1);
    }
    window.addEventListener('hashchange', () => { p = roomIndex(); render(); });
    $('prev').onclick = () => goToRoom(p - 1);
    $('next').onclick = () => goToRoom(p + 1);
    $('like').onclick = () => changeReaction(item => { item.liked = !item.liked; });
    $('comment-form').onsubmit = event => {
      event.preventDefault();
      const text = $('ci').value.trim();
      if (!text) return;
      if (changeReaction(item => item.comments.push({ id: S.id(), text, at: new Date().toISOString() }))) $('ci').value = '';
    };
    render();
  }

  try {
    const data = S.load();
    if (page === 'create.html') create(data);
    else if (page === 'exhibition.html') exhibition(data);
    else if (page === 'profile.html') {
      const published = new URLSearchParams(location.search).get('published');
      if (data.exhibitions.some(ex => ex.id === published)) {
        message('展覧会をこのブラウザーに公開しました。下のカードから入場できます。');
      }
      $('create-link').textContent = data.draft ? '作成途中の展覧会を続ける' : '新しい展覧会をつくる';
      if (!data.exhibitions.length) $('mine').append(element('p', 'empty muted', 'まだ公開した展覧会はありません。最初の展覧会をひらいてみましょう。'));
      data.exhibitions.forEach(ex => $('mine').append(card(ex, data)));
      const oldTitle = localStorage.getItem('myExTitle');
      if (oldTitle) {
        $('legacy').hidden = false;
        $('legacy').textContent = '以前の試作で作成した「' + oldTitle + '」のタイトルは残っています。写真・動画が保存されていなかったため、鑑賞するには新しく展覧会を作成してください。';
      }
    } else if (page === 'search.html') {
      const render = () => {
        const query = $('query').value.trim().toLocaleLowerCase();
        const matches = [...data.exhibitions, ...samples].filter(ex => (ex.title + ' ' + ex.description).toLocaleLowerCase().includes(query));
        $('results').replaceChildren(...matches.map(ex => card(ex, data)));
        if (!matches.length) $('results').append(element('p', 'muted', '一致する展覧会がありません。'));
      };
      $('query').oninput = render; render();
    } else if (page === 'records.html') {
      const visits = Object.entries(data.visits).sort((a, b) => b[1].at.localeCompare(a[1].at));
      if (!visits.length) $('records').append(element('p', 'empty muted', 'まだ来場記録はありません。気になる展覧会に入場してみましょう。'));
      visits.forEach(([id, visit]) => {
        const ex = [...data.exhibitions, ...samples].find(ex => ex.id === id);
        if (!ex) return;
        const ticket = card(ex, data);
        ticket.classList.add('ticket');
        ticket.prepend(element('p', 'muted', '🎟 ' + new Date(visit.at).toLocaleString('ja-JP') + ' 来場'));
        $('records').append(ticket);
      });
    } else if (page === 'index.html') {
      $('home-mine').hidden = !data.exhibitions.length;
      data.exhibitions.forEach(ex => $('home-list').append(card(ex, data)));
    }
    document.querySelectorAll('.bottom a').forEach(link => {
      if (link.getAttribute('href') === page) link.setAttribute('aria-current', 'page');
    });
  } catch (error) {
    message(error.message);
    if (page === 'create.html') document.querySelectorAll('main button, main input, main textarea').forEach(node => { node.disabled = true; });
  }
  // Back/forward cache must not restore an already published editor or stale list.
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();
