const categories = ['Goals','Rules','Robot','Autonomous','Outreach','Events','Meetings'];
const statuses = ['Planned','In progress','Blocked','Done'];
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(html, {headers:{'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff'}});
    }
    if (url.pathname !== '/api/records') return new Response('Not found',{status:404});
    const json = (value, status=200) => Response.json(value,{status,headers:{'cache-control':'no-store'}});
    try {
      if (request.method === 'GET') {
        const {results} = await env.DB.prepare('SELECT data, revision FROM records').all();
        return json(results.map(row=>({...JSON.parse(row.data),revision:row.revision})));
      }
      if (request.method !== 'PUT') return json({error:'Method unavailable'},405);
      if (request.headers.get('origin') !== url.origin) return json({error:'Origin rejected'},403);
      const raw = await request.text();
      if (raw.length > 20000) return json({error:'Record is too long'},413);
      let input;
      try { input = JSON.parse(raw); } catch { return json({error:'Invalid record'},400); }
      if (!input || typeof input.id !== 'string' || !/^[\w-]{1,80}$/.test(input.id) ||
          !categories.includes(input.category) || !statuses.includes(input.status) ||
          typeof input.title !== 'string' || !input.title.trim() || input.title.length > 140 ||
          !Number.isSafeInteger(input.revision) || input.revision < 0) return json({error:'Invalid record'},400);
      const record = {id:input.id,category:input.category,status:input.status,title:input.title.trim(),tentative:input.tentative===true,updated:new Date().toISOString()};
      for (const key of ['owner','due','notes','next','source','by']) {
        if (typeof input[key] !== 'string' || input[key].length > (key==='notes'?8000:500)) return json({error:'Invalid '+key},400);
        record[key] = input[key].trim();
      }
      if (record.source && !/^https?:\/\//i.test(record.source)) return json({error:'Use an http or https source link'},400);
      const data = JSON.stringify(record);
      const result = input.revision === 0
        ? await env.DB.prepare('INSERT INTO records (id,data) VALUES (?,?) ON CONFLICT(id) DO NOTHING').bind(record.id,data).run()
        : await env.DB.prepare('UPDATE records SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(data,record.id,input.revision).run();
      return result.meta.changes ? json({...record,revision:input.revision+1}) : json({error:'Someone updated this entry. Copy any unsaved notes, close the editor and refresh before trying again.'},409);
    } catch (error) {
      console.error(error);
      return json({error:'Shared storage is unavailable. Try again shortly.'},503);
    }
  }
};
