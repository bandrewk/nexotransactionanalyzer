export default function Spinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="relative w-[4rem] h-[4rem]">
        <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
      </div>
      {text && (
        <p className="text-[1.3rem] font-medium text-slate-400 tracking-wide">
          {text}
        </p>
      )}
    </div>
  );
}
