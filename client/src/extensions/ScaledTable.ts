import Table from '@tiptap/extension-table';

function clampScale(value: number) {
  return Math.max(60, Math.min(140, Math.round(value)));
}

export function getClampedTableScale(value: number) {
  return clampScale(value);
}

export const ScaledTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      scale: {
        default: 100,
        parseHTML: (element) => {
          const value = Number(element.getAttribute('data-scale'));
          return Number.isFinite(value) ? clampScale(value) : 100;
        },
        renderHTML: (attributes) => {
          const scale = clampScale(Number(attributes.scale) || 100);
          return {
            'data-scale': String(scale),
            style: `width:${scale}%;`
          };
        }
      }
    };
  }
});
