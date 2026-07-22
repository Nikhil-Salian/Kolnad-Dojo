import Image from 'next/image';

export default function Logo({ size = 56 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center shrink-0">
        <Image
          src="/icons/icon-192.png"
          alt="Kolnad Dojo logo"
          width={size}
          height={size}
          className="rounded-sm object-contain"
          priority
        />
      </div>
      <div className="leading-tight">
        <p className="font-display font-bold tracking-wide text-paper text-[15px] sm:text-lg">
          INSTITUTE OF KARATE
        </p>
        <p className="font-display font-bold tracking-wide text-paper text-[15px] sm:text-lg -mt-0.5">
          AND ALLIED ARTS
        </p>
        <p className="font-body text-[11px] tracking-[0.25em] text-gold uppercase mt-1">
          Kolnad Dojo
        </p>
      </div>
    </div>
  );
}
