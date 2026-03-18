import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
// Cameras: perspective and orthographic
const perspectiveCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const frustumSize = 10;
let aspect = window.innerWidth / window.innerHeight;
const orthoCamera = new THREE.OrthographicCamera(
  (-frustumSize * aspect) / 2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  -frustumSize / 2,
  0.1,
  1000,
);
// Create building blocks dynamically
const blocks = [];
const blockHeight = 1;
const blockWidth = 3;
const blockDepth = 2;
const spacing = 0.1;

let autoRotate = true;
let currentFloorCount = 5;
let currentFocusedFloor = 0; // 0 = none, 1..n = floor index
let buildingData = null;
let buildingList = [];

// Active camera reference (start with orthographic default)
let activeCamera = orthoCamera;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.getElementById("canvas"),
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1a1a2e);
// initial camera positions; we'll recentre after blocks generated
perspectiveCamera.position.set(0, 5, 8);
perspectiveCamera.lookAt(0, 0, 0);
orthoCamera.position.set(0, 5, 8);
orthoCamera.lookAt(0, 0, 0);

// navigation state
// camera target state (we drive activeCamera toward these targets)
let targetCameraY = activeCamera.position.y;
let targetCameraZ = activeCamera.position.z;
let targetLookAt = new THREE.Vector3(0, 0, 0);
let currentLookAt = new THREE.Vector3(0, 0, 0);

// Red → X, Green → Y   Blue → Z
const axesHelper = new THREE.AxesHelper(100);
scene.add(axesHelper);

// const gridHelper = new THREE.GridHelper(500, 50);
// scene.add(gridHelper);

/////////////////
// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 0, 100);
camera.lookAt(0, 0, 0);
// camera.position.x = 0;
// camera.position.y = 0;
// camera.position.z = 100;
///////////////////
// const aspect = window.innerWidth / window.innerHeight;
// const d = 100;

// const camera = new THREE.OrthographicCamera(
//   -d * aspect,
//   d * aspect,
//   d,
//   -d,
//   0.1,
//   1000,
// );

// const cameraHelper = new THREE.CameraHelper(camera);
// scene.add(cameraHelper);
// Renderer
// const renderer = new THREE.WebGLRenderer({ antialias: true });

// document.body.appendChild(renderer.domElement);

// Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(40, 60, 100);
scene.add(light);

const controls = new OrbitControls(camera, renderer.domElement);

// Optional settings (recommended)
controls.enableDamping = true; // smooth movement
// controls.dampingFactor = 0.05;
// controls.screenSpacePanning = false;
// controls.minDistance = 20;
// controls.maxDistance = 200;
// controls.maxPolarAngle = Math.PI / 2; // limit vertical rotation
// svgGroup.rotation.x = -Math.PI / 2;

// // SVG PATH (example: simple shape)
// const svgPath = `M 4 8 L 10 1 L 13 0 L 12 3 L 5 9 C 6 10 6 11 7 10 C 7 11 8 12 7 12 A 1.42 1.42 0 0 1 6 13 A 5 5 0 0 0 4 10 Q 3.5 9.9 3.5 10.5 T 2 11.8 T 1.2 11 T 2.5 9.5 T 3 9 A 5 5 90 0 0 0 7 A 1.42 1.42 0 0 1 1 6 C 1 5 2 6 3 6 C 2 7 3 7 4 8 M 10 1 L 10 3 L 12 3 L 10.2 2.8 L 10 1`;
const svgPath = `M171.779 7.48723H183.182V25.0145H174.511V27.2647H183.301V64.0957H0.5V44.9104H12.4967V27.2647H1.21267V0.5H22.7117V3.57912H34.5896V0.5H56.92V3.57912H69.273V6.30296H78.7753V0.5H125.099V3.46069H150.161V7.48723H159.664V4.64497H171.779V7.48723Z`;
// // Load SVG from string
// const loader = new SVGLoader();
// Load external SVG
const loader = new SVGLoader();
const svgData = loader.parse(
  `<svg xmlns="http://www.w3.org/2000/svg"><path d="${svgPath}" /></svg>`,
);
// Convert to shapes
const shapes = [];
svgData.paths.forEach((path) => {
  const subShapes = SVGLoader.createShapes(path);
  shapes.push(...subShapes);
});
const size = new THREE.Vector3();

const floorSVGroup = new THREE.Group();
const floorHeight = 10; // thickness of each floor
const floors = 5; // number of floors
const gap = 1; // space between floors (optional)

