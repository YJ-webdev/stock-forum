"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";

import { ComposableMap, Geographies, Geography } from "react-simple-maps/core";

import { geoEqualEarth } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";

import type { GeometryCollection, Topology } from "topojson-specification";

import { WORLD_MARKET_MARKERS } from "@/lib/data/world-market-markers";
import { MarketMapMarker } from "./market-map-marker";

type MapView = "market" | "sentiment";

interface MapTransform {
  x: number;
  y: number;
  zoom: number;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 480;

const PROJECTION_SCALE = 180;

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

const ZOOM_STEP = 1.18;

export function WorldMarketMap() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  /*
   * Drag information doesn't need to cause a render,
   * so keep it in a ref.
   */
  const dragRef = useRef<DragState | null>(null);

  const [view, setView] = useState<MapView>("market");

  /*
   * x / y:
   * translation relative to the center of the SVG.
   *
   * zoom:
   * current scale.
   */
  const [transform, setTransform] = useState<MapTransform>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  // =====================================================
  // WORLD DATA
  // =====================================================

  const world = useMemo(() => {
    const topology = worldData as unknown as Topology<{
      countries: GeometryCollection;
    }>;

    return feature(topology, topology.objects.countries);
  }, []);

  // =====================================================
  // PROJECTION
  //
  // Must match ComposableMap.
  // =====================================================

  const projection = useMemo(() => {
    return geoEqualEarth()
      .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
      .scale(PROJECTION_SCALE);
  }, []);

  // =====================================================
  // BROWSER COORDINATE -> SVG COORDINATE
  //
  // Important because SVG is responsive:
  //
  // browser width may be 800px
  // while viewBox is 1000px.
  // =====================================================

  const clientToSvg = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const svg = svgRef.current;

      if (!svg) {
        return null;
      }

