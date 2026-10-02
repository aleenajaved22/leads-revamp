import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { occupancyFloorValue, occupancyParts, occupancySuiteValue, type Company } from "./data";

export const COMPANY_COLORS = [
  "#146dff",
  "#2f9e44",
  "#e11d2e",
  "#7c3aed",
  "#d97706",
  "#0f766e",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#9333ea",
  "#ea580c",
  "#475569",
];

const DEFAULT_FLOORS = 10;
const EMPTY_FLOOR = "#e5e7eb";
const VACANT_TEXT = "#6b7280";

const TOWER_SLAB = 0.46;
const TOWER_PITCH = 0.56;
const SINGLE_SLAB = 1.1;
const BEVEL = 0.03;

const FOOTPRINT: [number, number][] = [
  [-3.1, -2.3],
  [2.35, -2.3],
  [3.25, -1.15],
  [3.25, 2.15],
  [-3.1, 2.15],
];
const MIN_X = -3.1;
const MAX_X = 3.25;
const FRONT_MAX_X = 2.35;
const FRONT_Z = 2.3;

export type BuildingHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  dispose: () => void;
};

export type BuildingOptions = {
  floorCount?: number;
  rba?: string;
};

export type FloorSegment = {
  name: string;
  color: string;
  detail: string[];
  vacant: boolean;
  start: number;
  end: number;
};

export type StackingPlanSegment = {
  name: string;
  color: string;
  detail: string[];
  vacant: boolean;
  areaSf: number;
  share: number;
};

export type StackingPlanFloor = {
  floor: number;
  label: string;
  totalSf: number;
  segments: StackingPlanSegment[];
};

type Segment = FloorSegment;

function parseFloors(value: string, floorCount: number) {
  const normalized = value.replace(/[–—]/g, "-").trim();
  if (!normalized) return [];
  const range = normalized.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    const floors: number[] = [];
    for (let floor = Math.min(start, end); floor <= Math.max(start, end); floor += 1) {
      if (floor >= 1 && floor <= floorCount) floors.push(floor);
    }
    return floors;
  }
  const single = normalized.match(/\d+/);
  const floor = single ? Number(single[0]) : 0;
  return floor >= 1 && floor <= floorCount ? [floor] : [];
}

function parseArea(value: string) {
  const digits = value.replace(/[^\d.]/g, "");
  const area = Number(digits);
  return Number.isFinite(area) && area > 0 ? area : 0;
}