loader.load("../floor-plan.svg", (data) => {
  const paths = data.paths;

  paths.forEach((path) => {
    const shapes = SVGLoader.createShapes(path);
    shapes.forEach((shape) => {
      // For no height extrusion, we can use ShapeGeometry instead of ExtrudeGeometry
      const geometry = new THREE.ShapeGeometry(shape, 1); // 1 segment per unit length for better detail

      // const geometry = new THREE.ExtrudeGeometry(shape, {
      //   depth: 1, // thickness of the floor
      //   // depth: (floorHeight+gap)*3, // thickness of the floor
      //   bevelEnabled: false,
      //   bevelThickness: 1,
      //   bevelSize: 0.5,
      //   bevelSegments: 2,
      // });

      const material = new THREE.MeshStandardMaterial({
        color: path.color || 0x00aaff, // keep SVG color if present
        side: THREE.DoubleSide,
      });

      const floorSVGmesh = new THREE.Mesh(geometry, material);
      floorSVGroup.add(floorSVGmesh);
    });
  });

  // Fix orientation (SVG is flipped in Y)
  // floorSVGroup.scale.z *= -1.5;
  const floorScaleFactor = 0.5; // Adjust this value to scale the floor plan
  floorSVGroup.scale.x = floorScaleFactor;
  floorSVGroup.scale.y = floorScaleFactor;
  floorSVGroup.scale.z = floorScaleFactor;

  // Center it
  const floorBox = new THREE.Box3().setFromObject(floorSVGroup);
  const center = new THREE.Vector3();
  floorBox.getCenter(center);
  floorBox.getSize(size);
  // floorSVGroup.position.sub(center);
  floorSVGroup.position.x = -center.x; // Adjust X position to sit on the plane
  floorSVGroup.position.z = center.y; // Adjust Z position to sit on the plane
  floorSVGroup.rotation.x = -Math.PI / 2; // Rotate to lie flat on the XZ plane
});
// Loader End

// Create mesh
const svgGroup = new THREE.Group();

shapes.forEach((shape) => {
  // const geometry = new THREE.ShapeGeometry(shape, 1); // 1 segment per unit length for better detail
  const geometry = new THREE.ExtrudeGeometry(shape, {
    // depth: 1, // thickness of the floor
    depth: (floorHeight+gap)-1, // thickness of the floor
    bevelEnabled: false,
    bevelThickness: 1,
    bevelSize: 0.5,
    bevelSegments: 2,
  });

  const material = new THREE.MeshStandardMaterial({
    color: 0x00ffcc,
    metalness: 0.3,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Center it
  geometry.center();
  svgGroup.add(mesh);
  svgGroup.rotation.x = -Math.PI / 2;
});

// function normalizeSVGGroup(group) {
//   const box = new THREE.Box3().setFromObject(group);
//   const size = new THREE.Vector3();
//   box.getSize(size);
//   const maxDim = Math.max(size.x, size.y, size.z);
//   const scale = 100 / maxDim; // Scale to fit within a 20x20x20 box
//   group.scale.set(scale, scale, scale);
// }
// normalizeSVGGroup(svgGroup);

// Plane

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide,
  }),
);
//   plane.rotation.x = -Math.PI / 2;
plane.rotation.x = -Math.PI / 2;
// Place exactly at bottom
//   plane.position.y = -size.y / 2;
plane.receiveShadow = true;

///////////////////////////////////////////////////// BUILDING
const building = new THREE.Group();

for (let i = 0; i < floors; i++) {
  const testStack = svgGroup.clone(true); // deep clone
  testStack.position.y = i * (floorHeight + gap);
  building.add(testStack);

  const floorStack = floorSVGroup.clone(true); // deep clone
  floorStack.position.z = i * (floorHeight + gap);
  building.add(floorStack);

  // const planeStack = plane.clone(true); // deep clone
  // planeStack.position.y = i * (floorHeight + gap);
  // building.add(planeStack);
}

const box2 = new THREE.Box3().setFromObject(building);
const center = new THREE.Vector3();
box2.getCenter(center);

building.position.sub(center);
const box3 = new THREE.Box3().setFromObject(building);
const size3 = new THREE.Vector3();
box3.getSize(size3);

plane.position.y = -size3.y / 2;

// simple linear interpolation helper
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// scene.add(svgGroup);
// scene.add(floorSVGroup);
scene.add(building);
// scene.add(plane);

// Animate
function animate() {
  requestAnimationFrame(animate);
  // Rotate all blocks together (respect auto-rotate)
  if (autoRotate) {
    blocks.forEach((block) => {
      block.rotation.y += 0.005;
    });
  }

  // smooth camera movement toward target (apply to activeCamera)
  activeCamera.position.y = lerp(activeCamera.position.y, targetCameraY, 0.05);
  activeCamera.position.z = lerp(activeCamera.position.z, targetCameraZ, 0.05);

  // interpolate lookAt vector instead of jumping
  currentLookAt.lerp(targetLookAt, 0.05);
  activeCamera.lookAt(currentLookAt);
  renderer.render(scene, camera);
}

animate();

// Resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