      const rect = svg.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return null;
      }

      return [
        ((clientX - rect.left) / rect.width) * MAP_WIDTH,

        ((clientY - rect.top) / rect.height) * MAP_HEIGHT,
      ];
    },
    [],
  );

  // =====================================================
  // BASE PROJECTED POINT -> SCREEN POINT
  //
  // This is the SINGLE transform used by:
  //
  // 1. map
  // 2. markers
  //
  // This is why they remain synchronized.
  // =====================================================

  const projectedToScreen = useCallback(
    (
      projectedX: number,
      projectedY: number,
      currentTransform = transform,
    ): [number, number] => {
      const centerX = MAP_WIDTH / 2;
      const centerY = MAP_HEIGHT / 2;

      return [
        centerX +
          currentTransform.x +
          (projectedX - centerX) * currentTransform.zoom,

        centerY +
          currentTransform.y +
          (projectedY - centerY) * currentTransform.zoom,
      ];
    },
    [transform],
  );

  // =====================================================
  // MARKER LONG/LAT -> SCREEN X/Y
  // =====================================================

  const getMarkerPosition = useCallback(
    (coordinates: [number, number]): [number, number] | null => {
      const projected = projection(coordinates);

      if (!projected) {
        return null;
      }

      const [x, y] = projectedToScreen(projected[0], projected[1]);

      /*
       * Rounding prevents tiny SSR/client
       * floating point hydration differences.
       */
      return [Number(x.toFixed(4)), Number(y.toFixed(4))];
    },
    [projection, projectedToScreen],
  );

  // =====================================================
  // CURSOR-CENTERED WHEEL ZOOM
  // =====================================================

  const handleWheel = useCallback(
    (event: WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const mouse = clientToSvg(event.clientX, event.clientY);

      if (!mouse) {
        return;
      }

      const [mouseX, mouseY] = mouse;

      setTransform((current) => {
        const zoomFactor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;

        const nextZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, current.zoom * zoomFactor),
        );

        if (nextZoom === current.zoom) {
          return current;
        }

        /*
         * Current transform:
         *
         * screen =
         * center
         * + translate
         * + (point - center) * zoom
         *
         *
         * We want the geographic/map point
         * currently under the cursor to remain
         * underneath the cursor after zoom.
         *
         * First recover that unscaled map point.
         */

        const centerX = MAP_WIDTH / 2;

        const centerY = MAP_HEIGHT / 2;

        const mapX = centerX + (mouseX - centerX - current.x) / current.zoom;

        const mapY = centerY + (mouseY - centerY - current.y) / current.zoom;

        /*
         * Now calculate the translation required
         * to keep mapX/mapY exactly underneath
         * mouseX/mouseY at the new zoom.
         */

        const nextX = mouseX - centerX - (mapX - centerX) * nextZoom;

        const nextY = mouseY - centerY - (mapY - centerY) * nextZoom;

        return {
          x: nextX,
          y: nextY,
          zoom: nextZoom,
        };
      });
    },
    [clientToSvg],
  );

  // =====================================================
  // POINTER DOWN
  // =====================================================

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      /*
       * Only primary mouse button.
       */
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const svg = svgRef.current;

      if (!svg) {
        return;
      }

      svg.setPointerCapture(event.pointerId);

      dragRef.current = {
        pointerId: event.pointerId,

        startClientX: event.clientX,

        startClientY: event.clientY,

        startX: transform.x,

        startY: transform.y,
      };
    },
    [transform.x, transform.y],
  );

  // =====================================================
  // POINTER MOVE
  // =====================================================

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const svg = svgRef.current;

      if (!svg) {
        return;
      }

      const rect = svg.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      /*
       * Browser pixel delta -> SVG delta.
       */

      const scaleX = MAP_WIDTH / rect.width;

      const scaleY = MAP_HEIGHT / rect.height;

      const deltaX = (event.clientX - drag.startClientX) * scaleX;

      const deltaY = (event.clientY - drag.startClientY) * scaleY;

      setTransform((current) => ({
        ...current,

        x: drag.startX + deltaX,

        y: drag.startY + deltaY,
      }));
    },
    [],
  );

  // =====================================================
  // POINTER UP
  // =====================================================

  const stopDragging = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const svg = svgRef.current;

      if (svg?.hasPointerCapture(event.pointerId)) {
        svg.releasePointerCapture(event.pointerId);
      }

      dragRef.current = null;
    },
    [],
  );

  // =====================================================
  // RESET
  //
  // Optional: double click map.
  // =====================================================

  const handleDoubleClick = useCallback(() => {
    setTransform({
      x: 0,
      y: 0,
      zoom: 1,
    });
  }, []);

  // =====================================================
  // MAP TRANSFORM
  //
  // Geography receives scale + translation.
  //
  // transform-origin is MAP CENTER.
  // =====================================================

  const mapTransform = `
    translate(
      ${MAP_WIDTH / 2 + transform.x}
      ${MAP_HEIGHT / 2 + transform.y}
    )
    scale(${transform.zoom})
    translate(
      ${-MAP_WIDTH / 2}
      ${-MAP_HEIGHT / 2}
    )
  `;

  return (
    <section className="w-full px-3 py-5 md:px-5">
      <div className="mx-auto w-full max-w-350">
        {/* =============================================
            VIEW SWITCH
        ============================================= */}

        <div className="mb-3 flex items-center justify-between">
          <div className="flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setView("market")}
              className={`rounded px-2.5 py-1 text-[13px] transition-colors ${
                view === "market"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Market
            </button>

            <button
              type="button"
              onClick={() => setView("sentiment")}
              className={`rounded px-2.5 py-1 text-[13px] transition-colors ${
                view === "sentiment"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Sentiment
            </button>
          </div>
        </div>

        {/* =============================================
            MAP
        ============================================= */}

        <div
          className="
            w-full
            overflow-hidden
            overscroll-contain
          "
        >
          <ComposableMap
            ref={svgRef}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            projection="geoEqualEarth"
            projectionConfig={{
              scale: PROJECTION_SCALE,
            }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onDoubleClick={handleDoubleClick}
            className="
              h-auto
              w-full
              cursor-grab
              select-none
              touch-none
              active:cursor-grabbing
            "
          >
            {/* =========================================
                MOVING / ZOOMING MAP

                Only geography is scaled.
            ========================================= */}

            <g transform={mapTransform}>
              <Geographies geography={world}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      stroke="none"
                      tabIndex={-1}
                      className="
                          fill-zinc-200/50
                          outline-none
                          dark:fill-zinc-800
                        "
                    />
                  ))
                }
              </Geographies>
            </g>

            {/* =========================================
                FIXED-SIZE MARKET MARKERS

                NOT inside map <g>.

                Their POSITION uses the exact same
                transform math as geography.

                Their SIZE is never transformed.
            ========================================= */}

            {WORLD_MARKET_MARKERS.filter(
              (market) => transform.zoom >= (market.minZoom ?? 1),
            ).map((market) => {
              const position = getMarkerPosition(market.coordinates);

              if (!position) {
                return null;
              }

              const [x, y] = position;

              /*
               * Avoid mounting quote hooks
               * for markers far outside
               * the visible map.
               */
              if (
                x < -150 ||
                x > MAP_WIDTH + 150 ||
                y < -150 ||
                y > MAP_HEIGHT + 150
              ) {
                return null;
              }

              return (
                <MarketMapMarker
                  key={market.symbol}
                  symbol={market.symbol}
                  name={market.name}
                  displaySymbol={market.displaySymbol}
                  x={x}
                  y={y}
                  labelX={market.labelX}
                  labelY={market.labelY}
                  view={view}
                />
              );
            })}
          </ComposableMap>
        </div>
      </div>
    </section>
  );
}
