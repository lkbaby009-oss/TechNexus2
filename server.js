const crypto = require('node:crypto');
const express = require('express');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = process.env.ADMIN_KEY || 'technexus-local-admin';
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const PUBLIC = path.join(ROOT, 'public');
const siteFile = path.join(DATA, 'site.json');
const articlesFile = path.join(DATA, 'articles.json');

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC));

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}
function slugify(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'artigo';
}
function normalize(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function auth(req, res, next) {
  if (req.get('x-admin-key') !== ADMIN_KEY) return res.status(401).json({ error: 'Não autorizado' });
  next();
}

const defaultSite = {
  name: 'TechNexus',
  tagline: 'Tecnologia que faz sentido.',
  description: 'IA, tecnologia, smartphones, hardware, gaming, cibersegurança e inovação explicados de forma simples.',
  smartLink: '',
  telegramUrl: '',
  adTop: '',
  adMiddle: '',
  adBottom: '',
  featuredCategory: 'IA',
  updatedAt: new Date().toISOString()
};

const defaultArticles = [
  ['IA','Ferramentas de IA que realmente ajudam em 2026','Descubra como escolher ferramentas de inteligência artificial para trabalho, estudo, criação e produtividade.',['IA','Ferramentas','Produtividade']],
  ['IA','ChatGPT, Gemini e Claude: como escolher a IA certa','Uma comparação prática dos pontos que mais importam antes de escolher um assistente de IA.',['IA','ChatGPT','Gemini','Claude']],
  ['IA','Como usar IA para criar conteúdo mais rápido','Fluxos simples para transformar ideias em textos, imagens, pesquisas e roteiros com mais eficiência.',['IA','Conteúdo','Criadores']],
  ['IA','IA no celular: recursos que já fazem diferença','O que a inteligência artificial consegue fazer diretamente no smartphone e onde ela ainda falha.',['IA','Android','Smartphones']],
  ['Smartphones','Como escolher um smartphone em 2026','Processador, bateria, tela, câmera, memória e atualizações: o que realmente importa para cada perfil.',['Smartphones','Guia','Compras']],
  ['Smartphones','Snapdragon vs Dimensity: qual processador é melhor?','Entenda desempenho, eficiência e recursos sem ficar preso apenas aos números de benchmark.',['Smartphones','Snapdragon','MediaTek']],
  ['Smartphones','Quanto de RAM um celular realmente precisa?','Veja quando 8 GB, 12 GB ou mais fazem sentido e quando a memória extra não muda a experiência.',['Smartphones','RAM','Android']],
  ['Smartphones','AMOLED, OLED e LCD: qual tela escolher?','Uma explicação direta sobre brilho, contraste, consumo e qualidade de imagem.',['Smartphones','Display','OLED']],
  ['Hardware','CPU, GPU e RAM: o que afeta o desempenho','Entenda como os principais componentes trabalham juntos em jogos, edição e tarefas pesadas.',['Hardware','CPU','GPU','RAM']],
  ['Hardware','NVIDIA vs AMD: como escolher uma GPU','Os critérios que realmente ajudam a escolher uma placa gráfica para jogos e criação.',['GPU','NVIDIA','AMD','Gaming']],
  ['Hardware','SSD NVMe vs SATA: vale a pena trocar?','Veja as diferenças de velocidade, temperatura, preço e uso real.',['Hardware','SSD','PC']],
  ['Gaming','Como montar um PC para jogar sem desperdiçar dinheiro','Uma estratégia para equilibrar GPU, CPU, RAM, armazenamento e fonte de alimentação.',['Gaming','PC','Hardware']],
  ['Gaming','FPS, resolução e taxa de atualização explicados','O que cada número significa e como eles mudam a experiência de jogo.',['Gaming','FPS','Monitor']],
  ['Gaming','Melhores ajustes para melhorar desempenho nos jogos','Configurações que podem reduzir travamentos e melhorar estabilidade sem destruir a qualidade visual.',['Gaming','Desempenho','PC']],
  ['Cibersegurança','Como proteger suas contas contra roubo','Passos práticos: senhas únicas, autenticação em dois fatores, recuperação e alertas.',['Cibersegurança','Segurança','Contas']],
  ['Cibersegurança','Phishing: como identificar uma mensagem falsa','Sinais comuns em emails, mensagens e páginas que tentam roubar seus dados.',['Cibersegurança','Phishing','Privacidade']],
  ['Startups','O que torna uma startup realmente escalável?','Produto, distribuição, custos e tecnologia: os fundamentos por trás de negócios digitais.',['Startups','Negócios','Tecnologia']],
  ['Programação','JavaScript, Python ou Kotlin: por onde começar?','Uma visão prática para escolher uma linguagem de programação de acordo com o objetivo.',['Programação','Python','JavaScript','Kotlin']],
  ['Programação','APIs explicadas: como aplicações conversam entre si','Entenda endpoints, requisições, respostas e autenticação com exemplos simples.',['Programação','API','Web']],
  ['Inovação','Robótica e IA: onde elas se encontram','Como sensores, modelos de IA e automação estão mudando máquinas e serviços.',['Inovação','Robótica','IA']]
].map((x, i) => ({
  id: String(i + 1), title: x[1], slug: slugify(x[1]), category: x[0], excerpt: x[2],
  content: `<p>${x[2]}</p><h2>O que você precisa saber</h2><p>Antes de escolher uma tecnologia, compare o objetivo, o custo, a compatibilidade e a experiência de uso. Números isolados raramente contam toda a história.</p><h2>Na prática</h2><p>Use esta informação como ponto de partida e compare modelos, ferramentas e soluções de acordo com o seu cenário.</p>`,
  tags: x[3], featured: i < 4, published: true, createdAt: new Date(Date.now() - i * 86400000).toISOString()
}));

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(siteFile)) writeJson(siteFile, defaultSite);
if (!fs.existsSync(articlesFile)) writeJson(articlesFile, defaultArticles);

