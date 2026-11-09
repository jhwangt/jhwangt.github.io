'use strict';

const sessionKey = 'ingenuity-season-hq-token';
const tracker = 'https://api.github.com/repos/jhwangt/ingenuity-season-data';
const operationLabels = {Goals:'Goals', Rules:'Rules', Events:'Event prep', Meetings:'Meeting'};
const marker = /\n\n<!-- season-hq:v1:([A-Za-z0-9+/=]+) -->\s*$/;
let token = '';
let issueIndex = new Map();
let activeWrites = 0;
let refreshing = false;

async function github(path, credential, method='GET', body) {
  const response = await fetch(tracker+path, {
    method, credentials:'omit', redirect:'error', cache:'no-store',
    headers:{authorization:'Bearer '+credential, accept:'application/vnd.github+json',
      ...(body ? {'content-type':'application/json'} : {})},
    body:body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw Error(({401:'GitHub rejected the token. Disconnect and reconnect with a valid token.',
      403:'GitHub denied this action. Check repository access and Issues read and write permissions.',
      404:'GitHub could not find this private repository or issue.'})[response.status] ||
      'GitHub returned an error ('+response.status+').');
  }
  return response.json();
}

function readIssue(issue) {
  const body = issue.body || '';
  const match = body.match(marker);
  let meta = {};
  if (match) {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(match[1]), c=>c.charCodeAt(0))));
      if (parsed && typeof parsed === 'object') meta=parsed;
    } catch { /* A regular GitHub issue can still be displayed. */ }
  }
  const labels = issue.labels.map(label=>label.name);
  const awards = awardNames.filter(award=>labels.includes(award));
  const operation = Object.keys(operationLabels).find(key=>labels.includes(operationLabels[key]));
  const category = operation || (awards.length ? 'Awards' : 'Goals');
  const starterId = typeof meta.starterId === 'string' && seeds.some(seed=>seed.id===meta.starterId) ? meta.starterId : '';
  const field = key => typeof meta[key]==='string' ? meta[key] : '';
  const assignees = issue.assignees.map(user=>user.login).join(', ');
  return {
    id:starterId || 'issue-'+issue.number, issueNumber:issue.number, category, awards,
    title:issue.title, notes:match ? body.slice(0,match.index) : body,
    owner:field('owner') || assignees, due:field('due'), next:field('next'), source:field('source'), by:field('by'),
    tentative:meta.tentative===true, updated:issue.updated_at,
    status:issue.state==='closed' ? 'Done' : ['In progress','Blocked'].includes(meta.status) ? meta.status : 'Planned',
    revision:issue.updated_at
  };
}

function issuePayload(record, current) {
  const metadata = {status:record.status, owner:record.owner, due:record.due, next:record.next,
    source:record.source, by:record.by, tentative:record.tentative,
    ...(record.id.startsWith('starter-') ? {starterId:record.id} : {})};
  const bytes = new TextEncoder().encode(JSON.stringify(metadata));
  const encoded = btoa(Array.from(bytes,c=>String.fromCharCode(c)).join(''));
  const managed = [...awardNames,...Object.values(operationLabels)];
  const labels = (current?.labels || []).map(label=>label.name).filter(label=>!managed.includes(label));
  const operation = operationLabels[record.category];
  if (operation) labels.push(operation);
  labels.push(...awardsFor(record));
  return {title:record.title.trim(), body:(record.notes || '')+'\n\n<!-- season-hq:v1:'+encoded+' -->',
    labels:[...new Set(labels)], ...(current ? {state:record.status==='Done'?'closed':'open'} : {})};
}

function makeGitHubDraft(record) {
  if (!record.title.trim()) throw Error('Enter a title for this entry.');
  if (record.status==='Done') throw Error('GitHub opens new drafts as open issues. Choose another status and close the issue after creating it.');
  const payload=issuePayload(record,null);
  const query=new URLSearchParams({title:payload.title,body:payload.body,labels:payload.labels.join(',')});
  const url='https://github.com/jhwangt/ingenuity-season-data/issues/new?'+query;
  if (url.length>7000) throw Error('This draft is too long to send in a link. Shorten it or add the remaining notes in GitHub.');
  return url;
}

async function loadRecords() {
  const credential = token;
  if (!credential) throw Error('Connect GitHub first.');
  const next = new Map();
  for (let page=1; ; page++) {
    const batch = await github('/issues?state=all&sort=updated&direction=desc&per_page=100&page='+page,credential);
    for (const issue of batch) {
      if (issue.pull_request) continue;
      const record = readIssue(issue);
      if (next.has(record.id)) record.id='issue-'+issue.number;
      next.set(record.id,{record,issue});
    }
    if (batch.length<100) break;
  }
  if (credential!==token) throw Error('GitHub connection changed.');
  issueIndex=next;
  return [...next.values()].map(item=>item.record);
}

