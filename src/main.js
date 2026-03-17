import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
// Red → X, Green → Y   Blue → Z
const axesHelper = new THREE.AxesHelper(100);
scene.add(axesHelper);

// const gridHelper = new THREE.GridHelper(500, 50);
// scene.add(gridHelper);

/////////////////
// Camera
// const camera = new THREE.PerspectiveCamera(
//   10,
//   window.innerWidth / window.innerHeight,
//   0.1,
//   1000,
// );
///////////////////
const aspect = window.innerWidth / window.innerHeight;
const d = 100;

const camera = new THREE.OrthographicCamera(
  -d * aspect,
  d * aspect,
  d,
  -d,
  0.1,
  1000,
);

camera.position.set(100, 100, 100);
camera.lookAt(0, 0, 0);
// camera.position.x = 0;
// camera.position.y = 0;
// camera.position.z = 100;
const cameraHelper = new THREE.CameraHelper(camera);
scene.add(cameraHelper);
// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(40, 60, 100);
scene.add(light);

// SVG PATH (example: simple shape)
const svgPath = `M 4 8 L 10 1 L 13 0 L 12 3 L 5 9 C 6 10 6 11 7 10 C 7 11 8 12 7 12 A 1.42 1.42 0 0 1 6 13 A 5 5 0 0 0 4 10 Q 3.5 9.9 3.5 10.5 T 2 11.8 T 1.2 11 T 2.5 9.5 T 3 9 A 5 5 90 0 0 0 7 A 1.42 1.42 0 0 1 1 6 C 1 5 2 6 3 6 C 2 7 3 7 4 8 M 10 1 L 10 3 L 12 3 L 10.2 2.8 L 10 1`;

// Load SVG from string
// const loader = new SVGLoader();
// const svgData = loader.parse(
//   `<svg xmlns="http://www.w3.org/2000/svg"><path d="${svgPath}" /></svg>`,
// );
// Convert to shapes
// const shapes = [];
// svgData.paths.forEach((path) => {
//   const subShapes = SVGLoader.createShapes(path);
//   shapes.push(...subShapes);
// });
// Load external SVG
const loader = new SVGLoader();

loader.load("../floor-plan.svg", (data) => {
  const paths = data.paths;

  const floorSVGroup = new THREE.Group();

  paths.forEach((path) => {
    const shapes = SVGLoader.createShapes(path);

    shapes.forEach((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 1,
        // bevelEnabled: false,
        // bevelThickness: 1,
        // bevelSize: 0.5,
        // bevelSegments: 2,
      });

      const material = new THREE.MeshStandardMaterial({
        color: path.color || 0x00aaff, // keep SVG color if present
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      floorSVGroup.add(mesh);
      //   floorSVGroup.rotation.x = -Math.PI / 2;
    });
  });

  // Fix orientation (SVG is flipped in Y)
  floorSVGroup.scale.z *= -1.5;

  // Center it
  const box = new THREE.Box3().setFromObject(floorSVGroup);
  const center = new THREE.Vector3();
  box.getCenter(center);
  floorSVGroup.position.sub(center);

  scene.add(floorSVGroup);
});

// Extrude settings (this makes it 3D)
const extrudeSettings = {
  depth: 2,
  bevelEnabled: false,
  bevelThickness: 2,
  bevelSize: 1,
  bevelSegments: 1,
};

// Create mesh
// const svgGroup = new THREE.Group();

// shapes.forEach((shape) => {
//   const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
//   const material = new THREE.MeshStandardMaterial({
//     color: 0x00ffcc,
//     metalness: 0.3,
//     roughness: 0.4,
//   });

//   const mesh = new THREE.Mesh(geometry, material);

//   // Center it
//   geometry.center();
//   svgGroup.add(mesh);
// });
// scene.add(svgGroup);
const controls = new OrbitControls(camera, renderer.domElement);

// Optional settings (recommended)
// controls.enableDamping = true; // smooth movement
// controls.dampingFactor = 0.05;
// controls.screenSpacePanning = false;
// controls.minDistance = 20;
// controls.maxDistance = 200;
// controls.maxPolarAngle = Math.PI / 2; // limit vertical rotation
// // svgGroup.rotation.x = -Math.PI / 2;


// Plane

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.8,
    metalness: 0.2,
  }),
);
// const geometry = new THREE.ExtrudeGeometry(plane, extrudeSettings);

//   plane.rotation.x = -Math.PI / 2;
plane.rotation.x = -Math.PI / 2;

// Place exactly at bottom
//   plane.position.y = -size.y / 2;

plane.receiveShadow = true;

scene.add(plane);
// Animate
function animate() {
  requestAnimationFrame(animate);
    // floorSVGroup.rotation.x = 0;
    // floorSVGroup.rotation.y -= 0.05;
    // floorSVGroup.rotation.z = 0;
  renderer.render(scene, camera);
}

animate();

// Resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