function allPublished() { return readJson(articlesFile, []).filter(a => a.published !== false); }
function scoreArticle(article, query) {
  const q = normalize(query); if (!q) return 0;
  const terms = q.split(/\s+/).filter(Boolean);
  const title = normalize(article.title), excerpt = normalize(article.excerpt), category = normalize(article.category), tags = normalize((article.tags || []).join(' ')), content = normalize(article.content);
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 10;
    if (tags.includes(term)) score += 7;
    if (category.includes(term)) score += 6;
    if (excerpt.includes(term)) score += 4;
    if (content.includes(term)) score += 1;
  }
  if (title.includes(q)) score += 15;
  return score;
}

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'TechNexus 2.1', ai: Boolean(process.env.GEMINI_API_KEY), time: new Date().toISOString() }));

const MAX_AI_CONCURRENT = 2;
let activeAiRequests = 0;
const aiRequestQueue = [];

function acquireAiSlot() {
  if (activeAiRequests < MAX_AI_CONCURRENT) {
    activeAiRequests++;
    return Promise.resolve();
  }

  return new Promise(resolve => {
    aiRequestQueue.push(resolve);
  });
}

function releaseAiSlot() {
  const next = aiRequestQueue.shift();

  if (next) {
    next();
  } else {
    activeAiRequests--;
  }
}

const searchCache = new Map();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;
const SEARCH_CACHE_MAX = 100;

function getSearchCache(key) {
  const item = searchCache.get(key);
  if (!item) return null;

  if (Date.now() - item.timestamp > SEARCH_CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }

  return item.data;
}

function setSearchCache(key, data) {
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }

  searchCache.set(key, {
    timestamp: Date.now(),
    data
  });
}

