//BG ELEMENTS FIGURES AND ALL

import React from 'react';

const floatingElements = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    alt: "Fresh green apple",
    className: "top-20 left-10 w-16 h-16"
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    alt: "Orange slices",
    className: "top-40 right-20 w-20 h-20"
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1574484284002-952d92456975?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    alt: "Mixed vegetables",
    className: "top-60 left-1/4 w-14 h-14"
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    alt: "Spinach leaves",
    className: "bottom-40 right-10 w-18 h-18"
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    alt: "Blueberries",
    className: "bottom-20 left-16 w-16 h-16"
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    alt: "Strawberries",
    className: "top-32 right-1/3 w-12 h-12"
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    alt: "Avocado",
    className: "bottom-60 left-1/2 w-20 h-20"
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    alt: "Bell peppers",
    className: "top-80 left-20 w-14 h-14"
  }
];

export function FloatingElements() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {floatingElements.map((element, index) => (
        <img
          key={element.id}
          src={element.src}
          alt={element.alt}
          className={`floating-bg-element absolute ${element.className} rounded-full object-cover opacity-10 dark:opacity-5`}
          style={{
            animationDelay: `${index * 2}s`
          }}
        />
      ))}
    </div>
  );
}
