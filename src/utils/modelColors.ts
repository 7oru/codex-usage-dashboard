export const MODEL_COLORS = ['#2563eb', '#059669', '#7c3aed', '#f59e0b', '#e11d48', '#0f766e', '#9333ea', '#ea580c'];

export function getModelColor(model: string, orderedModels: string[]): string {
  const index = orderedModels.indexOf(model);
  return MODEL_COLORS[(index >= 0 ? index : 0) % MODEL_COLORS.length];
}

export function getModelTagStyle(model: string, orderedModels: string[]): React.CSSProperties {
  const color = getModelColor(model, orderedModels);
  return {
    color,
    backgroundColor: `${color}1a`,
    borderColor: `${color}40`,
  };
}