async function runGroundedSearch(question) {
  const cacheKey = question.trim().toLowerCase();
  const cached = getSearchCache(cacheKey);

  if (cached) {
    console.log("TechNexus cache HIT:", question);
    return cached;
  }

  console.log("TechNexus Decide v2:", question);

  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(
      new Error("IA não configurada no servidor."),
      { status: 503 }
    );
  }

  const articles = allPublished();

  const ranked = articles
    .map(a => ({ a, score: scoreArticle(a, question) }))
    .sort((x, y) =>
      y.score - x.score ||
      new Date(y.a.createdAt) - new Date(x.a.createdAt)
    )
    .slice(0, 8)
    .map(({ a }) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      category: a.category,
      excerpt: a.excerpt,
      tags: a.tags || []
    }));

  const context = ranked
    .map((a, i) =>
      `${i + 1}. ${a.title} [${a.category}]
Resumo: ${a.excerpt}
Tags: ${(a.tags || []).join(", ")}`
    )
    .join("\n\n");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const isDecide =
    /motor TechNexus Decide|TechNexus Decide/i.test(question);

  await acquireAiSlot();

  console.log(
    "TechNexus AI slot:",
    activeAiRequests,
    "ativos,",
    aiRequestQueue.length,
    "na fila"
  );

  const allWebSources = [];

  async function searchWeb(prompt, etapa) {
    console.log(`TechNexus Decide: ${etapa}`);

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = String(result.text || "").trim();

      const metadata =
        result.candidates?.[0]?.groundingMetadata || {};

      const chunks =
        Array.isArray(metadata.groundingChunks)
          ? metadata.groundingChunks
          : [];

      const sources = chunks
        .map(c => c?.web)
        .filter(w => w?.uri)
        .map(w => ({
          title: String(w.title || w.uri),
          url: String(w.uri)
        }));

      allWebSources.push(...sources);

      return text;
    } catch (error) {
      const status =
        Number(error?.status) ||
        Number(error?.code);

      const message = String(error?.message || "");

      if (
        status === 429 ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("quota")
      ) {
        throw Object.assign(
          new Error(
            "A quota da API do Gemini foi atingida temporariamente. Tente novamente mais tarde."
          ),
          { status: 429 }
        );
      }

      throw error;
    }
  }

  try {
    let answer;

    if (isDecide) {
      const today = new Date().toISOString().slice(0, 10);

      /*
       * ETAPA 1 — DESCOBERTA
       *
       * O objetivo aqui NÃO é escolher um produto.
       * É descobrir candidatos atuais e relevantes.
       */
      const discoveryPrompt = `
Você é a ETAPA 1 do TechNexus Decide.

Data atual: ${today}

PEDIDO COMPLETO DO USUÁRIO:
${question}

OBJETIVO:
Faça uma descoberta ampla do mercado solicitado.

NÃO escolha ainda o vencedor.
NÃO faça uma recomendação final.

Primeiro identifique:
- categoria exata do produto;
- marcas relevantes;
- famílias/linhas relevantes;
- gerações atuais;
- gerações anteriores relevantes;
- variantes/configurações relevantes;
- até 10 candidatos inicialmente.

REGRAS:

1. O país/mercado informado pelo usuário é obrigatório.
Pesquise nesse mercado.

2. Se for um produto com gerações numeradas, procure explicitamente a geração mais recente antes de considerar gerações antigas.

3. Se houver marca preferida, pesquise várias famílias dessa marca, mas também descubra alternativas relevantes de outras marcas.

4. Não use a quantidade de resultados como sinal de qualidade.

5. Não escolha automaticamente o modelo mais novo, mais caro ou mais potente.

6. Para smartphones Samsung, por exemplo, pesquise as linhas atuais e relevantes como Galaxy S, S Ultra, S+, S FE, Z e A quando fizer sentido para o orçamento e uso.

7. Para outras categorias, adapte a descoberta à categoria:
notebooks, PCs, GPUs, CPUs, consoles, monitores, TVs, áudio, periféricos, câmeras e outras tecnologias.

8. Pesquise na Web agora usando Google Search.

9. Procure páginas atuais e páginas comerciais do mercado solicitado.

10. Para Moçambique, procure especificamente lojas, vendedores, marketplaces e ofertas localizadas em Moçambique. Não conclua que um produto não existe apenas porque aparecem poucos resultados.

RETORNE:
Uma lista de candidatos com:
- modelo exato;
- geração;
- configuração conhecida;
- por que é relevante;
- possíveis lojas/vendedores encontrados;
- qualquer preço encontrado, SEM tratá-lo ainda como preço confirmado.

Não invente candidatos.
`;

      const discovery = await searchWeb(
        discoveryPrompt,
        "ETAPA 1 — descoberta ampla"
      );

      /*
       * ETAPA 2 — VERIFICAÇÃO DE PREÇOS
       *
       * Aqui a pesquisa deixa de ser genérica.
       * Cada candidato precisa ser investigado individualmente.
       */
      const verificationPrompt = `
Você é a ETAPA 2 do TechNexus Decide.

Data atual: ${today}

PEDIDO ORIGINAL DO USUÁRIO:
${question}

RESULTADO DA DESCOBERTA:
${discovery}

Agora faça uma PESQUISA COMERCIAL ESPECÍFICA.

Não escolha o vencedor ainda.

Para CADA candidato relevante da descoberta, pesquise separadamente na Web usando Google Search.

Para cada produto tente verificar:

- modelo exato;
- geração;
- variante;
- RAM;
- armazenamento;
- processador/chip quando relevante;
- condição: novo/usado/recondicionado;
- preço atual;
- moeda;
- loja ou vendedor;
- país;
- disponibilidade;
- fonte.

REGRAS DE PREÇO:

1. O preço precisa pertencer ao mercado solicitado pelo usuário.

2. Não use automaticamente preço dos EUA para Brasil.

3. Não use automaticamente preço do Brasil para Moçambique.

4. Não use preço de lançamento como preço atual sem confirmação.

5. Não transforme preço antigo em preço atual.

6. Não transforme preço de outro país em preço do mercado solicitado.

7. Se encontrar apenas especificações, mas não conseguir confirmar preço atual, escreva exatamente:

"Preço atual não verificado"

8. "Preço atual não verificado" NÃO significa acima do orçamento.

9. Só escreva:

"ACIMA DO ORÇAMENTO"

quando houver um preço atual verificável no mercado solicitado que ultrapasse o limite informado.

10. Só escreva:

"DENTRO DO ORÇAMENTO"

quando houver preço atual verificável no mercado solicitado igual ou inferior ao limite.

IMPORTANTE PARA MOÇAMBIQUE:
Faça buscas específicas por Moçambique.
Procure lojas locais, vendedores locais, marketplaces e páginas comerciais que indiquem venda/entrega em Moçambique.
Se não conseguir confirmar o preço, preserve o candidato e marque "Preço atual não verificado".

Não invente preço, loja, vendedor ou disponibilidade.

RETORNE UMA TABELA/ESTRUTURA CLARA PARA CADA CANDIDATO:
Modelo:
Configuração:
Preço:
Moeda:
Loja/vendedor:
Condição:
Disponibilidade:
Estado do preço:
Fonte:
Observações:

Faça a pesquisa agora.
`;

      const verification = await searchWeb(
        verificationPrompt,
        "ETAPA 2 — verificação de preços"
      );

      /*
       * ETAPA 3 — DECISÃO
       *
       * Nenhuma nova descoberta genérica.
       * A decisão é feita usando os candidatos e preços
       * obtidos nas duas etapas anteriores.
       */
      const finalPrompt = `
Você é a ETAPA 3, o DECISOR FINAL do TechNexus Decide.

Data atual: ${today}

PEDIDO ORIGINAL:
${question}

DESCOBERTA:
${discovery}

VERIFICAÇÃO COMERCIAL:
${verification}

Agora compare os candidatos.

REGRAS ABSOLUTAS:

1. O orçamento informado pelo usuário é LIMITE MÁXIMO.

2. Uma opção 🟢 DENTRO DO ORÇAMENTO precisa ter preço atual verificável no mercado solicitado.

3. Uma opção 🟡 PREÇO NÃO VERIFICADO não pode ser tratada como compra confirmada.

4. Uma opção 🔴 ACIMA DO ORÇAMENTO só pode receber esse estado quando houver preço atual verificável acima do limite.

5. Não escolha o primeiro resultado.

6. Não escolha o produto mais caro automaticamente.

7. Não escolha o produto mais novo automaticamente.

8. Não escolha o produto mais potente automaticamente.

9. Não tente gastar todo o orçamento.

10. Considere conjuntamente:
- uso;
- prioridade;
- geração;
- desempenho;
- configuração;
- armazenamento;
- RAM;
- condição;
- resistência;
- preço;
- custo-benefício;
- disponibilidade;
- exigência especial.

11. Se a marca preferida tiver uma boa opção, considere-a, mas não ignore alternativas melhores que atendam aos critérios.

12. Mostre NO MÁXIMO 5 opções realmente relevantes.

13. Se existirem somente 2, 3 ou 4 opções confiáveis, mostre somente essas.

14. Não invente informações ausentes.

15. Se não existir nenhuma opção 🟢 com preço atual verificável dentro do orçamento, NÃO invente vencedor.

Nesse caso escreva:
"Não encontrei uma opção que atenda aos critérios com preço atual verificável dentro do orçamento informado."

FORMATO:

# 🏆 MELHORES OPÇÕES

Para cada opção:

### Modelo
- Configuração:
- Condição:
- Preço:
- Loja/vendedor:
- Estado:
- Desempenho:
- Vantagens:
- Desvantagens:
- Atendimento à exigência especial:
- Custo-benefício:

# ⚖️ COMPARAÇÃO RÁPIDA

Compare as opções encontradas.

# 🥇 RECOMENDAÇÃO DO TECHNEXUS DECIDE

Somente se existir uma opção 🟢 dentro do orçamento:

Modelo:
Preço:
Por que foi escolhida:

# ⚠️ PONTOS FRACOS

Explique as limitações da recomendação.

# 🔎 OUTRAS OPÇÕES

Inclua opções 🟡 ou 🔴 relevantes, claramente identificadas.

IMPORTANTE:
Não invente preço, loja, fonte, configuração ou disponibilidade.
Use somente informações encontradas ou verificadas nas etapas anteriores.
`;

      answer = await searchWeb(
        finalPrompt,
        "ETAPA 3 — comparação e decisão"
      );
    } else {
      const prompt = `
Você é o motor de pesquisa e assistente do TechNexus, um portal global de tecnologia.

Responda em português.

PERGUNTA:
${question}

REGRAS:
- Para produtos, preços, notícias, modelos, rankings, lançamentos e informações atuais, use obrigatoriamente o Google Search disponível nesta chamada.
- Não invente dados.
- Diferencie fatos de opinião.
- Considere o mercado mencionado pelo usuário.
- Seja direto e específico.
- Não diga que o TechNexus não possui um artigo.

CONTEÚDO LOCAL RELEVANTE:
${context || "Nenhum conteúdo local relevante."}

Responda diretamente à pergunta.
`;

      answer = await searchWeb(
        prompt,
        "PESQUISA NORMAL"
      );
    }

    const webSources = allWebSources
      .filter(x => x?.url)
      .filter((x, i, a) =>
        a.findIndex(y => y.url === x.url) === i
      )
      .slice(0, 30);

    const response = {
      answer:
        answer ||
        "Não consegui gerar uma resposta agora.",
      articles: ranked,
      webSources,
      grounded: webSources.length > 0
    };

    setSearchCache(cacheKey, response);

    return response;

  } finally {
    releaseAiSlot();
  }
}

