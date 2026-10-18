import { useState } from "react";

interface RealPhotoGalleryProps {
  images: string[];
  label: string;
}

export function RealPhotoGallery({ images, label }: RealPhotoGalleryProps) {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="real-gallery">
      <div className="real-gallery__main">
        <img src={images[index]} alt={`${label} — angle ${index + 1}`} className="real-gallery__image" />
        {images.length > 1 && (
          <>
            <button type="button" className="real-gallery__arrow real-gallery__arrow--prev" onClick={prev} aria-label="Previous angle">
              ‹
            </button>
            <button type="button" className="real-gallery__arrow real-gallery__arrow--next" onClick={next} aria-label="Next angle">
              ›
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="real-gallery__thumbs">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              className={`real-gallery__thumb${i === index ? " real-gallery__thumb--active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`View angle ${i + 1}`}
            >
              <img src={img} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
