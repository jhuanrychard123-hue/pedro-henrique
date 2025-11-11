// Protótipo: mapa com Leaflet, carregando dados de povos de /data.json
async function loadData(){
  try{
    const res = await fetch('data.json');
    const data = await res.json();
    // inicializar estatísticas globais para debug
    const povos = data.povos || [];
    const totalImages = povos.reduce((acc,p)=> acc + ((p.imagens && p.imagens.length) || 0), 0);
    window._vt_stats = { totalPovos: povos.length, totalImages: totalImages, imagesLoaded:0, imagesFailed:0 };
    updateDebug('data', `${povos.length} povos; ${totalImages} imagens esperadas`);
  // habilitar logs verbosos apenas com ?debug=1 para não poluir a versão pública
  window._vt_verbose = /[?&]debug=1/.test(location.search);
    if(window._vt_verbose) console.log('[Vt] loadData:', window._vt_stats);
    updateDebug('images', `${window._vt_stats.imagesLoaded}/${window._vt_stats.totalImages} carregadas`);
    return povos;
  }catch(e){
    console.error('Erro ao carregar data.json', e);
    return [];
  }
}

// helper para atualizar a debug-bar
function updateDebug(key, text){
  try{
    const bar = document.getElementById('debug');
    if(!bar) return;
    const el = bar.querySelector(`span[data-key="${key}"]`);
    if(el) el.textContent = text;
  }catch(e){console.warn('updateDebug',e)}
}

function initMap(povos){
  const map = L.map('mapid').setView([-14.2350, -51.9253], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  if(window._vt_verbose) console.log('[Vt] initMap: mapa criado, adicionando marcadores...');

  // registrar marcadores para acesso posterior pelo nome
  window._vt_markers = window._vt_markers || {};
  povos.forEach(p =>{
    const marker = L.marker([p.lat,p.lon]).addTo(map);
    const firstImg = (p.imagens && p.imagens[0]) ? p.imagens[0] : '';
    const curios = p.curiosidade ? `<p><strong>Curiosidade:</strong> ${p.curiosidade}</p>` : '';
    // mostrar imagem no popup quando disponível; caso contrário, indicar que imagem foi removida
    const imgHtml = firstImg ? `<img src="${firstImg}" alt="${p.nome}" style="width:100%;height:auto;border-radius:6px;margin-top:.4rem">` : `<div class="no-image popup-no-image">Imagem removida neste protótipo</div>`;
    const html = `
      <div class="popup">
        <h3>${p.nome}</h3>
        <p><strong>Região:</strong> ${p.regiao} — <strong>Língua:</strong> ${p.lingua}</p>
        <p>${p.resumo}</p>
        ${curios}
        ${imgHtml}
        <p><button class="open-gallery" data-nome="${p.nome}">Abrir galeria</button></p>
      </div>`;
    marker.bindPopup(html);
    // registrar por nome (uso seguro: nomes únicos no protótipo)
    try{ window._vt_markers[p.nome] = marker; }catch(e){}
    if(window._vt_verbose) console.log(`[Vt] marker: ${p.nome} @ ${p.lat},${p.lon} (img:${!!firstImg})`);
  });
  return map;
}

function initGallery(povos){
  const g = document.getElementById('gallery');
  povos.slice(0,6).forEach(p =>{
    // substitui imagens por um bloco de texto (imagem removida)
    const thumb = document.createElement('div');
    thumb.className = 'no-image-thumb';
    thumb.tabIndex = 0;
    thumb.setAttribute('role','img');
    thumb.setAttribute('aria-label', `${p.nome} — imagem removida`);
    thumb.textContent = p.nome;
    thumb.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        const live = document.getElementById('sr-live'); if(live) live.textContent = `${p.nome}: ${p.resumo}`; e.preventDefault();
      }
    });
    g.appendChild(thumb);
    if(window._vt_verbose) console.log('[Vt] gallery thumb added for', p.nome);
  });
}