function buildSafeFallback(question) {
  const articles = allPublished();

  const ranked = articles
    .map(a => ({ a, score: scoreArticle(a, question) }))
    .sort((x,y) => y.score - x.score || new Date(y.a.createdAt) - new Date(x.a.createdAt))
    .slice(0, 8)
    .map(({a}) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      category: a.category,
      excerpt: a.excerpt,
      tags: a.tags || []
    }));

  const isDecide = /motor TechNexus Decide|TechNexus Decide/i.test(question);

  const answer = isDecide
    ? 'Não foi possível verificar preços e ofertas atuais na web neste momento. Para evitar uma recomendação incorreta, o TechNexus não apresentará um preço ou produto como confirmado. Tente novamente em alguns instantes.'
    : 'A pesquisa web está temporariamente indisponível. Enquanto isso, estes são os conteúdos relevantes disponíveis no TechNexus.';

  return {
    answer,
    articles: ranked,
    webSources: [],
    grounded: false,
    degraded: true
  };
}

app.post('/api/search', async (req,res) => {
  const question = String(req.body?.query || '').trim();
  if (!question) return res.status(400).json({error:'Digite algo para pesquisar.'});
  try {
    const result = await runGroundedSearch(question);
    res.json(result);
  } catch (error) {
    console.error('Search/Gemini error:', error?.message || error);
    const fallback = buildSafeFallback(question);
    res.json(fallback);
  }
});

