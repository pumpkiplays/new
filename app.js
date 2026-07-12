import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("#viewport");
const loading = document.querySelector("#loading");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(4.2, 2.5, 5.8);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 1.25, 0);
controls.minDistance = 2;
controls.maxDistance = 12;

scene.add(new THREE.HemisphereLight(0xe8edff, 0x28202e, 2.6));

const key = new THREE.DirectionalLight(0xffffff, 4.2);
key.position.set(3.5, 6, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);

const rim = new THREE.DirectionalLight(0x7e68ff, 4);
rim.position.set(-4, 3, -3);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(5.5, 96),
  new THREE.MeshStandardMaterial({
    color: 0x11131a,
    roughness: 0.85,
    metalness: 0.05
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(10, 20, 0x3c4050, 0x222630);
grid.position.y = 0;
grid.material.opacity = 0.22;
grid.material.transparent = true;
scene.add(grid);

let model;
const loader = new GLTFLoader();
loader.load(
  "./roblox_boy.glb",
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    // Center and resize the uploaded model consistently.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 3.4 / Math.max(size.y, 0.001);

    model.scale.setScalar(scale);
    model.position.x = -center.x * scale;
    model.position.y = -box.min.y * scale;
    model.position.z = -center.z * scale;

    loading.hidden = true;
  },
  undefined,
  (error) => {
    console.error(error);
    loading.textContent = "The model could not be loaded.";
  }
);

// The shirt is currently a transparent image plane.
// This is intentionally simple for the first step and is easy to replace
// later with UV-based material editing or a fitted 3D garment.
const shirtMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  toneMapped: false
});
const shirt = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shirtMaterial);
shirt.renderOrder = 10;
scene.add(shirt);

const defaults = {
  x: 0,
  y: 1.60,
  z: 0.43,
  width: 1.25,
  height: 1.25,
  rotation: 0,
  opacity: 1
};

const controlsMap = {
  x: document.querySelector("#xControl"),
  y: document.querySelector("#yControl"),
  z: document.querySelector("#zControl"),
  width: document.querySelector("#widthControl"),
  height: document.querySelector("#heightControl"),
  rotation: document.querySelector("#rotationControl"),
  opacity: document.querySelector("#opacityControl")
};

const outputMap = {
  x: document.querySelector("#xValue"),
  y: document.querySelector("#yValue"),
  z: document.querySelector("#zValue"),
  width: document.querySelector("#widthValue"),
  height: document.querySelector("#heightValue"),
  rotation: document.querySelector("#rotationValue"),
  opacity: document.querySelector("#opacityValue")
};

function updateShirt() {
  const values = Object.fromEntries(
    Object.entries(controlsMap).map(([key, input]) => [key, Number(input.value)])
  );

  shirt.position.set(values.x, values.y, values.z);
  shirt.scale.set(values.width, values.height, 1);
  shirt.rotation.z = THREE.MathUtils.degToRad(values.rotation);
  shirtMaterial.opacity = values.opacity;

  outputMap.x.value = values.x.toFixed(2);
  outputMap.y.value = values.y.toFixed(2);
  outputMap.z.value = values.z.toFixed(2);
  outputMap.width.value = values.width.toFixed(2);
  outputMap.height.value = values.height.toFixed(2);
  outputMap.rotation.value = `${Math.round(values.rotation)}°`;
  outputMap.opacity.value = `${Math.round(values.opacity * 100)}%`;
}

Object.values(controlsMap).forEach((input) => {
  input.addEventListener("input", updateShirt);
});

function setTextureFromUrl(url) {
  new THREE.TextureLoader().load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (shirtMaterial.map) shirtMaterial.map.dispose();
    shirtMaterial.map = texture;
    shirtMaterial.needsUpdate = true;
  });
}

document.querySelector("#shirtUpload").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  setTextureFromUrl(url);
});

document.querySelector("#sampleButton").addEventListener("click", () => {
  setTextureFromUrl("./sample-shirt.svg");
});

document.querySelector("#resetButton").addEventListener("click", () => {
  Object.entries(defaults).forEach(([key, value]) => {
    controlsMap[key].value = String(value);
  });
  updateShirt();
  controls.reset();
  camera.position.set(4.2, 2.5, 5.8);
  controls.target.set(0, 1.25, 0);
});

document.querySelector("#screenshotButton").addEventListener("click", () => {
  renderer.render(scene, camera);
  const link = document.createElement("a");
  link.download = "roblox-kit-preview.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
});

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) ||
      canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);
  resize();
  controls.update();
  renderer.render(scene, camera);
}

updateShirt();
setTextureFromUrl("./sample-shirt.svg");
animate();