function initCommitForm(){
  const form = document.getElementById('commit-form');
  const list = document.getElementById('commit-list');
  const storageKey = 'vt_commits';
  // carregar comentários salvos
  let commits = [];
  try{ commits = JSON.parse(localStorage.getItem(storageKey) || '[]'); }catch(e){ commits = []; }
  function renderCommits(){ list.innerHTML = ''; commits.forEach(c=>{ const li = document.createElement('li'); li.textContent = c; list.appendChild(li); }); }
  renderCommits();

  // botão para limpar comentários salvos
  const clearBtn = document.createElement('button'); clearBtn.type = 'button'; clearBtn.className = 'commit-clear'; clearBtn.textContent = 'Limpar comentários';
  clearBtn.addEventListener('click', ()=>{
    commits = []; localStorage.removeItem(storageKey); renderCommits(); clearBtn.disabled = true;
  });
  // desabilitar se já estiver vazio
  if(!commits.length) clearBtn.disabled = true;
  // inserir logo após o formulário
  try{ form.insertAdjacentElement('afterend', clearBtn); }catch(e){}

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const txtEl = document.getElementById('commit');
    const txt = txtEl.value.trim();
    if(!txt) return;
    // salvar no topo e persistir
    commits.unshift(txt);
    try{ localStorage.setItem(storageKey, JSON.stringify(commits.slice(0,50))); }catch(e){ if(window._vt_verbose) console.warn('saving commits failed',e); }
    renderCommits();
    form.reset();
    clearBtn.disabled = false;
    // Notificação para leitores de tela
    const live = document.getElementById('sr-live');
    if(live) live.textContent = 'Compromisso enviado.';
  });
}