app.post('/api/ai/ask', async (req,res) => {
  const question = String(req.body?.question || '').trim();
  if (!question) return res.status(400).json({error:'Escreva uma pergunta.'});
  try {
    const result = await runGroundedSearch(question);
    res.json({ answer:result.answer, sources:result.articles, webSources:result.webSources, grounded:result.grounded });
  } catch (error) {
    console.error('AI/Gemini error:', error?.message || error);
    const fallback = buildSafeFallback(question);
    res.json({
      answer: fallback.answer,
      sources: fallback.articles,
      webSources: [],
      grounded: false,
      degraded: true
    });
  }
});
app.get('/api/site', (req, res) => res.json(readJson(siteFile, defaultSite)));
app.get('/api/categories', (req, res) => {
  const counts = {};
  allPublished().forEach(a => counts[a.category] = (counts[a.category] || 0) + 1);
  res.json(Object.entries(counts).sort((a,b) => b[1] - a[1]).map(([name,count]) => ({ name, count })));
});
app.get('/api/articles', (req, res) => {
  let articles = allPublished();
  const q = String(req.query.q || '').trim();
  const category = normalize(req.query.category);
  if (category) articles = articles.filter(a => normalize(a.category) === category);
  if (q) articles = articles.map(a => ({ a, score: scoreArticle(a, q) })).filter(x => x.score > 0).sort((x,y) => y.score - x.score || new Date(y.a.createdAt) - new Date(x.a.createdAt)).map(x => x.a);
  else articles.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(articles);
});
app.get('/api/articles/:slug', (req, res) => {
  const article = allPublished().find(a => a.slug === req.params.slug);
  if (!article) return res.status(404).json({ error: 'Artigo não encontrado' });
  res.json(article);
});
app.get('/api/admin/stats', auth, (req,res) => {
  const articles = readJson(articlesFile, []);
  res.json({ articles: articles.length, published: articles.filter(a=>a.published!==false).length, drafts: articles.filter(a=>a.published===false).length, categories: new Set(articles.map(a=>a.category)).size });
});
app.get('/api/admin/articles', auth, (req,res) => res.json(readJson(articlesFile, [])));
app.put('/api/admin/site', auth, (req,res) => {
  const current = { ...defaultSite, ...readJson(siteFile, defaultSite) };
  const allowed = ['name','tagline','description','smartLink','telegramUrl','adTop','adMiddle','adBottom','featuredCategory'];
  for (const key of allowed) if (req.body[key] !== undefined) current[key] = String(req.body[key]);
  current.updatedAt = new Date().toISOString();
  writeJson(siteFile, current); res.json(current);
});
app.post('/api/admin/articles', auth, (req,res) => {
  const articles = readJson(articlesFile, []); const body = req.body || {};
  if (!body.title || !body.category || !body.excerpt || !body.content) return res.status(400).json({error:'Título, categoria, resumo e conteúdo são obrigatórios'});
  let slug = slugify(body.slug || body.title);
  const duplicate = articles.find(a => a.slug === slug && a.id !== String(body.id || ''));
  if (duplicate) slug += '-' + Date.now().toString().slice(-5);
  const article = {
    id: body.id ? String(body.id) : Date.now().toString(), title: String(body.title).trim(), slug,
    category: String(body.category).trim(), excerpt: String(body.excerpt).trim(), content: String(body.content),
    tags: Array.isArray(body.tags) ? body.tags.map(String).map(x=>x.trim()).filter(Boolean) : String(body.tags||'').split(',').map(x=>x.trim()).filter(Boolean),
    featured: Boolean(body.featured), published: body.published !== false, createdAt: body.createdAt || new Date().toISOString()
  };
  const index = articles.findIndex(a => a.id === article.id);
  if (index >= 0) articles[index] = article; else articles.push(article);
  writeJson(articlesFile, articles); res.json(article);
});
app.delete('/api/admin/articles/:id', auth, (req,res) => {
  const articles = readJson(articlesFile, []); const next = articles.filter(a => a.id !== String(req.params.id));
  if (next.length === articles.length) return res.status(404).json({error:'Artigo não encontrado'});
  writeJson(articlesFile, next); res.json({ok:true});
});


