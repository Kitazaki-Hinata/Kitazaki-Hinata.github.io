import { clamp, fitScale, constrainPan, zoomAt } from './viewer-math';

export function initializeViewers() {
  document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((root) => {
    if (root.dataset.initialized) return;
    const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
    if (typeof dialog.showModal !== 'function') return;
    root.dataset.initialized = 'true';
    const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-gallery-image]')];
    const viewport = dialog.querySelector<HTMLElement>('.viewer-viewport')!;
    const picture = dialog.querySelector<HTMLImageElement>('[data-viewer-image]')!;
    const title = dialog.querySelector<HTMLElement>('[data-viewer-title]')!;
    const status = dialog.querySelector<HTMLElement>('[data-viewer-status]')!;
    const counter = dialog.querySelector<HTMLElement>('[data-viewer-counter]')!;
    const output = dialog.querySelector<HTMLOutputElement>('[data-viewer-zoom]')!;
    const original = dialog.querySelector<HTMLAnchorElement>('[data-viewer-original]')!;
    const button = (action: string) => dialog.querySelector<HTMLButtonElement>('[data-action="' + action + '"]')!;
    let index = 0, zoom = 1, x = 0, y = 0, naturalWidth = 1, naturalHeight = 1, fit = 1, version = 0;
    let loaded = false;
    let opener: HTMLElement | null = null;
    let previousOverflow = '';
    let pointerType = 'mouse';
    const pointers = new Map<number, { x: number; y: number }>();
    const update = () => {
      fit = fitScale(naturalWidth, naturalHeight, viewport.clientWidth, viewport.clientHeight);
      const scale = fit * zoom;
      ({ x, y } = constrainPan(x, y, naturalWidth * scale, naturalHeight * scale, viewport.clientWidth, viewport.clientHeight));
      picture.style.width = naturalWidth + 'px';
      picture.style.height = naturalHeight + 'px';
      picture.style.transform = 'translate(-50%, -50%) translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
      output.value = Math.round(zoom * 100) + '%';
      viewport.dataset.zoomed = String(zoom > 1);
      button('in').disabled = !loaded || zoom >= 5;
      button('out').disabled = !loaded || zoom <= 1;
      button('fit').disabled = !loaded;
    };
    const reset = () => { zoom = 1; x = 0; y = 0; pointers.clear(); update(); };
    const setZoom = (value: number, anchorX = 0, anchorY = 0) => {
      if (!loaded) return;
      const next = clamp(value, 1, 5);
      ({ x, y } = zoomAt(x, y, next / zoom, anchorX, anchorY));
      zoom = next;
      update();
    };
    const show = (next: number) => {
      index = clamp(next, 0, links.length - 1);
      const link = links[index];
      const token = ++version;
      loaded = false;
      picture.hidden = true;
      picture.removeAttribute('src');
      title.textContent = link.dataset.title || '图片查看器';
      counter.textContent = (index + 1) + ' / ' + links.length;
      original.href = link.href;
      button('previous').disabled = index === 0;
      button('next').disabled = index === links.length - 1;
      status.textContent = '正在加载原图…';
      reset();
      const pending = new Image();
      pending.onload = () => {
        if (token !== version || !dialog.open) return;
        naturalWidth = pending.naturalWidth;
        naturalHeight = pending.naturalHeight;
        picture.src = link.href;
        picture.alt = link.dataset.alt || link.dataset.title || '';
        loaded = true;
        picture.hidden = false;
        status.textContent = '';
        reset();
      };
      pending.onerror = () => {
        if (token === version && dialog.open) status.textContent = '原图加载失败，可在新标签页重试或切换图片。';
      };
      pending.src = link.href;
    };
    const open = (link: HTMLAnchorElement) => {
      opener = link;
      previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      show(Number(link.dataset.index));
      button('close').focus({ preventScroll: true });
    };
    root.addEventListener('pointerdown', (event) => { pointerType = event.pointerType; });
    root.addEventListener('click', (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('[data-gallery-image], [data-view-image]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (root.dataset.activation !== 'double' || link.hasAttribute('data-view-image') || pointerType === 'touch' || pointerType === 'pen' || event.detail === 0) open(link);
    });
    root.addEventListener('dblclick', (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('[data-gallery-image]');
      if (root.dataset.activation === 'double' && link && !dialog.open && !event.ctrlKey && !event.metaKey) { event.preventDefault(); open(link); }
    });
    dialog.addEventListener('close', () => {
      version++;
      loaded = false;
      picture.hidden = true;
      picture.removeAttribute('src');
      pointers.clear();
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    });
    let backdropDown = false;
    dialog.addEventListener('pointerdown', (event) => { backdropDown = event.target === dialog; });
    dialog.addEventListener('click', (event) => {
      if (backdropDown && event.target === dialog) dialog.close();
      const action = (event.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'close') dialog.close();
      if (action === 'previous') show(index - 1);
      if (action === 'next') show(index + 1);
      if (action === 'fit') reset();
      if (action === 'in') setZoom(zoom * 1.25);
      if (action === 'out') setZoom(zoom / 1.25);
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (['ArrowLeft', 'ArrowRight', '+', '=', '-', '0'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'ArrowLeft' && index > 0) show(index - 1);
        if (event.key === 'ArrowRight' && index < links.length - 1) show(index + 1);
        if (event.key === '+' || event.key === '=') setZoom(zoom * 1.25);
        if (event.key === '-') setZoom(zoom / 1.25);
        if (event.key === '0') reset();
      }
    });
    viewport.addEventListener('wheel', (event) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
      setZoom(zoom * Math.exp(-clamp(delta, -300, 300) * .002), event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
    }, { passive: false });
    viewport.addEventListener('pointerdown', (event) => {
      if (!loaded || event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', (event) => {
      const before = [...pointers.values()];
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        x += event.clientX - previous.x; y += event.clientY - previous.y; update();
      } else if (pointers.size === 2) {
        const after = [...pointers.values()];
        const distance = (points: typeof before) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        const center = (points: typeof before) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
        const from = center(before), to = center(after), rect = viewport.getBoundingClientRect();
        setZoom(zoom * distance(after) / Math.max(1, distance(before)), from.x - rect.left - rect.width / 2, from.y - rect.top - rect.height / 2);
        x += to.x - from.x; y += to.y - from.y; update();
      }
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(type, (event) => pointers.delete((event as PointerEvent).pointerId));
    new ResizeObserver(() => { if (dialog.open) update(); }).observe(viewport);
  });
}