function initQuiz(){
  const root = document.getElementById('quiz-root');
  // Perguntas mais desafiadoras/educativas
  const questions = [
    {q:'Qual família linguística inclui línguas como o Nheengatu e o Guarani tradicionalmente?',options:['Arawak','Tupi-Guarani','Macro-Jê'],a:1},
    {q:'Qual técnica tradicional contribui para manter a diversidade da floresta e solos férteis?',options:['Roça agroflorestal / policultura','Monocultura extensiva','Desmatamento por gravidade'],a:0},
    {q:'O que caracteriza um sistema de manejo tradicional chamado "agrofloresta"?',options:['Combinação de espécies alimentares e arbóreas em policultura','Uso só de árvores nativas sem cultivo','Fabricação industrial de adubo'],a:0},
    {q:'Qual órgão público brasileiro é responsável por políticas indigenistas?',options:['FUNAI','IBGE','MRE'],a:0},
    {q:'Qual prática é recomendada ao pesquisar saberes de comunidades indígenas?',options:['Obter consentimento prévio e atribuir crédito','Divulgar sem consultar','Profite sem retorno'],a:0},
    {q:'Qual é um exemplo de ação que ajuda a conservar variedades locais de cultivo?',options:['Banco de sementes comunitário','Substituir por híbridos comerciais','Queimar a área'],a:0},
    {q:'Entre as opções, qual NÃO é uma família linguística das línguas indígenas do Brasil?',options:['Tupi-Guarani','Aruák','Romance'],a:2},
    {q:'A demarcação de terras indígenas tem como objetivo principal:',options:['Garantir territórios e modos de vida tradicionais','Aumentar a produção industrial','Reduzir a diversidade linguística'],a:0},
    {q:'Qual técnica tradicional pode aumentar a fertilidade do solo de forma sustentável?',options:['Compostagem e rotação de culturas','Uso exclusivo de fertilizantes sintéticos','Esgotar a terra por monocultura'],a:0},
    {q:'Ao publicar materiais com comunidades, o passo ético essencial é:',options:['Pedir autorização e reconhecer créditos culturais','Ignorar consentimento','Divulgar sem contexto'],a:0}
  ];
  let idx=0,score=0;
  function render(){
    root.innerHTML='';
    // mostrar melhor pontuação salva (se houver) e botão para limpar
    const bestKey = 'vt_quiz_best';
    const bestSaved = parseInt(localStorage.getItem(bestKey)) || 0;
    const bestWrap = document.createElement('div'); bestWrap.className = 'quiz-best-wrap';
    const bestEl = document.createElement('div'); bestEl.className = 'quiz-best'; bestEl.textContent = bestSaved ? `Melhor: ${bestSaved}/${questions.length}` : 'Melhor: —';
    const clearBtn = document.createElement('button'); clearBtn.type = 'button'; clearBtn.className = 'quiz-clear-btn'; clearBtn.textContent = 'Limpar recorde';
    clearBtn.addEventListener('click', ()=>{
      try{ localStorage.removeItem(bestKey); bestEl.textContent = 'Melhor: —'; clearBtn.disabled = true; }
      catch(e){ if(window._vt_verbose) console.warn('clear best failed',e); }
    });
    if(!bestSaved) clearBtn.disabled = true;
    bestWrap.appendChild(bestEl);
    bestWrap.appendChild(clearBtn);
    root.appendChild(bestWrap);
    const Q = questions[idx];
    const h = document.createElement('div'); h.className='quiz-question'; h.textContent = Q.q; root.appendChild(h);
    const opts = document.createElement('div'); opts.className='quiz-options';
    Q.options.forEach((o,i)=>{
      const letter = String.fromCharCode(97 + i); // 'a', 'b', 'c'
      const b = document.createElement('button'); b.textContent = `${letter}) ${o}`; b.disabled = false;
      b.dataset.index = i;
      b.addEventListener('click', ()=>{
        const correct = (i===Q.a);
        if(correct) score++;
        // desativa opções e aplica classes visuais: marca a correta e, se aplicável, a errada clicada
        Array.from(opts.querySelectorAll('button')).forEach(bb=>{
          const bi = parseInt(bb.dataset.index,10);
          bb.disabled = true;
          if(bi === Q.a) bb.classList.add('quiz-correct');
          if(bb === b && bi !== Q.a) bb.classList.add('quiz-wrong');
        });
        // feedback textual (leitores de tela)
        const fb = document.createElement('div'); fb.className = 'quiz-feedback'; fb.setAttribute('aria-live','polite');
        const correctLetter = String.fromCharCode(97 + Q.a);
        fb.textContent = correct ? 'Correto! ' : 'Errado. ';
        fb.textContent += `Resposta: (${correctLetter}) ${Q.options[Q.a]}`;
        root.appendChild(fb);
        // botão próxima
        const next = document.createElement('button'); next.textContent = (idx+1<questions.length) ? 'Próxima' : 'Finalizar';
        next.addEventListener('click', ()=>{
          idx++;
          if(idx<questions.length) render(); else finish();
        });
        root.appendChild(next);
      });
      opts.appendChild(b);
    });
    root.appendChild(opts);
  }
  function finish(){
    root.innerHTML = '';
    const p = document.createElement('p'); p.innerHTML = `Fim! Sua pontuação: <strong>${score}/${questions.length}</strong>`; root.appendChild(p);
    // salvar melhor pontuação em localStorage
    try{
      const bestKey = 'vt_quiz_best';
      const prev = parseInt(localStorage.getItem(bestKey)) || 0;
      let bestMsg = document.createElement('div'); bestMsg.className = 'quiz-best-msg';
      if(score > prev){
        localStorage.setItem(bestKey, String(score));
        bestMsg.textContent = `Novo recorde! Melhor: ${score}/${questions.length}`;
      }else{
        bestMsg.textContent = `Melhor até agora: ${prev}/${questions.length}`;
      }
      root.appendChild(bestMsg);
      // adicionar botão para limpar recorde também na tela final
      const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'quiz-clear-btn'; clr.textContent = 'Limpar recorde';
      clr.addEventListener('click', ()=>{
        try{ localStorage.removeItem(bestKey); clr.disabled = true; if(bestMsg) bestMsg.textContent = 'Melhor: —'; }
        catch(e){ if(window._vt_verbose) console.warn('clear best failed',e); }
      });
      // só habilita se existia um recorde
      if(prev) root.appendChild(clr); else clr.disabled = true;
    }catch(e){ if(window._vt_verbose) console.warn('localStorage not available', e); }

    const replay = document.createElement('button'); replay.textContent = 'Repetir quiz';
    replay.addEventListener('click', ()=>{ idx=0; score=0; render(); });
    root.appendChild(replay);
  }
  render();
}