const arenaFile = path.join(DATA, 'arena.json');

const defaultArena = {
  combats: []
};

function readArena() {
  return readJson(arenaFile, defaultArena);
}

function writeArena(data) {
  writeJson(arenaFile, data);
}

function expireArenaCombat(combat) {
  if (
    combat &&
    combat.status === "active" &&
    combat.endsAt &&
    !Number.isNaN(new Date(combat.endsAt).getTime()) &&
    new Date(combat.endsAt).getTime() <= Date.now()
  ) {
    const a = Number(combat.votesA || 0);
    const b = Number(combat.votesB || 0);

    combat.status = "finished";

    if (a > b) combat.winner = "A";
    else if (b > a) combat.winner = "B";
    else combat.winner = "tie";

    combat.finishedAt = new Date().toISOString();
    combat.updatedAt = new Date().toISOString();

    return true;
  }

  return false;
}

function expireArenaCombats(arena) {
  let changed = false;

  for (const combat of arena.combats || []) {
    if (expireArenaCombat(combat)) changed = true;
  }

  if (changed) writeArena(arena);

  return changed;
}

function publicCombat(combat) {
  return {
    id: combat.id,
    title: combat.title,
    description: combat.description,
    category: combat.category,
    sideA: combat.sideA,
    sideB: combat.sideB,
    votesA: Number(combat.votesA || 0),
    votesB: Number(combat.votesB || 0),
    status: combat.status || 'active',
    createdAt: combat.createdAt,
    endsAt: combat.endsAt || null,
    winner: combat.winner || null
  };
}

