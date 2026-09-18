document.getElementById('check-connection').onclick = async function () {
  const status = document.getElementById('connection-status');
  this.disabled = true;
  status.textContent = '接続を確認しています…';
  try {
    await window.ExhibitionCloud.checkConnection();
    status.textContent = 'Supabaseに接続できました。次はアカウントと保存先の設定に進めます。';
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' || error instanceof TypeError
      ? '通信できませんでした。インターネット接続を確認し、もう一度お試しください。'
      : error.message;
  } finally { this.disabled = false; }
};
