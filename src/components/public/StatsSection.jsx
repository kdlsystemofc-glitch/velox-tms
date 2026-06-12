import React, { useState, useEffect, useRef } from "react";
import { Calendar, Truck, Package, MapPin } from "lucide-react";

function AnimatedCounter({ target, suffix = "", prefix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const duration = 2000;
          const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <span ref={ref} className="font-display text-4xl sm:text-5xl font-extrabold text-velox-amber">
      {prefix}{count}{suffix}
    </span>
  );
}

const stats = [
  { icon: Calendar, value: 20, suffix: "+", label: "Anos de mercado", prefix: "" },
  { icon: Truck, value: 3, suffix: "", label: "Frotas próprias", prefix: "" },
  { icon: Package, value: 5000, suffix: "+", label: "Entregas realizadas", prefix: "" },
  { icon: MapPin, value: 100, suffix: "+", label: "Cidades atendidas", prefix: "" },
];

export default function StatsSection() {
  return (
    <section className="relative -mt-20 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/5 border border-gray-100 p-8 sm:p-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-velox-dark/5 rounded-xl mb-4">
                  <stat.icon className="w-6 h-6 text-velox-dark" />
                </div>
                <div className="mb-1">
                  <AnimatedCounter
                    target={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                  />
                </div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}