import {createHash, timingSafeEqual} from 'node:crypto';

const origin = 'https://jhwangt.github.io';
const repo = 'https://api.github.com/repos/jhwangt/ingenuity-season-data';
const digest = value => createHash('sha256').update(value).digest();
const headers = {
  'access-control-allow-origin': origin,
  'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
  'access-control-allow-headers': 'Authorization, Content-Type',
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  vary: 'Origin'
};
const reply = (status, data) => Response.json(data, {status, headers});
const error = (status, message) => reply(status,{error:message});
const integer = value => /^[1-9]\d{0,9}$/.test(value || '');

function github(path, method='GET', body) {
  return fetch(repo+path,{
    method,
    redirect:'error',
    headers:{
      accept:'application/vnd.github+json',
      authorization:'Bearer '+process.env.GITHUB_ISSUES_TOKEN,
      'content-type':'application/json',
      'user-agent':'Ingenuity-Season-HQ'
    },
    body:body === undefined ? undefined : JSON.stringify(body),
    signal:AbortSignal.timeout(12000)
  });
}

function publicIssue(issue) {
  return {number:issue.number,title:issue.title,body:issue.body,state:issue.state,
    updated_at:issue.updated_at,labels:issue.labels.map(({name})=>({name})),
    assignees:issue.assignees.map(({login})=>({login}))};
}

function validatePayload(data, method) {
  if (!data || typeof data!=='object' || Array.isArray(data)) return null;
  const keys=Object.keys(data);
  const allowed=method==='POST'?['title','body','labels']:['title','body','labels','state'];
  if (!keys.length || keys.some(key=>!allowed.includes(key))) return null;
  if ((method==='POST'||Object.hasOwn(data,'title')) &&
      (typeof data.title!=='string'||!data.title.trim()||data.title.length>256)) return null;
  if (Object.hasOwn(data,'body') && (typeof data.body!=='string'||data.body.length>20000)) return null;
  if (Object.hasOwn(data,'labels') && (!Array.isArray(data.labels)||data.labels.length>40||
      data.labels.some(label=>typeof label!=='string'||!label.trim()||label.length>50))) return null;
  if (Object.hasOwn(data,'state') && !['open','closed'].includes(data.state)) return null;
  return data;
}

export default {
  async fetch(request) {
    if (request.headers.get('origin')!==origin) return error(403,'Origin not allowed.');
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
    const {TEAM_PASSWORD:password,GITHUB_ISSUES_TOKEN:credential}=process.env;
    if (!password || !/^[\x21-\x7e]{24,128}$/.test(password) || !credential?.startsWith('github_pat_')) {
      return error(503,'Team access is not configured.');
    }
    const authorization=request.headers.get('authorization')||'';
    if (!authorization.startsWith('Bearer ') || authorization.length>135 ||
        !timingSafeEqual(digest(authorization.slice(7)),digest(password))) {
      return error(401,'Incorrect team password.');
    }

    const method=request.method;
    const query=new URL(request.url).searchParams;
    const number=query.get('number');
    const page=query.get('page');
    const check=query.get('check');
    if (![...query.keys()].every(key=>['number','page','check'].includes(key)) ||
        (number!==null&&!integer(number)) || (page!==null&&!integer(page)) ||
        (check!==null&&check!=='1') || [number,page,check].filter(value=>value!==null).length>1) {
      return error(400,'Invalid issue request.');
    }
    if (!['GET','POST','PATCH'].includes(method)) return error(405,'Method not allowed.');
    if ((method==='PATCH'&&!number) || (method==='POST'&&query.size)) return error(400,'Invalid issue request.');

    let body;
    if (method!=='GET') {
      if (Number(request.headers.get('content-length'))>85000) return error(413,'Issue is too large.');
      try {
        const raw=await request.text();
        if (raw.length>85000) return error(413,'Issue is too large.');
        body=validatePayload(JSON.parse(raw),method);
      } catch { return error(400,'Invalid issue data.'); }
      if (!body) return error(400,'Invalid issue data.');
    }

    try {
      const verification=await github('');
      if (!verification.ok) return error(502,'The tracker credential could not access GitHub.');
      const repository=await verification.json();
      if (!repository.private || repository.full_name!=='jhwangt/ingenuity-season-data') {
        return error(503,'The tracker must be private.');
      }
      if (check) return reply(200,{private:true,full_name:repository.full_name});
      if (method==='PATCH') {
        const existing=await github('/issues/'+number);
        if (!existing.ok || (await existing.json()).pull_request) return error(404,'Issue not found.');
      }
      const path=number ? '/issues/'+number : method==='GET'
        ? '/issues?state=all&sort=updated&direction=desc&per_page=100&page='+(page||1)
        : '/issues';
      const upstream=await github(path,method,body);
      if (!upstream.ok) {
        return error(upstream.status===404||upstream.status===422 ? upstream.status : 502,
          'GitHub could not '+(method==='GET'?'load':'save')+' the issue.');
      }
      const data=await upstream.json();
      if (Array.isArray(data)) return reply(200,data.map(issue=>issue.pull_request ? {pull_request:true} : publicIssue(issue)));
      if (data.pull_request) return error(404,'Issue not found.');
      return reply(upstream.status,publicIssue(data));
    } catch {
      return error(502,'Could not reach GitHub. Try again shortly.');
    }
  }
};
