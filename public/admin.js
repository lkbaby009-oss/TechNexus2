const $=s=>document.querySelector(s);let key='';const fields=['name','tagline','description','smartLink','telegramUrl','adTop','adMiddle','adBottom'];function headers(){return {'Content-Type':'application/json','x-admin-key':key}}async function req(url,opt={}){const r=await fetch(url,{...opt,headers:{...headers(),...(opt.headers||{})}});const d=await r.json();if(!r.ok)throw Error(d.error||'Erro');return d}$('#loginBtn').onclick=async()=>{key=$('#key').value;try{await req('/api/admin/stats');$('#login').classList.add('hidden');$('#dashboard').classList.remove('hidden');await refresh()}catch(e){$('#loginMsg').textContent='Chave inválida ou servidor indisponível.'}};async function refresh(){const [s,st,arts]=await Promise.all([req('/api/site'),req('/api/admin/stats'),req('/api/admin/articles')]);fields.forEach(f=>$('#'+f).value=s[f]||'');$('#stats').innerHTML=`<div class="stat"><b>${st.articles}</b><span>Artigos</span></div><div class="stat"><b>${st.published}</b><span>Publicados</span></div><div class="stat"><b>${st.categories}</b><span>Categorias</span></div>`;$('#adminArticles').innerHTML=arts.map(a=>`<div class="admin-item"><div><b>${a.title}</b><br><span class="meta">${a.category} · ${a.published!==false?'Publicado':'Rascunho'}</span></div><div class="actions"><button class="btn small edit" data-id="${a.id}">Editar</button><button class="btn small del" data-id="${a.id}">Apagar</button></div></div>`).join('');document.querySelectorAll('.del').forEach(b=>b.onclick=async()=>{if(confirm('Apagar este artigo?')){await req('/api/admin/articles/'+b.dataset.id,{method:'DELETE'});refresh()}});document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>{const a=arts.find(x=>x.id===b.dataset.id);fillArticle(a)});}
$('#saveSite').onclick=async()=>{try{const body={};fields.forEach(f=>body[f]=$('#'+f).value);await req('/api/admin/site',{method:'PUT',body:JSON.stringify(body)});$('#siteMsg').textContent='Configurações guardadas.';setTimeout(()=>$('#siteMsg').textContent='',2500)}catch(e){$('#siteMsg').textContent=e.message}};
function fillArticle(a){['editId','title','category','slug','tags','excerpt','content'].forEach(f=>$('#'+f).value='');$('#editId').value=a?.id||'';if(a){$('#title').value=a.title;$('#category').value=a.category;$('#slug').value=a.slug;$('#tags').value=(a.tags||[]).join(', ');$('#excerpt').value=a.excerpt;$('#content').value=a.content;$('#featured').checked=!!a.featured;$('#published').checked=a.published!==false}else{$('#featured').checked=false;$('#published').checked=true}window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}$('#newArticle').onclick=()=>fillArticle();$('#saveArticle').onclick=async()=>{try{const body={id:$('#editId').value||undefined,title:$('#title').value,category:$('#category').value,slug:$('#slug').value,tags:$('#tags').value.split(',').map(x=>x.trim()).filter(Boolean),excerpt:$('#excerpt').value,content:$('#content').value,featured:$('#featured').checked,published:$('#published').checked};await req('/api/admin/articles',{method:'POST',body:JSON.stringify(body)});$('#articleMsg').textContent='Artigo guardado.';fillArticle();refresh()}catch(e){$('#articleMsg').textContent=e.message}};

