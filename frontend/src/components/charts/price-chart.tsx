import { useEffect, useRef } from "react";
import { createChart, LineSeries, ColorType } from "lightweight-charts";

interface PriceChartProps {
  data: { date: string; price: number }[];
  height?: number;
}

export function PriceChart({ data, height = 360 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#93a69b",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1a211c" },
        horzLines: { color: "#1a211c" },
      },
      width: containerRef.current.clientWidth,
      height,
      timeScale: { borderColor: "#232b26" },
      rightPriceScale: { borderColor: "#232b26" },
      crosshair: { mode: 0 },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#34d399",
      lineWidth: 2,
      priceLineVisible: false,
    });

    series.setData(data.map((d) => ({ time: d.date, value: d.price })) as never);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height]);

  return <div ref={containerRef} className="w-full" />;
}
