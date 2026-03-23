import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as XLSX from "xlsx";
import axios from "axios";
import buildingData from "./data/data.json";
import { fetchExcelData } from "./js/excelLoader";
const config = buildingData; // Assuming the JSON has a "buildings" array

let loading = false;
let error = null;
let buildings = []; // will hold data from Excel
let selectedBuilding = null;
let selectedFloor = null;
let selectedFlat = null;

async function loadBuildings() {
  loading = true;
  error = null;

  try {
    const results = await Promise.all(
      config.map(async (item) => {
        // console.log("Loading:", item.gSheetLink);
        const data = await fetchExcelData(item.gSheetLink);
        return {
          meta: item,
          floors: data, // Excel rows
        };
      }),
    );
    buildings = results;
    // 👉 Call render
    renderBuildings(buildings);
  } catch (err) {
    error = err.message;
    console.error(error);
  } finally {
    loading = false;
  }
}

function renderBuildings(data) {
  data.forEach((buildingItem, index) => {
    //   const { floors, meta } = buildingItem;
    //   const buildingGroup = new THREE.Group();
    //   let currentY = 0;
    //   floors.forEach((floorData) => {
    //     const floorHeight = floorData.height || 10;
    //     const flr = baseGroup.clone(true);
    //     flr.position.y = currentY;
    //     // Example: scale based on flats
    //     const scaleFactor = 1 + (floorData.flats || 1) * 0.05;
    //     flr.scale.set(scaleFactor, 1, scaleFactor);
    //     buildingGroup.add(flr);
    //     currentY += floorHeight;
    //   });
    //   // Position buildings side by side
    //   buildingGroup.position.x = index * 100;
    //   scene.add(buildingGroup);
  });
}

// ✅ 3. Populate Building Dropdown
const buildingSelect = document.getElementById("buildingSelect");
const floorSelect = document.getElementById("floorSelect");
const flatSelect = document.getElementById("flatSelect");

function populateBuildings(data) {
  buildingSelect.innerHTML = `<option value="">Select Building</option>`;
  data.forEach((item, index) => {
    // console.log(item);
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${item.building} - ${item.location}`;
    buildingSelect.appendChild(option);
  });
}

populateBuildings(buildingData);

////////////////////////////////////////////////////////// ✅ 4. On Building Change → Load Floors & Update 3D

// This will be replaced by the integrated buildingSelect event listener after scene setup

function populateFloors(totalFloors) {
  floorSelect.innerHTML = `<option value="">Select Floor</option>`;
  // Generate floor options from 1 to totalFloors
  for (let i = 1; i <= totalFloors; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Floor ${i}`;
    floorSelect.appendChild(option);
  }
}

// Function to set floor transparency
function setFloorTransparency(selectedFloorIndex) {
  floorReferences.forEach((floor, index) => {
    // Traverse all meshes in this floor
    floor.traverse((child) => {
      if (child.isMesh && child.material) {
        if (index === selectedFloorIndex) {
          // Selected floor: full opacity
          child.material.transparent = true;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
          child.material.needsUpdate = true;
        } else {
          // Other floors: semi-transparent
          child.material.transparent = true;
          child.material.opacity = 0.1;
          child.material.depthWrite = true;
          child.material.needsUpdate = true;
        }
      }
    });
  });
}

floorSelect.addEventListener("change", (e) => {
  const floorNumber = e.target.value;

  if (floorNumber === "") {
    // Reset all floors to full opacity when no floor is selected
    floorReferences.forEach((floor) => {
      floor.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
          child.material.needsUpdate = true;
        }
      });
    });
    return;
  }

  selectedFloor = floorNumber;
  // Get flats on this floor from Excel data
  const flatsOnFloor = selectedBuilding.floors.filter(
    (obj) => obj.Flr === floorNumber || obj.Flr == floorNumber,
  );
  populateFlats(flatsOnFloor);
  flatSelect.disabled = false;

  // Set transparency for floors (floorNumber is 1-indexed, array is 0-indexed)
  const selectedFloorIndex = parseInt(floorNumber) - 1;
  setFloorTransparency(selectedFloorIndex);
});