function initSidebar(povos, map){
  const list = document.getElementById('people-list');
  // limpar conteúdo anterior para evitar duplicação/overlap
  list.innerHTML = '';
  povos.forEach((p,i)=>{
    const li = document.createElement('li');
    li.tabIndex = 0;
    // inserir placeholder textual no lugar da imagem
    const img = document.createElement('div'); img.className = 'no-image'; img.textContent = p.nome;
  const div = document.createElement('div');
  // mostrar resumo curto e curiosidade se existir
  const short = p.curiosidade ? `<div class="muted small">${p.curiosidade}</div>` : `<div class="muted small">${p.resumo}</div>`;
  div.innerHTML = `<strong>${p.nome}</strong><br><span class="muted">${p.regiao}</span>${short}`;
    li.appendChild(img); li.appendChild(div);
    li.addEventListener('click', ()=>{
      map.setView([p.lat,p.lon],6);
      // abrir popup do marker via referência direta (mais confiável)
      try{
        const m = window._vt_markers && window._vt_markers[p.nome];
        if(m && m.openPopup) m.openPopup();
      }catch(e){
        // fallback: varrer camadas (compatibilidade antiga)
        const layers = map._layers;
        for(const id in layers){
          const lay = layers[id];
          if(lay && lay.getLatLng && lay.getLatLng().lat===p.lat && lay.getLatLng().lng===p.lon){
            lay.openPopup(); break;
          }
        }
      }
    });
    li.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { li.click(); e.preventDefault(); } });
    list.appendChild(li);
    if(window._vt_verbose) console.log('[Vt] sidebar item added:', p.nome);
  });
}

function initModal(){
  const modal = document.getElementById('gallery-modal');
  const gallery = document.getElementById('modal-gallery');
  const caption = document.getElementById('modal-caption');
  const close = document.getElementById('modal-close');
  // restaura foco ao elemento anterior ao fechar
  let _lastFocused = null;
  close.addEventListener('click', ()=>{ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); if(_lastFocused && _lastFocused.focus) _lastFocused.focus(); _lastFocused = null; });
  // Fechar clicando fora do conteúdo
  modal.addEventListener('click', (e)=>{
    if(e.target === modal){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  });
  // fechar com Escape e restaurar foco
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && modal.classList.contains('open')){
      modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); if(_lastFocused && _lastFocused.focus) _lastFocused.focus(); _lastFocused = null; }
  });
  document.addEventListener('click', (e)=>{
    if(e.target.classList.contains('open-gallery')){
      const name = e.target.dataset.nome;
      _lastFocused = document.activeElement;
      openGalleryByName(name);
    }
  });
  function openGalleryByName(name){
    // buscar no data.json carregado globalmente
    fetch('data.json').then(r=>r.json()).then(d=>{
      const p = d.povos.find(x=>x.nome===name);
      if(!p) return;
      gallery.innerHTML=''; caption.textContent = p.nome;
  (p.imagens||[]).forEach(u=>{ const i = document.createElement('img'); i.src=u; i.alt=p.nome; i.loading='lazy'; i.addEventListener('error', ()=>{ i.src='https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Placeholder_no_text.svg/800px-Placeholder_no_text.svg.png'; }); gallery.appendChild(i); });
  // legenda e crédito
  const cap = p.caption ? p.caption : '';
  const cred = p.credit ? ('Crédito: ' + p.credit) : '';
  caption.textContent = [cap, cred].filter(Boolean).join(' — ');
      modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
      // mover foco para o botão fechar para acessibilidade
      try{ close.focus(); }catch(e){ /* noop */ }
      if(window._vt_verbose) console.log('[Vt] gallery opened for', name, p.imagens);
    });
  }
}