function issueVersion(issue) {
  return JSON.stringify([issue.updated_at,issue.title,issue.body,issue.state,issue.labels.map(label=>label.name).sort()]);
}

async function saveRecord(record) {
  if (activeWrites) throw Error('Another entry is saving. Try again in a moment.');
  activeWrites++;
  try {
    const previous=issueIndex.get(record.id)?.issue;
    const current=previous ? await github('/issues/'+previous.number,token) : null;
    if (current && (current.updated_at!==record.revision || issueVersion(current)!==issueVersion(previous))) {
      throw Error('This issue changed in GitHub. Refresh before editing again.');
    }
    if (record.revision && !current) throw Error('This issue is no longer loaded. Refresh before saving.');
    const payload=issuePayload(record,current);
    let saved=await github(current ? '/issues/'+current.number : '/issues',token,current?'PATCH':'POST',payload);
    if (!current && record.status==='Done') {
      // GitHub creates new issues as open. Record the creation before attempting to close.
      const created=readIssue(saved);
      issueIndex.set(created.id,{record:created,issue:saved});
      try { saved=await github('/issues/'+saved.number,token,'PATCH',{state:'closed'}); }
      catch { return {...created,closeFailed:true}; }
    }
    const result=readIssue(saved);
    issueIndex.set(result.id,{record:result,issue:saved});
    return result;
  } finally { activeWrites--; }
}

function openSession() {
  const form=$('#session-form');
  form.reset();
  $('#connect-error').textContent='';
  $('#session-dialog').showModal();
}

function rememberedToken(value) {
  try {
    if (value===undefined) return sessionStorage.getItem(sessionKey) || '';
    if (value) sessionStorage.setItem(sessionKey,value);
    else sessionStorage.removeItem(sessionKey);
  } catch { /* Keep working in memory if browser storage is unavailable. */ }
  return '';
}

function initializeGitHubSession() {
  const dialog=$('#session-dialog');
  const connectionForm=$('#session-form');
  const action=$('#session-action');
  const submit=connectionForm.querySelector('[type="submit"]');
  $('#close-session').onclick=()=>{if(!submit.disabled)dialog.close();};
  dialog.addEventListener('cancel',event=>{if(submit.disabled)event.preventDefault();});
  dialog.addEventListener('close',()=>connectionForm.reset());
  action.onclick=()=>{
    if(!token){openSession();return;}
    if(activeWrites || refreshing)return;
    rememberedToken('');
    token='';issueIndex.clear();online=false;records=seeds;editing=null;
    action.textContent='Connect GitHub (token)';
    $('#session-status').textContent='Disconnected. Starter entries are shown.';
    $('#notice').textContent='';
    render();
  };
  async function connect(credential, remember) {
    const repository=await github('',credential);
    if(!repository.private || repository.full_name!=='jhwangt/ingenuity-season-data'){
      throw Error('This connection requires the private Ingenuity repository.');
    }
    token=credential;
    await refresh();
    if(!online)throw Error($('#notice').textContent);
    rememberedToken(remember ? credential : '');
    action.textContent='Disconnect GitHub';
    $('#session-status').textContent='Connected to the private GitHub tracker.';
  }

  const saved=rememberedToken();
  if (saved) {
    action.disabled=true;
    $('#session-status').textContent='Loading private GitHub records…';
    connect(saved,true).catch(error=>{
      rememberedToken('');
      token='';issueIndex.clear();online=false;
      $('#session-status').textContent='Could not restore the GitHub connection. Connect with your token to load private records.';
      $('#notice').textContent=error.message;
    }).finally(()=>{action.disabled=false;});
  }

  connectionForm.onsubmit=async event=>{
    event.preventDefault();
    if(submit.disabled)return;
    const credential=connectionForm.elements.token.value.trim();
    const remember=connectionForm.elements.remember.checked;
    connectionForm.reset();
    if(!/^github_pat_[A-Za-z0-9_]+$/.test(credential)){
      $('#connect-error').textContent='Enter a fine-grained GitHub token.';
      return;
    }
    submit.disabled=true;
    $('#connect-error').textContent='';
    try{
      await connect(credential,remember);
      dialog.close();
    }catch(error){
      token='';issueIndex.clear();
      $('#connect-error').textContent=error.message;
    }finally{submit.disabled=false;}
  };
}