function populateFlats(flatsOnFloor) {
  console.log("Floor no", selectedFloor);
  console.log("Flats on floor:", flatsOnFloor);

  flatSelect.innerHTML = `<option value="">Select Flat</option>`;
  const totalFlats = flatsOnFloor.length || 0;
  flatsOnFloor.forEach((flat, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${flat.FlatNo}`;
    flatSelect.appendChild(option);
  });
}

flatSelect.addEventListener("change", (e) => {
  const flatNo = e.target.value;
  if (!flatNo) return;
  // selectedFlat = selectedFloor.flats[flaNo];
  console.log("BOOM 1", selectedBuilding);
  console.log("BOOM 2", selectedFloor);
  console.log("BOOM 3", selectedFlat);
  // 👉 Highlight in Three.js
  highlightFlat(selectedBuilding, selectedFloor, flatNo);
});

function highlightFlat(building, floor, flatNo) {}
//////////////////////
const loaderEl = document.getElementById("loader");
const errorEl = document.getElementById("error");

function updateUI() {
  loaderEl.style.display = loading ? "block" : "none";
  errorEl.innerText = error || "";
}
loadBuildings();

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

let autoRotate = true;
let currentFloorCount = 5;
let currentFocusedFloor = 0; // 0 = none, 1..n = floor index
let building = null; // Will be initialized with building selection
// let buildingData = []; // will hold data from Excel

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
// controls.minDistance = 200;
// controls.maxDistance = 100;
// controls.maxPolarAngle = Math.PI / 2; // limit vertical rotation
// svgGroup.rotation.x = -Math.PI / 2;

// Load external SVG
const loader = new SVGLoader();

const floorHeight = 20; // thickness of each floor
const gap = 2; // space between floors (optional)

// Function to create SVG Group from SVG path string
function createSVGGroupFromPath(svgPathString) {
  const shapes = [];

  // Parse SVG path string and create shapes
  const svgData = loader.parse(
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${svgPathString}" /></svg>`,
  );

  svgData.paths.forEach((path) => {
    const subShapes = SVGLoader.createShapes(path);
    shapes.push(...subShapes);
  });

  // Create mesh group from shapes
  const group = new THREE.Group();

  shapes.forEach((shape) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: floorHeight + gap - 1,
      bevelEnabled: false,
      bevelThickness: 1,
      bevelSize: 0.5,
      bevelSegments: 2,
    });
    // const geometry = new THREE.ShapeGeometry(shape, 1);

    const material = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      metalness: 0.3,
      roughness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
        fragmentShader: `
      precision highp float;
      void main() {
        gl_FragColor = vec4(0.25,0.25,0.25,1.0);
      }
    `,
      }),
    );
    geometry.center();
    group.add(mesh);
    // ----------------------
    // EDGES (VISIBLE)
    // ----------------------
    const edgesGeo = new THREE.EdgesGeometry(geometry, 30);

    const visibleEdges = new THREE.LineSegments(
      edgesGeo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        depthTest: true,
        transparent: true,
        opacity: 1,
      }),
    );
    scene.add(visibleEdges);

    // ----------------------
    // HIDDEN EDGES (DASHED)
    // ----------------------
    const hiddenEdges = new THREE.LineSegments(
      edgesGeo,
      new THREE.LineDashedMaterial({
        color: 0xffffff,
        dashSize: 0.01,
        gapSize: 0.02,
        transparent: true,
        opacity: 0.15,
        depthTest: false, // 👈 key trick
      }),
    );
    hiddenEdges.computeLineDistances();
    scene.add(hiddenEdges);
  });


  group.rotation.x = -Math.PI / 2;
  return group;
}

// Create default SVG group with first building's SVG structure
const defaultSvgPath =
  buildingData.length > 0
    ? buildingData[0].svgStructurePath
    : `M171.779 7.48723H183.182V25.0145H174.511V27.2647H183.301V64.0957H0.5V44.9104H12.4967V27.2647H1.21267V0.5H22.7117V3.57912H34.5896V0.5H56.92V3.57912H69.273V6.30296H78.7753V0.5H125.099V3.46069H150.161V7.48723H159.664V4.64497H171.779V7.48723Z`;
let svgGroup = createSVGGroupFromPath(defaultSvgPath);

// function normalizeSVGGroup(group) {
//   const box = new THREE.Box3().setFromObject(group);
//   const size = new THREE.Vector3();
//   box.getSize(size);
//   const maxDim = Math.max(size.x, size.y, size.z);
//   const scale = 100 / maxDim; // Scale to fit within a 20x20x20 box
//   group.scale.set(scale, scale, scale);
// }
// normalizeSVGGroup(svgGroup);

///////////////////////////////////////////////////// BUILDING
let floorSVGroup = null; // Will be loaded dynamically per building
let floorReferences = []; // Array to store references to each floor meshes

