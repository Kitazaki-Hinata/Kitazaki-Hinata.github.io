interface ImageSize { width: number; height: number }
interface GalleryPlacement { row: number; column: number; span: number }

/** Three-column positions for images in display order (newest to oldest). */
export function getGalleryLayout(images: readonly ImageSize[]): GalleryPlacement[] {
  const wide = images.map((image) => image.width >= image.height);
  const placements: GalleryPlacement[] = [];
  let row = 1, column = 1;
  const place = (span: number) => {
    if (column + span > 4) { row++; column = 1; }
    placements.push({ row, column, span });
    column += span;
  };

  for (let index = 0; index < images.length;) {
    if (!wide[index]) {
      // A newer portrait can share a row with the newer of exactly two wide works.
      // Reserve the left column for it, even after other portraits in a partial row.
      if (wide[index + 1] && wide[index + 2] && !wide[index + 3]) {
        if (column !== 1) { row++; column = 1; }
        place(1);
        place(2);
        place(2);
        index += 3;
        continue;
      }
      place(1);
      index++;
      continue;
    }
    let end = index + 1;
    while (end < images.length && wide[end]) end++;
    const count = end - index;

    if (count >= 3) {
      for (let current = index; current < end; current++) place(3);
    } else if (count === 2) {
      // No newer portrait: the newer wide work gets a full row. The older one
      // sits on the left, leaving room for an older portrait on the right.
      place(3);
      place(2);
    } else {
      place(2);
    }
    index = end;
  }
  return placements;
}
