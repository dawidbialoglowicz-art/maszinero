"use client";

import { useState } from "react";
import { MachineIcon } from "./Icons";

export function Gallery({ images, title, category }: { images: string[]; title: string; category: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="gallery">
      <div className="main">
        {images.length ? <img src={images[i]} alt={`${title}, zdjęcie ${i + 1} z ${images.length}`} /> : <MachineIcon category={category} />}
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((src, n) => (
            <button key={src} type="button" aria-current={n === i} aria-label={`Zdjęcie ${n + 1}`} onClick={() => setI(n)}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
