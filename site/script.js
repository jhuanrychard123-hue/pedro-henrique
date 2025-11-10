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
    // habilitar logs verbosos se debug-bar existir ou ?debug=1
    window._vt_verbose = !!document.getElementById('debug') || /[?&]debug=1/.test(location.search);
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

  povos.forEach(p =>{
    const marker = L.marker([p.lat,p.lon]).addTo(map);
    const firstImg = (p.imagens && p.imagens[0]) ? p.imagens[0] : '';
    const html = `
      <div class="popup">
        <h3>${p.nome}</h3>
        <p><strong>Região:</strong> ${p.regiao} — <strong>Língua:</strong> ${p.lingua}</p>
        <p>${p.resumo}</p>
        ${firstImg ? `<img src="${firstImg}" alt="${p.nome}" style="width:100%;height:auto;border-radius:6px;margin-top:.4rem">` : ''}
        <p><button class="open-gallery" data-nome="${p.nome}">Abrir galeria</button></p>
      </div>`;
    marker.bindPopup(html);
    if(window._vt_verbose) console.log(`[Vt] marker: ${p.nome} @ ${p.lat},${p.lon} (img:${!!firstImg})`);
  });
  return map;
}

function initGallery(povos){
  const g = document.getElementById('gallery');
  povos.slice(0,6).forEach(p =>{
    const img = document.createElement('img');
    img.src = p.imagens && p.imagens[0] ? p.imagens[0] : 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Placeholder_no_text.svg/800px-Placeholder_no_text.svg.png';
    img.alt = p.nome;
    img.loading = 'lazy';
    img.addEventListener('error', ()=>{
      img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Placeholder_no_text.svg/800px-Placeholder_no_text.svg.png';
      if(window._vt_stats){ window._vt_stats.imagesFailed++; updateDebug('images', `${window._vt_stats.imagesLoaded}/${window._vt_stats.totalImages} carregadas (${window._vt_stats.imagesFailed} falhas)`); }
      if(window._vt_verbose) console.warn('[Vt] image error:', img.src, 'for', p.nome);
    });
    img.addEventListener('load', ()=>{ if(window._vt_stats){ window._vt_stats.imagesLoaded++; updateDebug('images', `${window._vt_stats.imagesLoaded}/${window._vt_stats.totalImages} carregadas`); } });
    // Acessibilidade: permitir foco por teclado e aviso via SR
    img.tabIndex = 0;
    img.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' ') {
        const live = document.getElementById('sr-live');
        if(live) live.textContent = `${p.nome}: ${p.resumo}`;
        e.preventDefault();
      }
    });
    g.appendChild(img);
    if(window._vt_verbose) console.log('[Vt] gallery thumb added for', p.nome, img.src);
  });
}

function initCommitForm(){
  const form = document.getElementById('commit-form');
  const list = document.getElementById('commit-list');
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const txt = document.getElementById('commit').value.trim();
    if(!txt) return;
    const li = document.createElement('li'); li.textContent = txt; list.prepend(li);
    form.reset();
    // Notificação para leitores de tela
    const live = document.getElementById('sr-live');
    if(live) live.textContent = 'Compromisso enviado.';
  });
}

function initQuiz(){
  const root = document.getElementById('quiz-root');
  const questions = [
    {q:'Qual povo fala língua Tupi-Guarani?',options:['Yanomami','Guarani','Tikuna'],a:1},
    {q:'Qual região do Brasil tem povos amazônicos tradicionais?',options:['Nordeste','Norte','Sul'],a:1},
    {q:'Qual atividade é tradicional em muitas culturas indígenas?',options:['Pintura corporal','Surf','Esqui'],a:0}
  ];
  let idx=0,score=0;
  function render(){
    root.innerHTML='';
    const Q = questions[idx];
    const h = document.createElement('div'); h.className='quiz-question'; h.textContent = Q.q; root.appendChild(h);
    const opts = document.createElement('div'); opts.className='quiz-options';
    Q.options.forEach((o,i)=>{
      const b = document.createElement('button'); b.textContent = o; b.addEventListener('click', ()=>{
        if(i===Q.a) score++;
        idx++;
        if(idx<questions.length) render(); else finish();
      });
      opts.appendChild(b);
    });
    root.appendChild(opts);
  }
  function finish(){
    root.innerHTML = `<p>Fim! Sua pontuação: ${score}/${questions.length}</p>`;
  }
  render();
}

function initSidebar(povos, map){
  const list = document.getElementById('people-list');
  povos.forEach((p,i)=>{
    const li = document.createElement('li');
    li.tabIndex = 0;
    const img = document.createElement('img'); img.src = p.imagens && p.imagens[0] ? p.imagens[0] : '';
    img.loading = 'lazy';
    img.addEventListener('error', ()=>{ img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Placeholder_no_text.svg/800px-Placeholder_no_text.svg.png'; if(window._vt_stats){ window._vt_stats.imagesFailed++; updateDebug('images', `${window._vt_stats.imagesLoaded}/${window._vt_stats.totalImages} carregadas (${window._vt_stats.imagesFailed} falhas)`); } });
    img.addEventListener('load', ()=>{ if(window._vt_stats){ window._vt_stats.imagesLoaded++; updateDebug('images', `${window._vt_stats.imagesLoaded}/${window._vt_stats.totalImages} carregadas`); } });
    const div = document.createElement('div');
    div.innerHTML = `<strong>${p.nome}</strong><br><span class="muted">${p.regiao}</span>`;
    li.appendChild(img); li.appendChild(div);
    li.addEventListener('click', ()=>{
      map.setView([p.lat,p.lon],6);
      // abrir popup do marker correspondente via busca simples
      const layers = map._layers;
      for(const id in layers){
        const lay = layers[id];
        if(lay && lay.getLatLng && lay.getLatLng().lat===p.lat && lay.getLatLng().lng===p.lon){
          lay.openPopup(); break;
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
  close.addEventListener('click', ()=>{ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); });
  // Fechar clicando fora do conteúdo
  modal.addEventListener('click', (e)=>{
    if(e.target === modal){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  });
  document.addEventListener('click', (e)=>{
    if(e.target.classList.contains('open-gallery')){
      const name = e.target.dataset.nome;
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
  initQuiz();
  updateDebug('quiz','OK');
  initSidebar(povos, map);
  initModal();
})();
