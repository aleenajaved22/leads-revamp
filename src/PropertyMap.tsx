import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COMPANY_COLORS, mountBuilding } from "./BuildingModel";
import { BuildingStackingPlan } from "./BuildingStackingPlan";
import { occupancyLabel, type Company } from "./data";

type BuildingProps = { companies: Company[]; floorCount?: number; rba?: string };

type MapMode = "map" | "satellite" | "building";
type BuildingPresentation = "3d" | "stacking";

const STREET_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const PIN_COLORS = COMPANY_COLORS;
const BUILDING_PIN = "#146dff";
const BUILDING_ZOOM = 18;
const COMPANY_ZOOM = 19;

const geocodeCache = new Map<string, [number, number]>();
const geocodePending = new Map<string, Promise<[number, number] | null>>();

function addressQueries(address: string) {
  const stripped = address
    .replace(/\b\d{5}(?:-\d{4})?\b/g, " ")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = stripped.split(" ").filter(Boolean);
  const queries = [address.trim(), stripped];
  for (let length = words.length - 1; length >= 2; length -= 1) {
    queries.push(words.slice(0, length).join(" "));
  }
  return [...new Set(queries.filter(Boolean))].sort((left, right) => {
    const rank = (query: string) => {
      const words = query.split(" ").length;
      return (/\d/.test(query) ? 0 : 20) + Math.abs(words - 3);
    };
    return rank(left) - rank(right);
  });
}

async function locateQuery(query: string): Promise<[number, number] | null> {
  const response = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(query)}`);
  if (!response.ok) return null;
  const data = (await response.json()) as { features?: { geometry?: { coordinates?: number[] } }[] };
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2 || Number.isNaN(coords[0]) || Number.isNaN(coords[1])) return null;
  return [coords[1], coords[0]];
}

function geocode(address: string): Promise<[number, number] | null> {
  const cached = geocodeCache.get(address);
  if (cached) return Promise.resolve(cached);
  const pending = geocodePending.get(address);
  if (pending) return pending;

  const request = (async () => {
    for (const query of addressQueries(address)) {
      try {
        const point = await locateQuery(query);
        if (point) {
          geocodeCache.set(address, point);
          return point;
        }
      } catch {
        // Try the next, shorter form of the address.
      }
    }
    return null;
  })().finally(() => {
    geocodePending.delete(address);
  });

  geocodePending.set(address, request);
  return request;
}

/** Shift pin from street geocode onto the building footprint (north on the map). */
function buildingMarkerPoint(map: L.Map, geocodePoint: [number, number]): [number, number] {
  const projected = map.latLngToContainerPoint(geocodePoint);
  const shifted = L.point(projected.x, projected.y - 36);
  const adjusted = map.containerPointToLatLng(shifted);
  return [adjusted.lat, adjusted.lng];
}

function pinOffset(center: [number, number], index: number, count: number): [number, number] {
  if (count <= 1) return center;
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  const radius = 0.00028;
  return [center[0] + Math.sin(angle) * radius, center[1] + Math.cos(angle) * radius];
}

function pinMarkup(color: string, label?: string) {
  const letter = label?.trim().match(/[A-Za-z0-9]/)?.[0]?.toUpperCase();
  const mark = letter
    ? `<circle cx="16" cy="15" r="8" fill="#fff"/><text x="16" y="19" text-anchor="middle" font-size="11" font-weight="700" fill="${color}">${letter}</text>`
    : `<circle cx="16" cy="15" r="5.5" fill="#fff"/>`;
  return `<svg class="map-pin" width="32" height="42" viewBox="0 0 32 42" aria-hidden="true">
    <path d="M16 41S2 24.5 2 15a14 14 0 1 1 28 0C30 24.5 16 41 16 41z" fill="${color}"/>
    ${mark}
  </svg>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char] ?? char;
  });
}

function companiesTooltip(companies: Company[], maxHeight: number) {
  if (companies.length === 0) {
    return `<div class="map-companies"><p class="map-companies-empty">No companies at this property</p></div>`;
  }
  const items = companies
    .map((company, index) => {
      const color = PIN_COLORS[index % PIN_COLORS.length];
      const name = escapeHtml(company.name.trim() || "Untitled company");
      const place = escapeHtml(occupancyLabel(company));
      return `<li><span class="map-company-swatch" style="background:${color}"></span><span><span class="map-company-name">${name}</span><span class="map-company-place">${place}</span></span></li>`;
    })
    .join("");
  const title = `${companies.length} ${companies.length === 1 ? "company" : "companies"}`;
  return `<div class="map-companies"><p class="map-companies-title">${title}</p><ul class="map-company-list" style="max-height:${maxHeight}px">${items}</ul></div>`;
}

