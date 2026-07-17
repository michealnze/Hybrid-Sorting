
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dataInput = document.getElementById('data-input');
  const fileInput = document.getElementById('file-input');
  const modeToggle = document.getElementById('mode-toggle');
  const modeLabel = document.getElementById('mode-label');
  const sortBtn = document.getElementById('sort-btn');
  const clearBtn = document.getElementById('clear-btn');
  const resultsBody = document.getElementById('results-body');
  const loading = document.getElementById('loading');
  const statusArea = document.getElementById('status-area');
  const sampleBtns = document.querySelectorAll('.sample-btn');
  const exportCsvBtn = document.getElementById('export-csv');
  const exportPdfBtn = document.getElementById('export-pdf');
  const themeToggle = document.getElementById('theme-toggle');
  const sizeHint = document.getElementById('size-hint');

  // Charts
  let barChart = null, lineChart = null;

  // State
  let lastResults = null;

  // Mode label
  function updateModeLabel(){
    modeLabel.textContent = modeToggle.checked ? 'Numeric' : 'Alphabetical';
  }
  modeToggle.addEventListener('change', updateModeLabel);
  updateModeLabel();

  // Theme toggle
  themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', themeToggle.checked);
    document.body.classList.toggle('light-mode', !themeToggle.checked);
  });

  // File upload parsing
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const name = file.name.toLowerCase();
    if(!(/\.(txt|csv)$/).test(name)){
      alert('Only .txt or .csv files are supported.');
      fileInput.value = '';
      return;
    }
    try {
      const text = await file.text();
      dataInput.value = text.trim();
      statusArea.textContent = `Loaded ${file.name}`;
    } catch(err){
      console.error(err);
      alert('Failed to read file.');
    }
  });

  // Sample datasets (inline small/medium/large)
  const samples = {
    numbers_small: Array.from({length:20}, ()=> Math.floor(Math.random()*1000)).join('\n'),
    numbers_medium: Array.from({length:200}, ()=> Math.floor(Math.random()*10000)).join('\n'),
    numbers_large: Array.from({length:1200}, ()=> Math.floor(Math.random()*100000)).join('\n'),
    names_small: ['Ada','Bayo','Chinwe','David','Efe','Fatima','Grace','Hassan','Ife','John','Kemi','Lola','Mike','Ngozi','Ola','Paul','Queen','Rita','Sade','Tunde'].join('\n'),
    names_medium: Array.from({length:200}, (_,i)=> `Student ${i+1} ${['A','B','C','D'][i%4]}`).join('\n'),
    names_large: Array.from({length:800}, (_,i)=> `Student-${i+1}-MCM/HND/23/${String(3862+i).padStart(5,'0')}`).join('\n')
  };

  sampleBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const type = btn.dataset.type;
      const size = btn.dataset.size;
      const key = `${type}_${size}`;
      dataInput.value = samples[key] || '';
      statusArea.textContent = `Loaded sample: ${btn.textContent}`;
    });
  });

  // Clear
  clearBtn.addEventListener('click', ()=>{
    dataInput.value = '';
    resultsBody.innerHTML = '';
    statusArea.textContent = 'Cleared';
    lastResults = null;
    if(barChart) barChart.destroy();
    if(lineChart) lineChart.destroy();
  });

  // Parse input into array
  function parseInput(text){
    if(!text) return [];
    // Accept CSV or newline separated
    const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    // If single line with commas, split by comma
    if(lines.length === 1 && lines[0].includes(',')){
      return lines[0].split(',').map(s=>s.trim()).filter(Boolean);
    }
    return lines;
  }

  // Validate dataset
  function validateDataset(arr){
    if(!arr || arr.length === 0) return { ok:false, msg:'No data provided.' };
    if(arr.length > 50000) return { ok:false, msg:'Dataset too large for browser demo (limit 50k).' };
    return { ok:true };
  }

  // Run selected algorithms
  async function runSorts(dataArr){
    // Determine compare
    const numericMode = modeToggle.checked;
    const compare = numericMode ? Sorting.numericCompare : Sorting.textCompare;

    // Selected algorithms
    const algos = [];
    document.querySelectorAll('.algo-checkbox').forEach(cb=>{
      if(cb.checked){
        const id = cb.id;
        if(id.includes('bubble')) algos.push({key:'Bubble', fn:Sorting.bubble});
        if(id.includes('insertion')) algos.push({key:'Insertion', fn:Sorting.insertion});
        if(id.includes('merge')) algos.push({key:'Merge', fn:Sorting.merge});
        if(id.includes('quick')) algos.push({key:'Quick', fn:Sorting.quick});
        if(id.includes('hybrid')) algos.push({key:'Hybrid', fn:Sorting.hybrid});
      }
    });

    if(algos.length === 0) { alert('Select at least one algorithm.'); return; }

    // Prepare options
    const threshold = 32;
    const options = { threshold };

    // Run each algorithm sequentially (so CPU not overloaded)
    const results = [];
    for(const a of algos){
      statusArea.textContent = `Running ${a.key}...`;
      // Small delay to allow UI update
      await new Promise(r=>setTimeout(r, 20));
      const start = performance.now();
      // For hybrid, pass options
      const res = a.fn(dataArr, compare, options);
      const end = performance.now();
      // Some algorithms (merge) return new array; ensure result is array
      const sorted = res.result || res;
      results.push({
        name: a.key,
        sorted,
        timeMs: Math.round(res.timeMs || (end-start)),
        comparisons: res.comparisons || 0,
        memorySim: res.memorySim || 0
      });
    }
    return results;
  }

  // Render results table and charts
  function renderResults(results){
    lastResults = results;
    resultsBody.innerHTML = '';
    // Determine bests
    const bestTime = Math.min(...results.map(r=>r.timeMs));
    const bestMemory = Math.min(...results.map(r=>r.memorySim));
    const bestComp = Math.min(...results.map(r=>r.comparisons));

    results.forEach(r=>{
      const tr = document.createElement('tr');
      if(r.timeMs === bestTime) tr.classList.add('highlight-best');
      const sample = r.sorted.slice(0,20).join(', ');
      tr.innerHTML = `<td><strong>${r.name}</strong></td>
                      <td style="max-width:420px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(sample)}</td>
                      <td>${r.timeMs}</td>
                      <td>${r.comparisons}</td>
                      <td>${r.memorySim} KB</td>`;
      resultsBody.appendChild(tr);
    });

    // Update perf cards
    document.getElementById('best-time').textContent = `${bestTime} ms`;
    document.getElementById('best-memory').textContent = `${bestMemory} KB`;
    document.getElementById('best-comparisons').textContent = `${bestComp}`;

    // Charts
    const labels = results.map(r=>r.name);
    const times = results.map(r=>r.timeMs);
    const mems = results.map(r=>r.memorySim);
    const comps = results.map(r=>r.comparisons);

    // Bar chart (time)
    const barCtx = document.getElementById('barChart').getContext('2d');
    if(barChart) barChart.destroy();
    barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Time (ms)', data: times, backgroundColor: labels.map(l=> l==='Hybrid' ? '#198754' : '#0d6efd') },
          { label: 'Memory (KB)', data: mems, backgroundColor: '#6c757d' }
        ]
      },
      options: { responsive:true, plugins:{ legend:{ position:'top' } } }
    });

    // Line chart (comparisons)
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    if(lineChart) lineChart.destroy();
    lineChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Comparisons', data: comps, borderColor:'#ff7f50', backgroundColor:'rgba(255,127,80,0.12)', tension:0.3, fill:true }
        ]
      },
      options: { responsive:true, plugins:{ legend:{ display:false } } }
    });

    statusArea.textContent = 'Completed';
  }

  // Escape HTML for safe display
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Sort button
  sortBtn.addEventListener('click', async ()=>{
    const raw = dataInput.value.trim();
    const arr = parseInput(raw);
    const v = validateDataset(arr);
    if(!v.ok){ alert(v.msg); return; }

    // Convert numeric strings to numbers if numeric mode
    const numericMode = modeToggle.checked;
    const dataArr = numericMode ? arr.map(x=> isNaN(Number(x)) ? x : Number(x)) : arr.slice();

    // Show loading
    loading.classList.remove('d-none');
    sortBtn.disabled = true;

    try {
      const results = await runSorts(dataArr);
      renderResults(results);
    } catch(err){
      console.error(err);
      alert('An error occurred during sorting.');
    } finally {
      loading.classList.add('d-none');
      sortBtn.disabled = false;
    }
  });

  // Export CSV
  exportCsvBtn.addEventListener('click', ()=>{
    if(!lastResults){ alert('No results to export. Run Sort & Compare first.'); return; }
    const rows = [];
    rows.push(['Algorithm','ExecutionTimeMs','Comparisons','MemoryKB','SortedSample']);
    lastResults.forEach(r=>{
      rows.push([r.name, r.timeMs, r.comparisons, r.memorySim, r.sorted.slice(0,40000).join('; ')]);
    });
    const csv = rows.map(r=> r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sorting_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Export PDF (simple)
  /*exportPdfBtn.addEventListener('click', async ()=>{
    if(!lastResults){ alert('No results to export. Run Sort & Compare first.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'pt', format:'a4' });
    doc.setFontSize(14);
    doc.text('Smart Sorting Dashboard — Results', 40, 50);
    doc.setFontSize(10);
    let y = 80;
    lastResults.forEach(r=>{
      doc.text(`${r.name} — Time: ${r.timeMs} ms | Comparisons: ${r.comparisons} | Memory: ${r.memorySim} KB`, 40, y);
      y += 16;
      const sample = r.sorted.slice(0,40).join(', ');
      doc.text(`Sample: ${sample}`, 60, y);
      y += 20;
      if(y > 740){ doc.addPage(); y = 40; }
    });
    doc.save('sorting_results.pdf');
  });*/
  exportPdfBtn.addEventListener('click', async () => {
  if (!lastResults) {
    alert('No results to export. Run Sort & Compare first.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFontSize(14);
  doc.text('Smart Sorting Dashboard — Results', 40, 50);
  doc.setFontSize(10);

  let y = 80;
  const lineHeight = 16;          // base line height (pt)
  const pageBottom = 740;         // where we add a new page
  const maxSampleWidth = 500;     // width for sample wrapping (adjust as needed)

  lastResults.forEach(r => {
    // ---- Summary line -------------------------------------------------
    doc.text(
      `${r.name} — Time: ${r.timeMs} ms | Comparisons: ${r.comparisons} | Memory: ${r.memorySim} KB`,
      40,
      y
    );
    y += lineHeight;

    // ---- Sample (wrapped) ---------------------------------------------
    const sample = r.sorted.slice(0, 40000).join(', ');
    const wrapped = doc.splitTextToSize(`Sample: ${sample}`, maxSampleWidth);
    doc.text(wrapped, 60, y);
    y += wrapped.length * lineHeight; // advance by number of wrapped lines

    // ---- Small gap before the next algorithm -------------------------
    y += 8;

    // ---- Page-break ----------------------------------------------------
    if (y > pageBottom) {
      doc.addPage();
      y = 40; // reset to top margin on the new page
    }
  });

  doc.save('sorting_results.pdf');
});

  // Small helper: keyboard shortcut Ctrl+Enter to run
  document.addEventListener('keydown', (e)=>{
    if(e.ctrlKey && e.key === 'Enter') sortBtn.click();
  });

});
