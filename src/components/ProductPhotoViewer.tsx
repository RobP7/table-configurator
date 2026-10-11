import { TOP_RANGES } from "../config/options";
import { useConfigStore } from "../store/useConfigStore";

export function ProductPhotoViewer() {
  const { topRangeId, legFinishId } = useConfigStore();
  const range = TOP_RANGES.find((r) => r.id === topRangeId)!;
  const photo = (legFinishId ? range.heroImages?.[legFinishId] : undefined) ?? range.image;

  if (!photo) {
    return (
      <div className="photo-viewer photo-viewer--empty">
        <p>No product photo yet for this combination — add one to heroImages in options.ts.</p>
      </div>
    );
  }

  return (
    <div className="photo-viewer">
      <img key={photo} src={photo} alt={range.label} className="photo-viewer__image" />
    </div>
  );
}