// inicialização
(async function(){
  const povos = await loadData();
  // Checar se Leaflet carregou
  if(typeof L === 'undefined'){
    const mapdiv = document.getElementById('mapid');
    if(mapdiv) mapdiv.innerHTML = '<p class="note">Mapa indisponível — biblioteca Leaflet não foi carregada. Tente recarregar a página.</p>';
    // Ainda inicializa as demais partes
    initGallery(povos);
    initCommitForm();
    initQuiz();
    initModal();
    return;
  }
  const map = initMap(povos);
  updateDebug('map','OK');
  initGallery(povos);
  initCommitForm();
  // preencher texto e dados em 'Cultura' e 'História'
  try{ renderCultureAndSummary(povos); }catch(e){ if(window._vt_verbose) console.warn('renderCultureAndSummary failed',e); }
  initQuiz();
  updateDebug('quiz','OK');
  initSidebar(povos, map);
  initModal();
})();

// Renderiza o texto (3 parágrafos) sobre povos indígenas e o resumo de dados
function renderCultureAndSummary(povos){
  const cultura = document.getElementById('cultura-text');
  const summary = document.getElementById('data-summary');
  if(cultura){
    cultura.innerHTML = `
      <p>Os povos indígenas do Brasil formam uma imensa diversidade de nações, línguas e modos de vida. Cada povo detém saberes próprios sobre o ambiente, práticas comunitárias e cosmologias que se transmitem por gerações através da oralidade, cerimoniais e do trabalho coletivo. Esses conhecimentos tradicionais incluem manejo de plantas, técnicas agrícolas, tecelagem e manifestações artísticas.</p>
      <p>A história desses povos é marcada por longa ocupação dos territórios, e também por resistências às pressões externas desde a colonização até os dias atuais. Muitos grupos mantêm ritos, línguas e instituições próprias, enquanto lutam por reconhecimento de terras e por políticas que respeitem suas formas de organização. A revitalização cultural e a busca por direitos passam pelo protagonismo das próprias comunidades.</p>
      <p>Este protótipo tem fins educativos e usa textos e imagens de exemplo. Antes de publicar materiais reais, é essencial obter autorização das comunidades, respeitar direitos sobre imagens e saberes, e reconhecer créditos culturais. Apoiar iniciativas de educação bilíngue e projetos comunitários é uma forma concreta de colaboração.</p>
    `;
  }
  if(summary){
    const total = povos.length;
    const langs = new Set(povos.map(p=> (p.lingua||'').trim())).size;
    const regions = new Set(povos.map(p=> (p.regiao||'').split(/[;,\/]/)[0].trim())).size;
    const imgs = povos.reduce((acc,p)=> acc + ((p.imagens && p.imagens.length) || 0), 0);
    summary.innerHTML = `
      <div class="card small">
        <strong>Resumo de dados</strong>
        <ul>
          <li><span class="icon">👥</span><span class="label">Total de povos no protótipo:</span> <strong>${total}</strong></li>
          <li><span class="icon">🗣️</span><span class="label">Idiomas representados:</span> <strong>${langs}</strong></li>
          <li><span class="icon">📍</span><span class="label">Regiões aproximadas:</span> <strong>${regions}</strong></li>
          <li><span class="icon">🖼️</span><span class="label">Imagens (placeholders):</span> <strong>${imgs}</strong></li>
        </ul>
      </div>
    `;
  }
}


