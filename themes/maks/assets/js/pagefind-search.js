(function(){
  const wrap=document.querySelector('.search-wrap');
  if(!wrap)return;

  const searchResults=document.createElement('div');
  searchResults.id='searchResults';
  wrap.appendChild(searchResults);

  let pf=null;
  async function loadPagefind(){
    if(pf)return;
    try{pf=await import('/pagefind/pagefind.js');await pf.init();}catch(e){console.warn('Pagefind not ready');}
  }

  document.getElementById('searchInput').addEventListener('input',async function(){
    const q=this.value.trim();
    if(!q){searchResults.style.display='none';return;}
    await loadPagefind();
    if(!pf){searchResults.style.display='none';return;}
    const res=await pf.search(q);
    if(!res.results.length){
      searchResults.innerHTML='<div class="search-no-results">No results for "'+q+'"</div>';
      searchResults.style.display='block';return;
    }
    const items=await Promise.all(res.results.slice(0,8).map(r=>r.data()));
    searchResults.innerHTML=items.map(item=>
      `<a href="${item.url}" class="search-result-item"><span class="search-result-title">${item.meta?.title||item.url}</span><span class="search-result-excerpt">${item.excerpt}</span></a>`
    ).join('');
    searchResults.style.display='block';
  });

  document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))searchResults.style.display='none';});
})();
