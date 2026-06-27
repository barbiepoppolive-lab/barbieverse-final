interface LessonImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}

export function LessonImage({ src, alt, caption, className = "" }: LessonImageProps) {
  return (
    <figure className={`my-8 ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md">
        <img
          src={src}
          alt={alt}
          className="w-full object-cover"
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function LessonImagePlaceholder({
  icon,
  label,
  className = "",
}: {
  icon: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`my-8 overflow-hidden rounded-2xl border border-border/40 bg-card/20 backdrop-blur-md ${className}`}>
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <span className="text-4xl">{icon}</span>
        <p className="mt-3 max-w-sm text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