app.get('/api/arena', (req, res) => {
  const arena = readArena();
  expireArenaCombats(arena);
  const combats = Array.isArray(arena.combats)
    ? arena.combats.map(publicCombat)
    : [];

  res.json({
    combats,
    total: combats.length,
    active: combats.filter(c => c.status === 'active').length,
    finished: combats.filter(c => c.status === 'finished').length
  });
});

app.get('/api/arena/:id', (req, res) => {
  const arena = readArena();
  expireArenaCombats(arena);
  const combat = (arena.combats || []).find(
    c => String(c.id) === String(req.params.id)
  );

  if (!combat) {
    return res.status(404).json({ error: 'Combate não encontrado.' });
  }

  res.json(publicCombat(combat));
});

function arenaVoterHash(voterId) {
  return crypto.createHash('sha256').update(String(voterId)).digest('hex');
}

app.post('/api/arena/:id/vote', (req, res) => {
  const arena = readArena();
  expireArenaCombats(arena);
  const combat = (arena.combats || []).find(
    c => String(c.id) === String(req.params.id)
  );

  if (!combat) {
    return res.status(404).json({ error: 'Combate não encontrado.' });
  }

  if (combat.status !== 'active') {
    return res.status(400).json({ error: 'Este combate já terminou.' });
  }

  const side = String(req.body?.side || '').toUpperCase();
  const voterId = String(req.body?.voterId || '').trim();

  if (side !== 'A' && side !== 'B') {
    return res.status(400).json({ error: 'Escolha A ou B.' });
  }

  if (voterId.length < 16 || voterId.length > 200) {
    return res.status(400).json({ error: 'Identificador do navegador inválido.' });
  }

  combat.voters = Array.isArray(combat.voters) ? combat.voters : [];
  const voterHash = arenaVoterHash(voterId);

  if (combat.voters.includes(voterHash)) {
    return res.status(409).json({ error: 'Você já votou nesta batalha.' });
  }

  combat.voters.push(voterHash);

  if (side === 'A') {
    combat.votesA = Number(combat.votesA || 0) + 1;
  } else {
    combat.votesB = Number(combat.votesB || 0) + 1;
  }

  combat.updatedAt = new Date().toISOString();

  writeArena(arena);

  res.json({
    ok: true,
    combat: publicCombat(combat)
  });
});

