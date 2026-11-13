export function LoadingState({ label = 'Загружаем…' }: { label?: string }) {
  return <div role="status" className="grid min-h-[45vh] place-items-center text-sm text-ink/55 dark:text-slate-400"><span className="flex items-center gap-3"><span className="size-4 animate-spin rounded-full border-2 border-forest/20 border-t-forest dark:border-mint/20 dark:border-t-mint" />{label}</span></div>;
}
