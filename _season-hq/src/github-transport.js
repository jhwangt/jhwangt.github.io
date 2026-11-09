const workspaceOrigin = 'https://ingenuity-24220-biobuzz.chivalrouspalm.chatgpt.site';
let workspaceWindow;
let connectionTimeout;
let connected = false;
const pendingRecords = new Map();

function connectSharedRecords() {
  if (workspaceWindow && !workspaceWindow.closed && connected) {
    workspaceWindow.focus();
    return;
  }
  workspaceWindow = window.open(workspaceOrigin + '/connect', 'ingenuity-team-workspace', 'popup,width=530,height=440');
  if (!workspaceWindow) throw Error('Allow pop-ups for this page, then try again.');
  connected = false;
  clearTimeout(connectionTimeout);
  connectionTimeout = setTimeout(() => {
    document.querySelector('#notice').textContent = 'Sign in to Season HQ in the connection window, then return here and select Connect team workspace again.';
  }, 5000);
}

window.addEventListener('message', event => {
  if (event.origin !== workspaceOrigin || event.source !== workspaceWindow) return;
  const message = event.data;
  if (message?.type === 'ingenuity-ready') {
    connected = true;
    clearTimeout(connectionTimeout);
    document.querySelector('#connection').hidden = true;
    refresh();
  }
  if (message?.type === 'ingenuity-response') {
    const pending = pendingRecords.get(message.id);
    if (!pending) return;
    pendingRecords.delete(message.id);
    clearTimeout(pending.timer);
    pending.resolve(new Response(message.body, {status:message.status}));
  }
});

function requestRecords(method, record) {
  if (!connected || !workspaceWindow || workspaceWindow.closed) {
    connected = false;
    document.querySelector('#connection').hidden = false;
    throw Error('Connect the team workspace to load or save shared records.');
  }
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      pendingRecords.delete(id);
      connected = false;
      document.querySelector('#connection').hidden = false;
      reject(Error('The workspace connection timed out. Reconnect and refresh before retrying.'));
    }, 12000);
    pendingRecords.set(id, {resolve, timer});
    workspaceWindow.postMessage({type:'ingenuity-request', id, method, record}, workspaceOrigin);
  });
}
