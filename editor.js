if (new URLSearchParams(location.search).get('edit') === '1') {
  const original = document.documentElement.cloneNode(true);
  const originalStats = original.querySelector('.stats');
  originalStats.hidden = true;
  for (const value of originalStats.querySelectorAll('dd')) value.textContent = '';
  const entries = original.querySelectorAll('.trade');
  const toolbar = document.createElement('section');
  toolbar.className = 'editor';
  toolbar.innerHTML = '<p>Edit a title or notes below, then download the updated page.</p><button type="button">Download updated page</button>';
  document.querySelector('main').prepend(toolbar);

  const editors = Array.from(document.querySelectorAll('.trade'), trade => {
    const editor = document.createElement('div');
    editor.className = 'editor';
    editor.innerHTML = '<label>Trade title<input required></label><label>My notes<textarea rows="5"></textarea></label>';
    const title = editor.querySelector('input');
    const notes = editor.querySelector('textarea');
    title.value = trade.querySelector('h3').textContent;
    notes.value = Array.from(trade.querySelectorAll('.notes p'), paragraph => paragraph.textContent).join('\n\n');
    trade.append(editor);
    return { title, notes };
  });

  toolbar.querySelector('button').addEventListener('click', () => {
    for (const { title } of editors) {
      title.setCustomValidity(title.value.trim() ? '' : 'Enter a trade title.');
      if (!title.reportValidity()) return;
    }

    editors.forEach(({ title, notes }, index) => {
      const entry = entries[index];
      entry.querySelector('h3').textContent = title.value.trim();
      const section = entry.querySelector('.notes');
      section.querySelectorAll('p').forEach(paragraph => paragraph.remove());
      for (const text of notes.value.trim().split(/\n\s*\n/)) {
        if (!text) continue;
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        section.append(paragraph);
      }
    });

    const url = URL.createObjectURL(new Blob(['<!doctype html>\n', original.outerHTML], { type: 'text/html' }));
    const download = document.createElement('a');
    download.href = url;
    download.download = 'index.html';
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
