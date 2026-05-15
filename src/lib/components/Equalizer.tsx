type EqualizerProps = {
  className?: string;
};

export default function Equalizer({ className = "" }: EqualizerProps) {
  return (
    <div
      className={`flex h-4 items-end justify-center gap-[2px] opacity-90 ${className}`}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded bg-green-600 animate-[equalize_1s_ease-in-out_infinite]`}
          style={{
            animationDelay: `${i * 0.15}s`,
            height: "12px",
          }}
        />
      ))}
    </div>
  );
}