app.delete('/api/admin/arena/:id', auth, (req, res) => {
  const arena = readArena();
  const index = arena.combats.findIndex(combat => String(combat.id) === String(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Combate não encontrado.' });
  }

  const combat = arena.combats[index];

  if (combat.status !== 'finished') {
    return res.status(400).json({ error: 'Somente combates finalizados podem ser apagados.' });
  }

  arena.combats.splice(index, 1);
  writeArena(arena);

  res.json({ ok: true });
});
app.post('/api/admin/arena', auth, (req, res) => {
  const body = req.body || {};

  if (
    !body.title ||
    !body.sideA ||
    !body.sideB
  ) {
    return res.status(400).json({
      error: 'Título, opção A e opção B são obrigatórios.'
    });
  }

  const arena = readArena();

  const combat = {
    id: Date.now().toString(),
    title: String(body.title).trim(),
    description: String(body.description || '').trim(),
    category: String(body.category || 'tecnologia').trim(),
    sideA: {
      name: String(body.sideA).trim(),
      description: String(body.sideADescription || '').trim()
    },
    sideB: {
      name: String(body.sideB).trim(),
      description: String(body.sideBDescription || '').trim()
    },
    votesA: 0,
    votesB: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    endsAt: body.endsAt ? String(body.endsAt) : null,
    winner: null
  };

  arena.combats = Array.isArray(arena.combats)
    ? arena.combats
    : [];

  arena.combats.unshift(combat);
  writeArena(arena);

  res.json(publicCombat(combat));
});

app.post('/api/admin/arena/:id/finish', auth, (req, res) => {
  const arena = readArena();

  const combat = (arena.combats || []).find(
    c => String(c.id) === String(req.params.id)
  );

  if (!combat) {
    return res.status(404).json({ error: 'Combate não encontrado.' });
  }

  if (combat.status !== 'active') {
    return res.status(400).json({ error: 'Este combate já terminou.' });
  }

  const a = Number(combat.votesA || 0);
  const b = Number(combat.votesB || 0);

  combat.status = 'finished';

  if (a > b) combat.winner = 'A';
  else if (b > a) combat.winner = 'B';
  else combat.winner = 'tie';

  combat.finishedAt = new Date().toISOString();

  writeArena(arena);

  res.json({
    ok: true,
    combat: publicCombat(combat)
  });
});

app.get('/{*splat}', (req,res) => res.sendFile(path.join(PUBLIC,'index.html')));
app.listen(PORT, () => console.log(`🚀 TechNexus 2.1: http://localhost:${PORT}`));
