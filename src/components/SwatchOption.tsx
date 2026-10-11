import { CURRENCY } from "../config/options";

interface SwatchOptionProps {
  label: string;
  color: string;
  image?: string;
  priceModifier: number;
  selected: boolean;
  onSelect: () => void;
}

export function SwatchOption({
  label,
  color,
  image,
  priceModifier,
  selected,
  onSelect,
}: SwatchOptionProps) {
  return (
    <button
      type="button"
      className={`swatch-option${selected ? " swatch-option--selected" : ""}`}
      onClick={onSelect}
      title={label}
    >
      {image ? (
        <span className="swatch-option__circle swatch-option__circle--photo">
          <img src={image} alt="" loading="lazy" />
        </span>
      ) : (
        <span className="swatch-option__circle" style={{ backgroundColor: color }} />
      )}
      <span className="swatch-option__label">{label}</span>
      {priceModifier !== 0 && (
        <span className="swatch-option__price">
          +{CURRENCY}
          {priceModifier}
        </span>
      )}
    </button>
  );
}