function suiteOrder(company: Company) {
  const match = occupancySuiteValue(company).match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function formatArea(area: number) {
  return `${Math.round(area).toLocaleString("en-US")} SF`;
}

function layoutFloors(companies: Company[], floorCount: number, rba: string) {
  const occupants = new Map<number, { company: Company; color: string; area: number }[]>();
  let colorIndex = 0;
  const addOccupant = (company: Company) => {
    const floors = parseFloors(occupancyFloorValue(company), floorCount);
    if (floors.length === 0) return;
    const perFloor = parseArea(company.occupiedArea) / floors.length;
    const color = COMPANY_COLORS[colorIndex % COMPANY_COLORS.length];
    colorIndex += 1;
    floors.forEach((floor) => {
      const list = occupants.get(floor) ?? [];
      list.push({ company, color, area: perFloor });
      occupants.set(floor, list);
    });
  };
  companies.forEach((company) => {
    addOccupant(company);
    company.floorMates?.forEach((mate, mateIndex) => {
      addOccupant({
        ...company,
        id: `${company.id}-suite-${mate.suite || mateIndex + 1}`,
        name: mate.name,
        suite: mate.suite,
        suiteRange: "",
        occupiedArea: mate.occupiedArea,
      });
    });
  });

  const weighted = new Map<number, { company: Company; color: string; area: number }[]>();
  occupants.forEach((list, floor) => {
    const known = list.filter((item) => item.area > 0);
    const fallback = known.length ? known.reduce((sum, item) => sum + item.area, 0) / known.length : 1;
    weighted.set(
      floor,
      list
        .map((item) => ({ ...item, area: item.area || fallback }))
        .sort((left, right) => suiteOrder(left.company) - suiteOrder(right.company)),
    );
  });

  const rbaPlate = parseArea(rba) / floorCount;
  const busiest = Math.max(0, ...[...weighted.values()].map((list) => list.reduce((sum, item) => sum + item.area, 0)));
  const plate = Math.max(rbaPlate, busiest);

  const floors = new Map<number, { segments: Segment[]; totalSf: number }>();
  weighted.forEach((list, floor) => {
    const used = list.reduce((sum, item) => sum + item.area, 0);
    const total = Math.max(plate, used);
    let cursor = 0;
    const segments: Segment[] = list.map((item) => {
      const start = cursor;
      cursor += item.area / total;
      const occupancy = occupancyParts(item.company);
      return {
        name: item.company.name.trim() || "Untitled company",
        color: item.color,
        detail: [
          floorCount > 1 ? occupancy.floorText : "",
          occupancy.suiteText,
          floorCount === 1 ? formatArea(item.area) : "",
        ].filter(Boolean),
        vacant: false,
        start,
        end: cursor,
      };
    });
    if (cursor < 0.995) {
      segments.push({
        name: "Vacant",
        color: EMPTY_FLOOR,
        detail: plate > 0 && total > used ? [formatArea(total - used)] : [],
        vacant: true,
        start: cursor,
        end: 1,
      });
    }
    floors.set(floor, { segments, totalSf: Math.round(total) });
  });
  return { floors, platePerFloor: plate };
}

function floorOrdinal(floor: number) {
  const mod100 = floor % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${floor}th`;
  const mod10 = floor % 10;
  if (mod10 === 1) return `${floor}st`;
  if (mod10 === 2) return `${floor}nd`;
  if (mod10 === 3) return `${floor}rd`;
  return `${floor}th`;
}

export function buildStackingPlan(companies: Company[] = [], options: BuildingOptions = {}): StackingPlanFloor[] {
  const floorCount = Math.max(1, Math.round(options.floorCount ?? DEFAULT_FLOORS));
  const { floors } = layoutFloors(companies, floorCount, options.rba ?? "");
  const rows: StackingPlanFloor[] = [];

  for (let floor = floorCount; floor >= 1; floor -= 1) {
    const layout = floors.get(floor);
    if (!layout) continue;

    const { segments, totalSf } = layout;
    const occupied = segments.filter((segment) => !segment.vacant);
    if (occupied.length === 0) continue;

    rows.push({
      floor,
      label: floorOrdinal(floor),
      totalSf,
      segments: occupied.map((segment) => {
        const share = segment.end - segment.start;
        const areaSf = Math.round(share * totalSf);
        return {
          name: segment.name,
          color: segment.color,
          detail: segment.detail,
          vacant: false,
          areaSf,
          share,
        };
      }),
    });
  }

  return rows;
}

function clipFootprint(minX: number, maxX: number) {
  let points = FOOTPRINT;
  const clip = (keep: (x: number) => boolean, edge: number) => {
    const next: [number, number][] = [];
    points.forEach((current, index) => {
      const previous = points[(index + points.length - 1) % points.length];
      const currentIn = keep(current[0]);
      const previousIn = keep(previous[0]);
      if (currentIn !== previousIn) {
        const t = (edge - previous[0]) / (current[0] - previous[0]);
        next.push([edge, previous[1] + t * (current[1] - previous[1])]);
      }
      if (currentIn) next.push(current);
    });
    points = next;
  };
  clip((x) => x >= minX, minX);
  clip((x) => x <= maxX, maxX);
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

function slabGeometry(minX: number, maxX: number, depth: number) {
  return new THREE.ExtrudeGeometry(clipFootprint(minX, maxX), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: BEVEL,
    bevelSegments: 1,
  });
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  minSize: number,
  weight: number,
  shrink = true,
) {
  let current = size;
  let label = text;
  const measure = () => {
    context.font = `${weight} ${current}px Inter, sans-serif`;
    return context.measureText(label).width;
  };
  if (shrink) {
    while (measure() > maxWidth && current > minSize) current -= 1;
  }
  if (measure() > maxWidth) {
    while (label.length > 1 && context.measureText(`${label}…`).width > maxWidth) label = label.slice(0, -1);
    label = `${label}…`;
  }
  return { label, size: current };
}

function drawDetailLine(context: CanvasRenderingContext2D, parts: string[], width: number, y: number, size: number, minSize: number, color: string) {
  const gap = size * 0.9;
  let current = size;
  const measure = () => {
    context.font = `500 ${current}px Inter, sans-serif`;
    return parts.reduce((sum, part) => sum + context.measureText(part).width, 0) + (parts.length - 1) * gap;
  };
  while (measure() > width * 0.92 && current > minSize) current -= 1;
  if (measure() > width * 0.92) {
    const fitted = fitText(context, parts.join(" | "), width * 0.92, current, minSize, 500);
    context.font = `500 ${fitted.size}px Inter, sans-serif`;
    context.fillStyle = color;
    context.textAlign = "center";
    context.fillText(fitted.label, width / 2, y);
    return;
  }
  context.font = `500 ${current}px Inter, sans-serif`;
  const widths = parts.map((part) => context.measureText(part).width);
  const scaledGap = current * 0.9;
  const total = widths.reduce((sum, item) => sum + item, 0) + (parts.length - 1) * scaledGap;
  let x = (width - total) / 2;
  context.textAlign = "left";
  context.fillStyle = color;
  context.strokeStyle = color;
  context.globalAlpha = 1;
  parts.forEach((part, index) => {
    if (index > 0) {
      const lineX = x + scaledGap / 2;
      context.save();
      context.globalAlpha = 0.7;
      context.lineWidth = Math.max(1, current * 0.07);
      context.beginPath();
      context.moveTo(lineX, y - current * 0.4);
      context.lineTo(lineX, y + current * 0.4);
      context.stroke();
      context.restore();
      x += scaledGap;
    }
    context.fillText(part, x, y);
    x += widths[index];
  });
  context.textAlign = "center";
}

function labelTexture(segment: Segment, widthUnits: number, heightUnits: number, lines: "face" | "roof") {
  const pxPerUnit = lines === "face" ? 320 : 220;
  const width = Math.max(64, Math.round(widthUnits * pxPerUnit));
  const height = Math.max(32, Math.round(heightUnits * pxPerUnit));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  const textColor = segment.vacant ? VACANT_TEXT : "#ffffff";
  const hasDetail = segment.detail.length > 0;
  const nameWorld = lines === "face" ? 0.145 : 0.16;
  const nameSize = Math.max(12, Math.round(nameWorld * pxPerUnit));
  const nameFit = fitText(context, segment.name, width * 0.92, nameSize, nameSize, 600, false);
  context.font = `600 ${nameFit.size}px Inter, sans-serif`;
  context.fillStyle = textColor;
  const nameY = hasDetail ? height * 0.36 : height / 2;
  context.fillText(nameFit.label, width / 2, nameY);
  if (hasDetail) {
    const detailSize = Math.round(nameFit.size * 0.78);
    drawDetailLine(context, segment.detail, width, height * 0.72, detailSize, Math.max(9, Math.round(detailSize * 0.5)), textColor);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function mountBuilding(host: HTMLElement, companies: Company[] = [], options: BuildingOptions = {}): BuildingHandle {
  const floorCount = Math.max(1, Math.round(options.floorCount ?? DEFAULT_FLOORS));
  const single = floorCount === 1;
  const slab = single ? SINGLE_SLAB : TOWER_SLAB;
  const pitch = single ? SINGLE_SLAB : TOWER_PITCH;
  const { floors } = layoutFloors(companies, floorCount, options.rba ?? "");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0xf4f5f7);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  const buildingHeight = 0.04 + floorCount * pitch;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.1, single ? buildingHeight * 0.5 : buildingHeight * 0.5, single ? 0 : 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 24;
  controls.maxPolarAngle = Math.PI / 2.08;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd5d8dc, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  scene.add(sun);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const groundGeometry = new THREE.CircleGeometry(8, 48);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xe6e7ea, roughness: 1 });
  geometries.push(groundGeometry);
  materials.push(groundMaterial);
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const span = MAX_X - MIN_X;
  const gap = 0.035;

  function addSlab(minX: number, maxX: number, base: number, color: string, vacant: boolean) {
    const geometry = slabGeometry(minX, maxX, slab);
    const material = new THREE.MeshStandardMaterial({ color, roughness: vacant ? 0.85 : 0.55, metalness: 0.04 });
    geometries.push(geometry);
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = base;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  function addPlane(texture: THREE.Texture, width: number, height: number, position: THREE.Vector3, rotation = new THREE.Euler()) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    geometries.push(geometry);
    materials.push(material);
    textures.push(texture);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    mesh.renderOrder = 2;
    scene.add(mesh);
  }

  for (let floor = 1; floor <= floorCount; floor += 1) {
    const base = 0.04 + (floor - 1) * pitch;
    const layout = floors.get(floor);
    if (!layout) {
      addSlab(MIN_X, MAX_X, base, EMPTY_FLOOR, true);
      continue;
    }
    layout.segments.forEach((segment, index) => {
      const minX = MIN_X + segment.start * span + (index > 0 ? gap : 0);
      const maxX = MIN_X + segment.end * span - (index < layout.segments.length - 1 ? gap : 0);
      if (maxX - minX < 0.02) return;
      addSlab(minX, maxX, base, segment.color, segment.vacant);

      if (single) {
        const roofMax = Math.min(maxX, MAX_X);
        const stripWidth = (roofMax - minX) * 0.86;
        const stripLength = 3.6;
        const along = stripWidth < stripLength * 0.8;
        const texture = along
          ? labelTexture(segment, stripLength, stripWidth, "roof")
          : labelTexture(segment, stripWidth, stripLength * 0.5, "roof");
        if (texture) {
          addPlane(
            texture,
            along ? stripLength : stripWidth,
            along ? stripWidth : stripLength * 0.5,
            new THREE.Vector3((minX + roofMax) / 2, base + slab + 0.03, 0.08),
            new THREE.Euler(-Math.PI / 2, 0, along ? Math.PI / 2 : 0),
          );
        }
      } else {
        const faceMax = Math.min(maxX, FRONT_MAX_X);
        const faceWidth = faceMax - minX;
        if (faceWidth < 0.28) return;
        const faceHeight = slab * 0.94;
        const texture = labelTexture(segment, faceWidth, faceHeight, "face");
        if (texture) {
          addPlane(
            texture,
            faceWidth,
            faceHeight,
            new THREE.Vector3((minX + faceMax) / 2, base + slab / 2, FRONT_Z + BEVEL + 0.006),
          );
        }
      }
    });
  }

  if (!single) {
    const roofGeometry = new THREE.BoxGeometry(4.4, 0.5, 2.7);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xf6f6f4, roughness: 0.8 });
    geometries.push(roofGeometry);
    materials.push(roofMaterial);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(-0.15, buildingHeight + 0.25, -0.1);
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);
  }

  const topY = single ? buildingHeight + 0.1 : buildingHeight + 0.55;
  const corners = FOOTPRINT.flatMap(([x, y]) => [
    new THREE.Vector3(x, 0, -y),
    new THREE.Vector3(x, topY, -y),
  ]);

  function frameCamera() {
    const direction = (single ? new THREE.Vector3(0.35, 1.7, 1) : new THREE.Vector3(0.75, 0.42, 1.15)).normalize();
    const fits = (distance: number) => {
      camera.position.copy(controls.target).addScaledVector(direction, distance);
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
      return corners.every((corner) => {
        const projected = corner.clone().project(camera);
        return Math.abs(projected.x) <= 0.9 && Math.abs(projected.y) <= 0.86;
      });
    };
    let distance = 4;
    while (distance < 40 && !fits(distance)) distance += 0.25;
    controls.maxDistance = Math.max(24, distance * 1.6);
    controls.update();
  }

  let framed = false;
  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width < 1 || height < 1) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!framed) {
      frameCamera();
      framed = true;
    }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  function dolly(scale: number) {
    const offset = camera.position.clone().sub(controls.target);
    const distance = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * scale));
    offset.setLength(distance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  return {
    zoomIn: () => dolly(0.82),
    zoomOut: () => dolly(1.22),
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