async function loadAdminArena() {
  const box = document.querySelector('#adminArena');
  if (!box) return;

  try {
    const data = await req('/api/arena');
    const combats = Array.isArray(data.combats) ? data.combats : [];

    if (!combats.length) {
      box.innerHTML = '<p class="meta">Nenhum combate encontrado.</p>';
      return;
    }

    box.innerHTML = combats.map(combat => `
      <div class="admin-item">
        <div>
          <b>${combat.title}</b>
          <br>
          <span class="meta">
            ${combat.category} · ${combat.status === 'finished' ? 'Finalizado' : 'Ativo'}
            · A: ${combat.votesA} | B: ${combat.votesB}
          </span>
        </div>
        <div class="actions">
          ${
            combat.status !== 'finished'
              ? `<button class="btn small finish-arena" data-id="${combat.id}">Finalizar</button>`
              : `<button class="btn small delete-arena" data-id="${combat.id}">Apagar</button>`
          }
        </div>
      </div>
    `).join('');

    box.querySelectorAll('.finish-arena').forEach(button => {
      button.onclick = async () => {
        if (!confirm('Finalizar este combate?')) return;

        try {
          await req('/api/admin/arena/' + button.dataset.id + '/finish', {
            method: 'POST'
          });

          document.querySelector('#arenaMsg').textContent = 'Combate finalizado.';
          await loadAdminArena();
        } catch (error) {
          document.querySelector('#arenaMsg').textContent = error.message;
        }
      };
    });
  } catch (error) {
    box.innerHTML = '<p class="msg">Não foi possível carregar os combates.</p>';
  }
}

const createArenaButton = document.querySelector('#createArena');

if (createArenaButton) {
  createArenaButton.onclick = async () => {
    const message = document.querySelector('#arenaMsg');

    try {
      const body = {
        title: document.querySelector('#arenaTitle').value.trim(),
        category: document.querySelector('#arenaCategory').value.trim(),
        description: document.querySelector('#arenaDescription').value.trim(),
        sideA: document.querySelector('#arenaSideA').value.trim(),
        sideADescription: document.querySelector('#arenaSideADescription').value.trim(),
        sideB: document.querySelector('#arenaSideB').value.trim(),
        sideBDescription: document.querySelector('#arenaSideBDescription').value.trim(),
        endsAt: document.querySelector('#arenaEndsAt').value
          ? new Date(document.querySelector('#arenaEndsAt').value).toISOString()
          : null
      };

      if (!body.title || !body.sideA || !body.sideB) {
        throw new Error('Preencha o título, a opção A e a opção B.');
      }

      await req('/api/admin/arena', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      message.textContent = 'Combate criado com sucesso.';

      [
        'arenaTitle',
        'arenaCategory',
        'arenaDescription',
        'arenaSideA',
        'arenaSideADescription',
        'arenaSideB',
        'arenaSideBDescription',
        'arenaEndsAt'
      ].forEach(id => {
        document.querySelector('#' + id).value = '';
      });

      await loadAdminArena();
    } catch (error) {
      message.textContent = error.message;
    }
  };
}

const refreshArenaButton = document.querySelector('#refreshArena');

if (refreshArenaButton) {
  refreshArenaButton.onclick = loadAdminArena;
}

const originalRefresh = refresh;

refresh = async function () {
  await originalRefresh();
  await loadAdminArena();
};

document.querySelectorAll('.delete-arena').forEach(button => {
  button.onclick = async () => {
    if (!confirm('Apagar este combate finalizado?')) return;

    try {
      await req('/api/admin/arena/' + button.dataset.id, {
        method: 'DELETE'
      });

      document.querySelector('#arenaMsg').textContent = 'Combate apagado.';
      await loadAdminArena();
    } catch (error) {
      document.querySelector('#arenaMsg').textContent = error.message;
    }
  };
});

const adminArenaBox = document.querySelector('#adminArena');

if (adminArenaBox) {
  adminArenaBox.addEventListener('click', async event => {
    const button = event.target.closest('.delete-arena');
    if (!button) return;

    if (!confirm('Apagar este combate finalizado?')) return;

    try {
      await req('/api/admin/arena/' + button.dataset.id, {
        method: 'DELETE'
      });

      document.querySelector('#arenaMsg').textContent = 'Combate apagado.';
      await loadAdminArena();
    } catch (error) {
      document.querySelector('#arenaMsg').textContent = error.message;
    }
  });
}