function placePropertyMarkers(map: L.Map, markers: L.LayerGroup, point: [number, number], companies: Company[]) {
  markers.clearLayers();
  const anchor = buildingMarkerPoint(map, point);
  const xy = map.latLngToContainerPoint(anchor);
  const height = map.getContainer().clientHeight;
  const above = xy.y;
  const below = height - xy.y;
  const openBelow = below + 80 >= above;
  const space = openBelow ? below : above;
  const room = Math.max(96, Math.min(200, space - (openBelow ? 88 : 80)));
  const building = L.marker(anchor, {
    icon: L.divIcon({
      className: "map-pin-wrap",
      html: pinMarkup(BUILDING_PIN),
      iconSize: [32, 42],
      iconAnchor: [16, 42],
    }),
    zIndexOffset: 1000,
  }).bindTooltip(companiesTooltip(companies, room), {
    direction: openBelow ? "bottom" : "top",
    offset: openBelow ? [0, 8] : [0, -38],
    opacity: 1,
    interactive: true,
    className: "map-companies-tip",
  });
  building.addTo(markers);

  if (map.getZoom() < COMPANY_ZOOM) return;

  companies.forEach((company, index) => {
    const color = PIN_COLORS[index % PIN_COLORS.length];
    const icon = L.divIcon({
      className: "map-pin-wrap",
      html: pinMarkup(color, company.name),
      iconSize: [32, 42],
      iconAnchor: [16, 42],
    });
    const place = occupancyLabel(company);
    L.marker(pinOffset(anchor, index, companies.length), { icon })
      .bindTooltip(`${escapeHtml(company.name || "Untitled company")}<br>${escapeHtml(place)}`, {
        direction: "top",
        offset: [0, -40],
      })
      .addTo(markers);
  });
}

