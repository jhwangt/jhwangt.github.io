'use strict';

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
    token='';issueIndex.clear();online=false;records=seeds;editing=null;
    action.textContent='Connect GitHub';
    $('#session-status').textContent='Disconnected. Starter entries are shown.';
    $('#notice').textContent='';
    render();
  };
  connectionForm.onsubmit=async event=>{
    event.preventDefault();
    if(submit.disabled)return;
    const credential=connectionForm.elements.token.value.trim();
    connectionForm.reset();
    if(!/^github_pat_[A-Za-z0-9_]+$/.test(credential)){
      $('#connect-error').textContent='Enter a fine-grained GitHub token.';
      return;
    }
    submit.disabled=true;
    $('#connect-error').textContent='';
    try{
      const repository=await github('',credential);
      if(!repository.private || repository.full_name!=='jhwangt/ingenuity-season-data'){
        throw Error('This connection requires the private Ingenuity repository.');
      }
      token=credential;
      await refresh();
      if(!online)throw Error($('#notice').textContent);
      action.textContent='Disconnect GitHub';
      $('#session-status').textContent='Connected to the private GitHub tracker.';
      dialog.close();
    }catch(error){
      token='';issueIndex.clear();
      $('#connect-error').textContent=error.message;
    }finally{submit.disabled=false;}
  };
}
