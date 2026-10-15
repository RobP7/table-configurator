import type { ReactNode } from "react";

interface OptionCardProps {
  label: string;
  description?: string;
  swatchColor?: string;
  icon?: ReactNode;
  iconColor?: string;
  image?: string;
  selected: boolean;
  onSelect: () => void;
}

export function OptionCard({
  label,
  description,
  swatchColor,
  icon,
  iconColor,
  image,
  selected,
  onSelect,
}: OptionCardProps) {
  return (
    <button
      type="button"
      className={`option-card${selected ? " option-card--selected" : ""}`}
      onClick={onSelect}
    >
      {image ? (
        <span className="option-card__icon option-card__icon--photo">
          <img src={image} alt="" loading="lazy" />
        </span>
      ) : (
        icon && (
          <span className="option-card__icon" style={iconColor ? { color: iconColor } : undefined}>
            {icon}
          </span>
        )
      )}
      {swatchColor && (
        <span className="option-card__swatch" style={{ backgroundColor: swatchColor }} />
      )}
      <span className="option-card__body">
        <span className="option-card__label">{label}</span>
        {description && <span className="option-card__desc">{description}</span>}
      </span>
    </button>
  );
}
