(function () {
  'use strict';
  let pending;
  async function connect() {
    const response = await fetch('supabase-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('接続設定がまだ公開されていません。');
    const config = await response.json();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url) ||
        !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) {
      throw new Error('接続設定を確認してください。公開用キーが必要です。');
    }
    const client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return { client, config };
  }
  function connection() {
    if (!pending) pending = connect().catch(error => { pending = null; throw error; });
    return pending;
  }
  window.ExhibitionCloud = {
    async getClient() { return (await connection()).client; },
    async checkConnection() {
      const { config } = await connection();
      const response = await fetch(config.url + '/auth/v1/settings', {
        headers: { apikey: config.publishableKey },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('接続できませんでした。Project URLとPublishable keyを確認してください。');
      return true;
    }
  };
})();