function MapViewTabs({ mode, onModeChange }: { mode: MapMode; onModeChange: (mode: MapMode) => void }) {
  return (
    <div className="map-view-tabs" role="tablist" aria-label="Map views">
      {(
        [
          ["map", "Map"],
          ["satellite", "Satellite"],
          ["building", "Building"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          className={mode === id ? "is-active" : ""}
          onClick={() => onModeChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function BuildingPresentationToggle({
  value,
  onChange,
}: {
  value: BuildingPresentation;
  onChange: (value: BuildingPresentation) => void;
}) {
  return (
    <div className="building-presentation-toggle" role="group" aria-label="Building view">
      <button
        type="button"
        className={value === "3d" ? "is-active" : ""}
        aria-pressed={value === "3d"}
        onClick={() => onChange("3d")}
      >
        3D
      </button>
      <button
        type="button"
        className={value === "stacking" ? "is-active" : ""}
        aria-pressed={value === "stacking"}
        onClick={() => onChange("stacking")}
      >
        Stack
      </button>
    </div>
  );
}

function BuildingStage({
  active,
  companies,
  floorCount,
  rba,
}: BuildingProps & { active: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!active || !host) return;
    const scene = mountBuilding(host, companies, { floorCount, rba });
    return () => {
      scene.dispose();
    };
  }, [active, companies, floorCount, rba]);

  return <div ref={hostRef} className="building-stage" />;
}

function PropertyMapViewport({
  mode,
  address,
  companies,
  floorCount,
  rba,
  active,
  onExpand,
  onModeChange,
  buildingPresentation,
  onBuildingPresentationChange,
}: BuildingProps & {
  mode: MapMode;
  address: string;
  active: boolean;
  onExpand?: () => void;
  onModeChange: (mode: MapMode) => void;
  buildingPresentation: BuildingPresentation;
  onBuildingPresentationChange: (value: BuildingPresentation) => void;
}) {
  const [missing, setMissing] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    const map = L.map(host, {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
      zoomSnap: 1,
    }).setView([39.5, -98.35], 4);
    tilesRef.current = L.tileLayer(STREET_TILES, {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
      tilesRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const map = mapRef.current;
    if (!map) return;
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(frame);
  }, [active, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode === "building") return;

    tilesRef.current?.remove();
    tilesRef.current = L.tileLayer(mode === "satellite" ? SATELLITE_TILES : STREET_TILES, {
      attribution: mode === "satellite" ? "Tiles &copy; Esri" : "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    map.invalidateSize();
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    let cancelled = false;
    let detachZoom = () => {};
    markers.clearLayers();
    setMissing(false);

    if (!address) {
      setMissing(true);
      return;
    }

    geocode(address)
      .then((point) => {
        const activeMap = mapRef.current;
        const activeMarkers = markersRef.current;
        if (cancelled || !activeMap || !activeMarkers) return;
        if (!point) {
          setMissing(true);
          return;
        }
        activeMap.setView(point, BUILDING_ZOOM);
        placePropertyMarkers(activeMap, activeMarkers, point, companies);
        const anchor = buildingMarkerPoint(activeMap, point);
        activeMap.setView(anchor, activeMap.getZoom(), { animate: false });
        const onZoom = () => {
          const zoomMap = mapRef.current;
          const zoomMarkers = markersRef.current;
          if (!zoomMap || !zoomMarkers) return;
          placePropertyMarkers(zoomMap, zoomMarkers, point, companies);
        };
        activeMap.on("zoomend", onZoom);
        detachZoom = () => activeMap.off("zoomend", onZoom);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });

    return () => {
      cancelled = true;
      detachZoom();
    };
  }, [address, companies]);

  const buildingActive = active && mode === "building" && buildingPresentation === "3d";
  const showBuildingChrome = mode === "building";

  return (
    <div className={mode === "building" ? "property-map-viewport is-building" : "property-map-viewport"}>
      <div className="property-map-frame">
        <div ref={hostRef} className="property-map-canvas" />
        {mode !== "building" && missing && <p className="property-map-empty">Map unavailable for this property.</p>}
        {showBuildingChrome && (
          <div className={`building-view${buildingPresentation === "stacking" ? " is-stacking" : ""}`}>
            {buildingPresentation === "3d" ? (
              <BuildingStage active={buildingActive} companies={companies} floorCount={floorCount} rba={rba} />
            ) : (
              <BuildingStackingPlan companies={companies} floorCount={floorCount} rba={rba} />
            )}
          </div>
        )}
        <MapViewTabs mode={mode} onModeChange={onModeChange} />
        {showBuildingChrome && (
          <BuildingPresentationToggle value={buildingPresentation} onChange={onBuildingPresentationChange} />
        )}
        {onExpand && (
          <button type="button" className="building-expand" aria-label="Open full model" onClick={onExpand}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2.5 6.5V3.5h3M13.5 6.5V3.5h-3M2.5 9.5v3h3M13.5 9.5v3h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function PropertyMap({ address, companies, floorCount, rba }: BuildingProps & { address: string }) {
  const [mode, setMode] = useState<MapMode>("map");
  const [modalOpen, setModalOpen] = useState(false);
  const [buildingPresentation, setBuildingPresentation] = useState<BuildingPresentation>("3d");

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const mapShellClass = mode === "building" ? "property-map is-building" : "property-map";

  return (
    <>
      <div className={mapShellClass}>
        <PropertyMapViewport
          mode={mode}
          address={address}
          companies={companies}
          floorCount={floorCount}
          rba={rba}
          active={!modalOpen}
          onExpand={() => setModalOpen(true)}
          onModeChange={setMode}
          buildingPresentation={buildingPresentation}
          onBuildingPresentationChange={setBuildingPresentation}
        />
      </div>
      {modalOpen &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
            <div
              className="property-map-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Property map"
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="building-modal-close" aria-label="Close" onClick={() => setModalOpen(false)}>
                ×
              </button>
              <div className={mode === "building" ? "property-map-modal-body is-building" : "property-map-modal-body"}>
                <PropertyMapViewport
                  mode={mode}
                  address={address}
                  companies={companies}
                  floorCount={floorCount}
                  rba={rba}
                  active={modalOpen}
                  onModeChange={setMode}
                  buildingPresentation={buildingPresentation}
                  onBuildingPresentationChange={setBuildingPresentation}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