async function createBuilding(floorCount, floorplanPath, svgStructurePath) {
  // Remove old building from scene if it exists
  if (building) {
    scene.remove(building);
  }

  // Clear floor references
  floorReferences = [];

  // Create SVG group from the structure path or use default
  let currentSvgGroup = svgGroup;
  if (svgStructurePath) {
    currentSvgGroup = createSVGGroupFromPath(svgStructurePath);
  }

  // Load the floor plan SVG for this building if path provided
  try {
    if (floorplanPath) {
      floorSVGroup = await new Promise((resolve, reject) => {
        const newFloorSVGroup = new THREE.Group();

        loader.load(
          floorplanPath,
          (data) => {
            const paths = data.paths;

            paths.forEach((path) => {
              const shapes = SVGLoader.createShapes(path);
              shapes.forEach((shape) => {
                const geometry = new THREE.ShapeGeometry(shape, 1);
                const material = new THREE.MeshStandardMaterial({
                  color: path.color || 0x00aaff,
                  side: THREE.DoubleSide,
                });
                const floorSVGmesh = new THREE.Mesh(geometry, material);
                newFloorSVGroup.add(floorSVGmesh);
              });
            });

            const floorScaleFactor = 0.5;
            newFloorSVGroup.scale.x = floorScaleFactor;
            newFloorSVGroup.scale.y = floorScaleFactor;
            newFloorSVGroup.scale.z = floorScaleFactor;

            const floorBox = new THREE.Box3().setFromObject(newFloorSVGroup);
            const center = new THREE.Vector3();
            floorBox.getCenter(center);
            const size = new THREE.Vector3();
            floorBox.getSize(size);
            newFloorSVGroup.position.x = -center.x;
            newFloorSVGroup.position.z = center.y;
            newFloorSVGroup.rotation.x = -Math.PI / 2;

            resolve(newFloorSVGroup);
          },
          undefined,
          reject,
        );
      });
    }
  } catch (error) {
    console.error("Failed to load floor plan:", error);
    return;
  }

  building = new THREE.Group();

  for (let i = 0; i < floorCount; i++) {
    const testStack = currentSvgGroup.clone(true); // deep clone
    testStack.position.y = i * (floorHeight + gap);

    // Ensure all materials in this floor are set up for transparency
    testStack.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone the material to ensure this floor has independent material
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 1.0;
      }
    });

    building.add(testStack);

    // Store reference to this floor for transparency control
    floorReferences.push(testStack);

    if (floorSVGroup) {
      const floorStack = floorSVGroup.clone(true); // deep clone
      floorStack.position.z = i * (floorHeight + gap);
      // building.add(floorStack);
    }
  }

  const box2 = new THREE.Box3().setFromObject(building);
  const center = new THREE.Vector3();
  box2.getCenter(center);

  building.position.sub(center);
  const box3 = new THREE.Box3().setFromObject(building);
  const size3 = new THREE.Vector3();
  box3.getSize(size3);

  // plane.position.y = -size3.y / 2;

  // Add building to scene
  scene.add(building);

  // ✅ Adjust camera to fit building in viewport
  const maxDim = Math.max(size3.x, size3.y, size3.z);
  const fov = camera.fov * (Math.PI / 180); // Convert to radians
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.5; // Add some padding for better view

  camera.position.set(0, size3.y * 0.3, cameraZ);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  return building;
}

// ✅ Update 3D building when building selection changes
buildingSelect.addEventListener(
  "change",
  (e) => {
    const index = e.target.value;
    if (index === "") return;
    selectedBuilding = buildings[index];
    // Get total number of floors, floor plan path, and SVG structure path from building metadata
    const totalFloors = selectedBuilding.meta.floors;
    const floorplanPath = selectedBuilding.meta.floorplanPath;
    const svgStructurePath = selectedBuilding.meta.svgStructurePath;

    // Update 3D building with dynamic floor plan and SVG structure
    createBuilding(totalFloors, floorplanPath, svgStructurePath);
    currentFloorCount = totalFloors;

    // Reset floor selection and transparency
    floorSelect.value = "";
    selectedFloor = null;
    floorReferences.forEach((floor) => {
      floor.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
          child.material.needsUpdate = true;
        }
      });
    });

    // Update floor dropdown
    populateFloors(totalFloors);
    floorSelect.disabled = false;
  },
  { once: false },
);

// simple linear interpolation helper
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// scene.add(svgGroup);
// scene.add(floorSVGroup);
if (building) scene.add(building); // Only add if building exists (will be added on selection)

// Initialize default building with 5 floors
setTimeout(() => {
  if (!building && buildingData.length > 0) {
    const defaultFloorplanPath = buildingData[0].floorplanPath;
    const defaultSvgStructurePath = buildingData[0].svgStructurePath;
    createBuilding(5, defaultFloorplanPath, defaultSvgStructurePath);
    currentFloorCount = 5;
  }
}, 100);

// Animate
function animate() {
  requestAnimationFrame(animate);
  // Rotate all shapes together (respect auto-rotate)
  if (autoRotate && building) {
    // shapes.forEach((block) => {
    //    block.rotation.y += 0.005;
    // });
    building.rotation.y += 0.001;
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
