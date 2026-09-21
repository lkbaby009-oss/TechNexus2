const $=s=>document.querySelector(s);let site={};let activeCategory='';let timer;let searchTimer;
async function api(url){const r=await fetch(url);if(!r.ok)throw new Error('API');return r.json()}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function card(a){return `<a class="card" href="/article.html?slug=${encodeURIComponent(a.slug)}"><span class="cat">${esc(a.category.toUpperCase())}</span><h3>${esc(a.title)}</h3><p>${esc(a.excerpt)}</p><span class="read">Ler artigo →</span></a>`}
function setLink(el,url){if(url){el.href=url;el.classList.remove('hidden')}else el.classList.add('hidden')}
function renderAd(id,html){const el=$('#'+id);if(html){el.innerHTML=html;el.classList.remove('hidden')}else{el.innerHTML='';el.classList.add('hidden')}}
function ensureSearchUI(){const box=$('#search')?.parentElement;if(!box||$('#webSearchBtn'))return;const b=document.createElement('button');b.id='webSearchBtn';b.type='button';b.textContent='⌕';b.title='Pesquisar na web com TechNexus AI';b.style.cssText='border:0;background:none;color:inherit;font-size:21px;padding:0 12px;cursor:pointer';box.appendChild(b);b.onclick=runSmartSearch}
async function load(){site=await api('/api/site');$('#siteName').textContent=site.name;$('#siteTagline').textContent=site.tagline;$('#siteDescription').textContent=site.description;setLink($('#smartHero'),site.smartLink);setLink($('#telegramBtn'),site.telegramUrl);renderAd('adTop',site.adTop);renderAd('adMiddle',site.adMiddle);renderAd('adBottom',site.adBottom);const cats=await api('/api/categories');$('#categories').innerHTML=`<button class="chip active" data-cat="">Todos <small>${cats.reduce((n,c)=>n+c.count,0)}</small></button>`+cats.map(c=>`<button class="chip" data-cat="${esc(c.name)}">${esc(c.name)} <small>${c.count}</small></button>`).join('');document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));loadArticles()});ensureSearchUI();loadArticles()}
async function loadArticles(){const q=$('#search').value.trim();try{const list=await api(`/api/articles?q=${encodeURIComponent(q)}&category=${encodeURIComponent(activeCategory)}`);$('#articles').innerHTML=list.map(card).join('');$('#empty').classList.toggle('hidden',list.length>0);$('#empty').textContent=q?`Nenhum artigo local corresponde exatamente a “${q}”. Pressione Enter ou use ⌕ para pesquisar na web.`:'Nenhum conteúdo publicado nesta categoria.';$('#searchInfo').textContent=q?`${list.length} resultado(s) locais para “${q}”`:activeCategory?`${list.length} conteúdo(s) em ${activeCategory}`:''}catch(e){console.error(e)}}
function renderSmartResult(data,q){const articles=data.articles||[];const web=data.webSources||[];let box=$('#smartResult');if(!box){box=document.createElement('div');box.id='smartResult';box.style.cssText='margin:0 0 24px;padding:22px;border:1px solid var(--line);border-radius:20px;background:var(--panel2)';$('#searchInfo').after(box)}const sources=web.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('');box.innerHTML=`<div class="eyebrow">TECHNEXUS AI · PESQUISA</div><h3 style="margin:8px 0 12px">${esc(q)}</h3><div style="line-height:1.75">${esc(data.answer||'Sem resposta.').replace(/\n/g,'<br>')}</div>${data.grounded?'<p class="search-info" style="margin:14px 0 0">🌐 Resposta baseada em pesquisa atualizada na web.</p>':''}${sources?`<div class="ai-sources"><b>Fontes consultadas</b><ul>${sources}</ul></div>`:''}${articles.length?`<div class="ai-sources"><b>Conteúdos do TechNexus</b><div class="grid" style="margin-top:14px">${articles.slice(0,3).map(card).join('')}</div></div>`:''}`;box.classList.remove('hidden')}
async function runSmartSearch(){const q=$('#search').value.trim();if(!q)return;const btn=$('#webSearchBtn');btn.disabled=true;btn.textContent='…';$('#searchInfo').textContent='Pesquisando na web e analisando os resultados…';try{const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Falha na pesquisa');renderSmartResult(data,q);const local=data.articles||[];$('#articles').innerHTML=local.map(card).join('');$('#empty').classList.toggle('hidden',local.length>0)}catch(e){$('#searchInfo').textContent=e.message}finally{btn.disabled=false;btn.textContent='⌕'}}
$('#search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(loadArticles,180);clearTimeout(searchTimer);if($('#search').value.trim().length>=40)searchTimer=setTimeout(runSmartSearch,900)});$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runSmartSearch()}});$('#clearSearch').onclick=()=>{$('#search').value='';$('#smartResult')?.remove();loadArticles();$('#search').focus()};$('#theme').onclick=()=>{document.body.classList.toggle('light');$('#theme').textContent=document.body.classList.contains('light')?'☀':'☾';localStorage.setItem('tn-theme',document.body.classList.contains('light')?'light':'dark')};if(localStorage.getItem('tn-theme')==='light'){document.body.classList.add('light');$('#theme').textContent='☀'}load().catch(e=>{$('#empty').classList.remove('hidden');$('#empty').textContent='Não foi possível carregar o conteúdo. Verifique se o servidor está ativo.';console.error(e)});

const aiAsk=$('#aiAsk');
const aiQuestion=$('#aiQuestion');
const aiStatus=$('#aiStatus');
const aiAnswer=$('#aiAnswer');

if(aiAsk){
  aiAsk.onclick=async()=>{
    const question=aiQuestion.value.trim();
    if(!question){
      aiStatus.textContent='Escreva uma pergunta primeiro.';
      return;
    }

    aiAsk.disabled=true;
    aiAsk.textContent='⏳ Consultando...';
    aiStatus.textContent='Pesquisando e analisando...';
    aiAnswer.classList.add('hidden');

    try{
      const r=await fetch('/api/ai/ask',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question})
      });

      const data=await r.json();

      if(!r.ok) throw new Error(data.error||'Não foi possível consultar a IA.');

      const sources=(data.sources||[])
        .map(a=>`<li><a href="/article.html?slug=${encodeURIComponent(a.slug||'')}">${esc(a.title)}</a></li>`)
        .join('');

      const webSources=(data.webSources||[])
        .map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`)
        .join('');

      aiAnswer.innerHTML=
        `<div class="ai-text">${esc(data.answer||'Sem resposta.').replace(/\n/g,'<br>')}</div>`+
        (sources?`<div class="ai-sources"><b>Conteúdos relacionados</b><ul>${sources}</ul></div>`:'')+
        (webSources?`<div class="ai-sources"><b>Fontes da Web</b><ul>${webSources}</ul></div>`:'');

      aiAnswer.classList.remove('hidden');
      aiStatus.textContent=data.grounded?'🌐 Resposta baseada em pesquisa atualizada na Web.':'';
    }catch(e){
      aiStatus.textContent='Erro: '+e.message;
    }finally{
      aiAsk.disabled=false;
      aiAsk.textContent='✨ Perguntar à IA';
    }
  };
}

/* ===== TECHNEXUS DECIDE — CELULARES ===== */
(function(){
  function initTechNexusDecide(){
    if(document.getElementById('tnxDecide')) return;

    const box=document.createElement('section');
    box.id='tnxDecide';
    box.innerHTML=`
      <div style="margin:32px 0;padding:28px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(145deg,#0b1220,#080d18);">
        <div style="font-size:13px;letter-spacing:4px;font-weight:800;color:#22d3ee;margin-bottom:12px;">TECHNEXUS DECIDE</div>
        <h2 style="font-size:30px;margin:0 0 10px;">🎯 Encontre o celular certo para você</h2>
        <p style="color:#94a3b8;line-height:1.7;margin-bottom:24px;">
          Não sabe qual celular comprar? Responda algumas perguntas e o TechNexus vai pesquisar e recomendar as melhores opções para o seu perfil.
        </p>

        <div style="display:grid;gap:16px;">
          <label>
            <span>💰 Qual é o seu orçamento?</span>
            <div style="display:grid;grid-template-columns:minmax(170px,1fr) minmax(120px,2fr);gap:8px;margin-top:8px;">
              <select id="decCurrency" style="width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:1px solid #334155;background:#0f172a;color:#fff;">
                <option value="USD">🇺🇸 USD — Dólar americano</option>
                <option value="EUR">🇪🇺 EUR — Euro</option>
                <option value="GBP">🇬🇧 GBP — Libra esterlina</option>
                <option value="BRL">🇧🇷 BRL — Real brasileiro</option>
                <option value="MZN" selected>🇲🇿 MZN — Metical moçambicano</option>
                <option value="ZAR">🇿🇦 ZAR — Rand sul-africano</option>
                <option value="CAD">🇨🇦 CAD — Dólar canadense</option>
                <option value="AUD">🇦🇺 AUD — Dólar australiano</option>
                <option value="JPY">🇯🇵 JPY — Iene japonês</option>
                <option value="CNY">🇨🇳 CNY — Yuan chinês</option>
                <option value="INR">🇮🇳 INR — Rupia indiana</option>
                <option value="CHF">🇨🇭 CHF — Franco suíço</option>
                <option value="AED">🇦🇪 AED — Dirham dos EAU</option>
                <option value="NGN">🇳🇬 NGN — Naira nigeriana</option>
                <option value="KRW">🇰🇷 KRW — Won sul-coreano</option>
              </select>
              <input id="decBudget" type="number" min="1" placeholder="Ex.: 15000"
                style="width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:1px solid #334155;background:#0f172a;color:#fff;">
            </div>
          </label>

          <label>
            <span>🎯 Para que você usa mais o celular?</span>
            <select id="decUse" style="width:100%;box-sizing:border-box;margin-top:8px;padding:14px;border-radius:12px;border:1px solid #334155;background:#0f172a;color:#fff;">
              <option value="">Escolha uma opção</option>
              <option>Uso geral e redes sociais</option>
              <option>Gaming</option>
              <option>Fotografia e vídeo</option>
              <option>Estudo e trabalho</option>
              <option>Um pouco de tudo</option>
            </select>
          </label>

          <label>
            <span>⭐ O que é mais importante?</span>
            <select id="decPriority" style="width:100%;box-sizing:border-box;margin-top:8px;padding:14px;border-radius:12px;border:1px solid #334155;background:#0f172a;color:#fff;">
              <option value="">Escolha uma opção</option>
              <option>Desempenho</option>
              <option>Câmera</option>
              <option>Bateria</option>
              <option>Tela</option>
              <option>Equilíbrio entre tudo</option>
            </select>
          </label>

          <label>
            <span>💾 Quanto armazenamento você quer?</span>
            <select id="decStorage" style="width:100%;box-sizing:border-box;margin-top:8px;padding:14px;border-radius:12px;border:1px solid #334155;background:#0f172a;color:#fff;">
              <option value="">Não tenho preferência</option>
              <option>64 GB</option>
              <option>128 GB</option>
              <option>256 GB</option>
              <option>512 GB ou mais</option>
            </select>
          </label>

          <label>
            <span>🏷️ Tem alguma marca preferida?</span>
            <input id="decBrand" type="text" placeholder="Ex.: Samsung, Xiaomi, Tecno, Infinix ou qualquer marca"
              style="width:100%;box-sizing:border-box;margin-top:8px;padding:14px;border-radius:12px;border:1px solid #334155;background:#0f172a;color:#fff;">
          </label>

          <label>
            <span>📝 Existe alguma exigência especial?</span>
            <textarea id="decExtra" rows="3" placeholder="Ex.: Quero bateria muito boa e que não fique lento nos jogos."
              style="width:100%;box-sizing:border-box;margin-top:8px;padding:14px;border-radius:12px;border:1px solid #334155;background:#0f172a;color:#fff;resize:vertical;"></textarea>
          </label>

          <button id="decButton" style="padding:16px;border:0;border-radius:14px;background:#f1f5f9;color:#0f172a;font-size:16px;font-weight:800;cursor:pointer;">
            🎯 Encontrar meu celular
          </button>

          <div id="decStatus" style="color:#94a3b8;"></div>
          <div id="decResult" style="display:none;padding:20px;border-radius:16px;background:#0f172a;border:1px solid #334155;line-height:1.7;"></div>
        </div>
      </div>
    `;

    const aiSection=document.getElementById('aiAsk')?.closest('section');
    if(aiSection && aiSection.parentNode){
      aiSection.parentNode.insertBefore(box,aiSection.nextSibling);
    }else{
      document.body.appendChild(box);
    }

    document.getElementById('decButton').onclick=async()=>{
      const budget=document.getElementById('decBudget').value.trim();
      const currency=document.getElementById('decCurrency').value;
      const currencyName=document.getElementById('decCurrency').selectedOptions[0].textContent;
const marketMap={
  MZN:'Moçambique',
  USD:'Estados Unidos',
  EUR:'Europa (zona do euro)',
  GBP:'Reino Unido',
  BRL:'Brasil',
  ZAR:'África do Sul',
  CAD:'Canadá',
  AUD:'Austrália',
  JPY:'Japão',
  CNY:'China',
  INR:'Índia',
  CHF:'Suíça',
  AED:'Emirados Árabes Unidos',
  NGN:'Nigéria',
  KRW:'Coreia do Sul'
};
const market=marketMap[currency]||'mercado internacional';
      const use=document.getElementById('decUse').value;
      const priority=document.getElementById('decPriority').value;
      const storage=document.getElementById('decStorage').value;
      const brand=document.getElementById('decBrand').value.trim() || 'qualquer marca';
      const extra=document.getElementById('decExtra').value.trim() || 'nenhuma';

      if(!budget || !use || !priority){
        document.getElementById('decStatus').textContent='⚠️ Preencha pelo menos orçamento, uso principal e prioridade.';
        return;
      }

      const button=document.getElementById('decButton');
      const status=document.getElementById('decStatus');
      const result=document.getElementById('decResult');

      button.disabled=true;
      button.textContent='⏳ Pesquisando as melhores opções...';
      status.textContent='O TechNexus está analisando suas necessidades e pesquisando informações atuais.';
      result.style.display='none';

      const question=`Atue como o motor TechNexus Decide, um assistente de decisão de compra de tecnologia.

O usuário informou:
- Orçamento máximo: ${budget} ${currency} (${currencyName})
- Mercado/país principal: ${market}
- Uso principal: ${use}
- Prioridade principal: ${priority}
- Armazenamento desejado: ${storage || 'sem preferência'}
- Marca preferida: ${brand}
- Exigência especial: ${extra}

REGRAS OBRIGATÓRIAS:

1. PESQUISA E DESCOBERTA
Pesquise informações atuais na Web usando a Pesquisa Google disponível nesta chamada.

Primeiro faça uma DESCOBERTA AMPLA de candidatos.
Não escolha o primeiro produto encontrado.
Não encerre a pesquisa depois de encontrar apenas um ou dois modelos.

Quando o usuário indicar uma marca específica, pesquise também as principais linhas e gerações atuais dessa marca que possam atender aos critérios.

Exemplo:
Se a marca for Samsung, considere quando relevante famílias como Galaxy S, S Ultra, S Plus, S FE, Z e A, procurando primeiro os modelos que melhor correspondam ao uso e à prioridade solicitados.

Se o usuário pedir um tipo específico de produto, procure várias famílias e modelos relevantes antes de decidir.

2. MERCADO
O mercado selecionado é ${market}.
Priorize lojas, varejistas, marketplaces e vendedores identificáveis desse mercado.

Não substitua o mercado selecionado por Moçambique ou outro país.

3. ORÇAMENTO
O orçamento de ${budget} ${currency} é o LIMITE MÁXIMO.

Não trate o orçamento como preço-alvo.
Não escolha um produto apenas porque está próximo do limite.
Não descarte um produto simplesmente porque seu preço não foi encontrado.

Um produto só pode ser classificado como "acima do orçamento" quando existir um preço verificável que realmente ultrapasse ${budget} ${currency}.

4. ATÉ 5 CANDIDATOS
Depois da descoberta, procure até 5 candidatos realmente relevantes.

Se encontrar apenas 2, 3 ou 4 candidatos confiáveis, mostre somente esses.
Nunca invente produtos para completar a lista.

5. VERIFICAÇÃO DE PREÇO
Para cada candidato, tente encontrar uma oferta atual verificável no mercado selecionado.

Sempre que possível informe:
- modelo exato;
- configuração exata;
- armazenamento;
- RAM quando relevante;
- preço atual;
- moeda;
- loja ou vendedor;
- disponibilidade;
- fonte.

Não invente preços, lojas, links, disponibilidade ou configurações.

Se o preço atual não puder ser suficientemente verificado, escreva exatamente:
"Preço atual não verificado"

IMPORTANTE:
"Preço atual não verificado" NÃO significa "acima do orçamento".

Nunca transforme falta de informação em uma conclusão de que o produto está acima do orçamento.

6. CLASSIFICAÇÃO DOS CANDIDATOS
Classifique cada candidato em uma destas situações:

🟢 DENTRO DO ORÇAMENTO — preço atual verificável e igual ou inferior ao orçamento.

🟡 PREÇO NÃO VERIFICADO — produto relevante encontrado, mas preço atual insuficientemente verificável.

🔴 ACIMA DO ORÇAMENTO — somente quando houver preço atual verificável superior ao orçamento.

Não confunda essas três situações.

7. FILTRO DE CRITÉRIOS
Avalie cada candidato em relação a:
- orçamento;
- mercado;
- uso principal;
- prioridade;
- armazenamento;
- marca;
- exigência especial.

Não elimine automaticamente um candidato apenas porque seu preço não foi encontrado.
Mostre-o como "Preço atual não verificado" quando ele continuar sendo relevante.

8. COMPARAÇÃO
Apresente as melhores opções encontradas.

Para cada opção, explique de forma curta:
- preço/status do preço;
- principais vantagens;
- principais desvantagens;
- desempenho para o uso informado;
- atendimento à prioridade;
- atendimento à exigência especial;
- relação entre características e orçamento.

9. RECOMENDAÇÃO FINAL
Depois de pesquisar e comparar, escolha UMA recomendação principal.

A recomendação deve ser escolhida entre os candidatos 🟢 DENTRO DO ORÇAMENTO.

Não escolha simplesmente:
- o mais caro;
- o mais novo;
- o mais próximo do orçamento;
- o primeiro encontrado.

Escolha o produto que melhor atende às prioridades reais do usuário.

Explique:
- por que venceu;
- quais critérios atende melhor;
- quais são seus pontos fracos;
- por que as outras opções ficaram atrás.

10. QUANDO NÃO HOUVER OPÇÃO CONFIRMADA
Se nenhum candidato tiver preço atual verificável dentro do orçamento, diga claramente:

"Não encontrei uma opção com preço atual suficientemente verificável dentro do orçamento."

Nesse caso, NÃO invente um vencedor.

Você pode mostrar candidatos relevantes com:
"Preço atual não verificado"

mas não deve tratá-los como compras confirmadas dentro do orçamento.

11. PRODUTOS ACIMA DO ORÇAMENTO
Produtos acima do orçamento podem ser mostrados apenas como referência quando forem relevantes.

Eles devem ser claramente marcados como:
"Acima do orçamento"

e nunca podem ser apresentados como recomendação principal dentro do orçamento.

12. RESPOSTA
Responda em português, de forma direta e organizada.

Estruture a resposta assim:

1. Melhores opções encontradas
2. Comparação rápida
3. Recomendação principal
4. Por que escolhi esta opção
5. Pontos fracos
6. Outras opções / referências, quando relevantes

Não diga apenas "depende".
Não diga que o TechNexus não possui um artigo.
Não force uma recomendação quando os dados não forem suficientes.`;

      try{
        const response=await fetch('/api/ai/ask',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({question})
        });

        const data=await response.json();
        if(!response.ok) throw new Error(data.error || 'Não foi possível concluir a recomendação.');

        result.innerHTML=`
          <div style="font-size:13px;letter-spacing:2px;font-weight:800;color:#22d3ee;margin-bottom:10px;">RECOMENDAÇÃO PERSONALIZADA</div>
          <div>${esc(data.answer || 'Não foi possível gerar uma recomendação.').replace(/\n/g,'<br>')}</div>
        `;
        result.style.display='block';
        status.textContent=data.grounded ? '🌐 Recomendação baseada em pesquisa atualizada na Web.' : 'Recomendação gerada pela IA.';
      }catch(error){
        status.textContent='❌ '+error.message;
      }finally{
        button.disabled=false;
        button.textContent='🎯 Encontrar meu celular';
      }
    };
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initTechNexusDecide);
  }else{
    initTechNexusDecide();
  }
})();

/* =========================
   TECHNEXUS ARENA v1
   ========================= */

const arenaList = document.querySelector('#arenaList');
const arenaStatus = document.querySelector('#arenaStatus');
const arenaRefresh = document.querySelector('#arenaRefresh');

let arenaFilter = 'active';

function ensureArenaFilters() {
  if (!arenaStatus || document.querySelector('#arenaFilters')) return;

  const filters = document.createElement('div');
  filters.id = 'arenaFilters';
  filters.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 18px;';
  filters.innerHTML = `
    <button type="button" class="btn ghost arena-filter active" data-arena-filter="active">Ao vivo</button>
    <button type="button" class="btn ghost arena-filter" data-arena-filter="finished">Finalizadas</button>
    <button type="button" class="btn ghost arena-filter" data-arena-filter="all">Todas</button>
  `;

  arenaStatus.parentNode.insertBefore(filters, arenaStatus);

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-arena-filter]');
    if (!button) return;

    arenaFilter = button.dataset.arenaFilter || 'active';

    filters.querySelectorAll('[data-arena-filter]').forEach(item => {
      item.classList.toggle('active', item === button);
    });

    loadArena();
  });
}


function arenaEscape(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    "'":'&#39;',
    '"':'&quot;'
  }[c]));
}

function arenaPercent(a, b) {
  const total = Number(a || 0) + Number(b || 0);
  if (!total) return [0, 0];
  return [
    Math.round((Number(a || 0) / total) * 100),
    Math.round((Number(b || 0) / total) * 100)
  ];
}

function renderArenaCombat(combat) {
  const votesA = Number(combat.votesA || 0);
  const votesB = Number(combat.votesB || 0);
  const [percentA, percentB] = arenaPercent(votesA, votesB);

  const finished = combat.status === 'finished';

  let result = '';

  if (finished) {
    if (combat.winner === 'A') {
      result = `<div class="arena-result">🏆 Vencedor: <strong>${arenaEscape(combat.sideA.name)}</strong></div>`;
    } else if (combat.winner === 'B') {
      result = `<div class="arena-result">🏆 Vencedor: <strong>${arenaEscape(combat.sideB.name)}</strong></div>`;
    } else {
      result = `<div class="arena-result">🤝 Resultado: empate</div>`;
    }
  }

  return `
    <article class="arena-card">
      <div class="arena-card-top">
        <span class="cat">${arenaEscape(String(combat.category || 'TECNOLOGIA').toUpperCase())}</span>
        <span class="arena-state ${finished ? 'finished' : 'active'}">
          ${finished ? 'ENCERRADO' : '● AO VIVO'}
        </span>
      </div>

      <h3>${arenaEscape(combat.title)}</h3>

      ${combat.description
        ? `<p class="arena-description">${arenaEscape(combat.description)}</p>`
        : ''}

      <div class="arena-battle">

        <div class="arena-side">
          <div class="arena-side-label">A</div>
          <h4>${arenaEscape(combat.sideA?.name || 'Opção A')}</h4>

          ${combat.sideA?.description
            ? `<p>${arenaEscape(combat.sideA.description)}</p>`
            : ''}

          <strong class="arena-votes">${votesA} voto${votesA === 1 ? '' : 's'}</strong>

          <button
            class="btn primary arena-vote"
            data-arena-id="${arenaEscape(combat.id)}"
            data-arena-side="A"
            ${finished ? 'disabled' : ''}
          >
            Votar em A
          </button>
        </div>

        <div class="arena-vs">VS</div>

        <div class="arena-side">
          <div class="arena-side-label">B</div>
          <h4>${arenaEscape(combat.sideB?.name || 'Opção B')}</h4>

          ${combat.sideB?.description
            ? `<p>${arenaEscape(combat.sideB.description)}</p>`
            : ''}

          <strong class="arena-votes">${votesB} voto${votesB === 1 ? '' : 's'}</strong>

          <button
            class="btn primary arena-vote"
            data-arena-id="${arenaEscape(combat.id)}"
            data-arena-side="B"
            ${finished ? 'disabled' : ''}
          >
            Votar em B
          </button>
        </div>

      </div>

      <div class="arena-results">
        <div class="arena-result-row">
          <span>${arenaEscape(combat.sideA?.name || 'A')}</span>
          <strong>${percentA}%</strong>
        </div>

        <div class="arena-bar">
          <span style="width:${percentA}%"></span>
        </div>

        <div class="arena-result-row">
          <span>${arenaEscape(combat.sideB?.name || 'B')}</span>
          <strong>${percentB}%</strong>
        </div>

        <div class="arena-bar">
          <span style="width:${percentB}%"></span>
        </div>
      </div>

      ${result}
    </article>
  `;
}

async function loadArena() {
  if (!arenaList || !arenaStatus) return;

  ensureArenaFilters();
  arenaStatus.textContent = 'Carregando combates...';

  try {
    const response = await fetch('/api/arena');

    if (!response.ok) {
      throw new Error('Falha ao carregar Arena');
    }

    const data = await response.json();
    const allCombats = Array.isArray(data.combats) ? data.combats : [];
    const combats = arenaFilter === 'all'
      ? allCombats
      : allCombats.filter(combat => (combat.status === 'finished') === (arenaFilter === 'finished'));

    if (!combats.length) {
      arenaList.innerHTML = `
        <div class="arena-empty">
          <strong>Nenhum combate disponível.</strong>
          <p>Novos combates aparecerão aqui quando forem publicados.</p>
        </div>
      `;

      arenaStatus.textContent = 'Arena pronta.';
      return;
    }

    arenaList.innerHTML = combats
      .map(renderArenaCombat)
      .join('');

    arenaStatus.textContent =
      `${combats.length} combate${combats.length === 1 ? '' : 's'} disponível${combats.length === 1 ? '' : 'is'}.`;

  } catch (error) {
    console.error('TechNexus Arena:', error);

    arenaStatus.textContent = 'Não foi possível carregar a Arena.';
    arenaList.innerHTML = `
      <div class="arena-empty">
        <strong>Erro ao carregar os combates.</strong>
        <p>Tente atualizar novamente.</p>
      </div>
    `;
  }
}

function getArenaVoterId() {
  const key = 'technexus_arena_voter_id';
  let voterId = localStorage.getItem(key);

  if (voterId === '') {
    voterId = '';
  }

  if (voterId === null) {
    voterId = window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : 'tnx-' + Date.now() + '-' + Math.random().toString(36).slice(2);

    localStorage.setItem(key, voterId);
  }

  return voterId;
}

async function voteArena(id, side) {
  try {
    const response = await fetch(`/api/arena/${encodeURIComponent(id)}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ side, voterId: getArenaVoterId() })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Não foi possível registrar o voto.');
    }

    await loadArena();

  } catch (error) {
    console.error('TechNexus Arena vote:', error);
    alert(error.message || 'Não foi possível registrar o voto.');
  }
}

if (arenaList) {
  arenaList.addEventListener('click', event => {
    const button = event.target.closest('.arena-vote');

    if (!button || button.disabled) return;

    const id = button.dataset.arenaId;
    const side = button.dataset.arenaSide;

    if (id && side) {
      voteArena(id, side);
    }
  });
}

if (arenaRefresh) {
  arenaRefresh.addEventListener('click', loadArena);
}

loadArena();

