document.querySelectorAll<HTMLElement>('[data-article-filter]').forEach((root) => {
  const select = root.querySelector<HTMLSelectElement>('select')!;
  const articles = [...root.querySelectorAll<HTMLElement>('article[data-category]')];
  const apply = () => {
    const category = new URL(location.href).searchParams.get('category') || '';
    select.querySelector('[data-unknown-category]')?.remove();
    if (category && ![...select.options].some((option) => option.value === category)) {
      const option = new Option(category, category);
      option.dataset.unknownCategory = 'true';
      select.add(option);
    }
    select.value = category;
    let count = 0;
    for (const article of articles) {
      article.hidden = !!category && article.dataset.category !== category;
      if (!article.hidden) count++;
    }
    root.querySelector<HTMLElement>('[data-filter-status]')!.textContent = '共 ' + count + ' 篇记录';
    root.querySelector<HTMLElement>('[data-filter-empty]')!.hidden = count > 0 || articles.length === 0;
  };
  select.addEventListener('change', () => {
    const url = new URL(location.href);
    if (select.value) url.searchParams.set('category', select.value);
    else url.searchParams.delete('category');
    history.pushState(null, '', url);
    apply();
  });
  window.addEventListener('popstate', apply);
  root.querySelector<HTMLElement>('[data-filter-controls]')!.hidden = false;
  apply();
});
