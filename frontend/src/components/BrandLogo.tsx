interface BrandLogoProps {
  variant?: "dark" | "light";
  className?: string;
  size?: "sm" | "md" | "lg" | "hero";
}

export function BrandLogo({ variant = "dark", className = "", size = "md" }: BrandLogoProps) {
  const isDark = variant === "dark";
  const textColor = isDark ? "text-offwhite" : "text-navy-950";

  let textSize = "text-xl";

  if (size === "sm") {
    textSize = "text-lg";
  } else if (size === "lg") {
    textSize = "text-3xl";
  } else if (size === "hero") {
    textSize = "text-5xl md:text-7xl";
  }

  return (
    <div className={`flex items-center ${className}`}>
      <span className={`${textSize} font-extrabold tracking-tight ${textColor} leading-none`}>
        Civic<span className="text-teal-500">Pulse</span>
      </span>
    </div>
  );
}
