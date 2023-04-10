import * as THREE from "three";
import SimplexNoise from 'simplex-noise';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import "./style.css";
import { BloomEffect, SelectiveBloomEffect, EffectComposer, EffectPass, 
  RenderPass, NoiseEffect, KernelSize, GodRaysEffect, KawaseBlurPass, DepthOfFieldEffect
} from "postprocessing";
import * as dat from "lil-gui";

const simplex = new SimplexNoise('seed')
let canvas,scene,camera,controls,renderer,composer,sBloom,particles,
  boxMaterial, bottomLight1, boxLight
let planet, planetGeometry, planetMaterial, sun, box
const clock = new THREE.Clock();
const palletes = [
    ["#210535", "#430d4b", "#7b337d", "#c874b2", "#014760"],
    ["#013026", "#014760", "#107e57", "#a1ce3f", "#cbe58e"],
    ["#051427", "#051427", "#530f1e", "#a44322", "#f8bc04"],
    ["#062c43", "#054569", "#a44322", "#a44322", "#a44322"],
    ["#081448", "#282157", "#1a2c80", "#4a478a", "#da8a8b"],
    ["#062c43", "#054569", "#5591a9", "#9ccddc", "#ced7e0"],
    ["#011307", "#001736", "#00481a", "#155e89", "#9aeadd"],
    ["#0b1f3a", "#76101e", "#133769", "#c9374c", "#a44322"],
    ["#1d646f", "#6c917d", "#051c1f", "#042a36", "#133769"],
    //
    ["#4c733c", "#308f3d", "#b0d1bc", "#042a36", "#3b514c"],
    ["#054569", "#646472", "#6891b6", "#8D86C9", "#FDCA40"],
    ["#F79824", "#8a606a", "#321d10", "#563b47", "#321d10"],
    ["#454ADE", "#454ADE", "#ED474A", "#308f3d", "#ED474A"],
    ["#1c1026", "#da8a8b", "#4c1e3c", "#051c1f", "#76101e"],
];

function getPosition(value) {
  if (value < 0.3) return "Vertical"
  if (value < 0.8) return "Frontal"
  else return "Rotating"
}

function getNoise(value) {
  if (value < 0.3) return "Low"
  if (value < 0.7) return "Medium"
  else return "High"
}
function getMaterial(value) {
  if (value) return "Transparent"
  else return "Reflective"
}

const globalConfigs = {
  boxPosition: getPosition(fxrand()),
  sunNoise: mapRange(fxrand(), 0, 1, 0.2, 1),
  material: false,
  exposure: mapRange(fxrand(), 0, 1, 0.38, 0.55),
  samples: mapRange(fxrand(),0,1, 50, 70)
}

if(globalConfigs.boxPosition === "Vertical" || globalConfigs.boxPosition === "Rotating"){
  if(fxrand() > 0.4){
    globalConfigs.material = true
  }
}

if(fxrand() > 0.6){
  globalConfigs.exposure = mapRange(fxrand(), 0, 1, 0.28, 0.33)
  globalConfigs.samples = mapRange(fxrand(), 0, 1, 25, 30)
}

window.$fxhashFeatures = {
  "Layout": globalConfigs.boxPosition,
  "Material": getMaterial(globalConfigs.material)
}
console.table(window.$fxhashFeatures)
console.table(globalConfigs)
function randomFromList(items) {
  return items[Math.floor(fxrand() * items.length)];
}


function mapRange(value, a, b, c, d) {
  value = (value - a) / (b - a);
  return c + value * (d - c);
}

const v = new THREE.Vector3();
function randomPointInSphere(radius) {
  const x = mapRange(fxrand(), 0, 1, -1, 1)
  const y = mapRange(fxrand(), 0, 1, -1, 1)
  const z = mapRange(fxrand(), 0, 1, -0.2, -1)
  const normalizationFactor = 1 / Math.sqrt(x * x + y * y)

  
  v.x = x * normalizationFactor * mapRange(fxrand(), 0, 1, 0.5 * radius, 1.2 * radius)
  v.y = y * normalizationFactor * mapRange(fxrand(), 0, 1, 0.5 * radius, 1.2 * radius)
  v.z = z * normalizationFactor * radius;

  return v
}

function init() {
  canvas = document.querySelector("canvas.webgl")
  scene = new THREE.Scene()

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight + 1,
  }

  camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    100
  )

  camera.position.set(0, 0.5, 4);
  scene.add(camera)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
  })

  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false;
  controls.enableDamping = true
  controls.minDistance = 3.5
  controls.maxDistance = 4.5
  // controls.minPolarAngle = 1.2; // radians
  // controls.maxPolarAngle = 1.8;

  controls.minAzimuthAngle = -0.3
  controls.maxAzimuthAngle = 0.3

  window.addEventListener("resize", () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  });

  const bloom = new BloomEffect({
    luminanceThreshold: 0.01,
    intensity: mapRange(fxrand(), 0, 1, 1, 3)
  })
  const bloomPass = new EffectPass(camera, bloom)
  const bloomOptions = {
    luminanceThreshold: 0.01,
    luminanceSmoothing: 0.01,
    intensity: 0.8,
    toneMapped: true,
    height: 200,
    kernelSize: KernelSize.HUGE
  }

  sBloom = new SelectiveBloomEffect(scene, camera, bloomOptions)
  const noiseEffect = new NoiseEffect({ premultiply: true })
  noiseEffect.blendMode.opacity.value = 0.25

  const blurPass = new KawaseBlurPass({
    height: 2000,
  });
  blurPass.kernelSize = 2
  blurPass.renderToScreen = true

  const noisePass = new EffectPass(camera, noiseEffect);
  const sBloompass = new EffectPass(camera, noiseEffect, sBloom);
  sBloompass.renderToScreen = true;

  const randomP = randomFromList(palletes)
  const randomC = randomFromList(randomP)
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(randomC),
    transparent: true,
    fog: true,
  })

  const sunGeometry = new THREE.SphereBufferGeometry(0.85, 32, 32)
  sunGeometry.setAttribute("basePosition", new THREE.BufferAttribute().copy(sunGeometry.attributes.position));
  sun = new THREE.Mesh(sunGeometry, sunMaterial)
  sun.frustumCulled = false
  sun.matrixAutoUpdate = false
  const group = new THREE.Group()
  group.position.set(0, -0.4, 0)
  group.add(sun)

  const godRaysEffect = new GodRaysEffect(camera, sun, {
    height: 200, // 480
    kernelSize: KernelSize.SMALL,
    density: 1.5,
    decay: 0.92,
    weight: 1,
    exposure: globalConfigs.exposure, // 0.54
    samples: globalConfigs.samples,
    clampMax: 1.0,
  });

  const raysPass = new EffectPass(camera, godRaysEffect)

  /*
   * MONOLITO
   */
  boxMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.5, // 1
    reflectivity: mapRange(fxrand(), 0, 1, 0.001, 0.5),
    clearcoat: mapRange(fxrand(), 0, 1, 0, 1),
    clearcoatRoughness: 1,
    color: "#030512",
  });
  // globalConfigs.boxPosition = "a"
  const boxConfigs = {
    width: 1.6,
    height: 0.2,
    depth: 1.5,
    x: 0,
    y: 0,
    z: 3
  }
  if(globalConfigs.boxPosition === "Vertical" || globalConfigs.boxPosition === "Rotating"){
    boxConfigs.width = mapRange(fxrand(), 0, 1, 0.2, 0.3)
    boxConfigs.height = 0.05
    boxConfigs.depth = mapRange(fxrand(), 0, 1, 0.3, 0.5)
    boxConfigs.x = 0
    boxConfigs.y = .1
    boxConfigs.z = 2.5
  }

  box = new THREE.Mesh(new THREE.BoxGeometry(boxConfigs.width, boxConfigs.height, boxConfigs.depth), boxMaterial)
  box.position.y = -0.1
  box.position.z = 3
  if(globalConfigs.boxPosition === "Vertical" || globalConfigs.boxPosition === "Rotating"){
    box.position.x = boxConfigs.x
    box.position.y = boxConfigs.y
    box.position.z = boxConfigs.z
    box.rotation.x = 1.5
  }
  scene.add(box)

  planetMaterial = new THREE.MeshPhysicalMaterial();
  planetGeometry = new THREE.SphereGeometry(0.8, 64, 64)
  planetGeometry.setAttribute("basePosition", new THREE.BufferAttribute().copy(planetGeometry.attributes.position));
  planet = new THREE.Mesh(planetGeometry, planetMaterial)
  planet.position.set(0, 3.2, -3)
  scene.add(planet)

  /*
  * LIGHTS
  */
  const palleteLight = randomFromList(palletes)
  const palleteC = randomFromList(palleteLight)
  bottomLight1 = new THREE.PointLight(palleteC, 15, 5.5, 1);
  bottomLight1.position.set(0, -2.5, -3);
  bottomLight1.lookAt(planet.position)
  scene.add(bottomLight1);

  const bottomLight2 = new THREE.PointLight(randomC, 1, 8.5, 0);
  bottomLight2.position.set(0, -2.5, -3);
  bottomLight2.lookAt(planet.position)
  scene.add(bottomLight2);

  boxLight = new THREE.DirectionalLight(palleteC, 1)
  boxLight.target = new THREE.Object3D();
  boxLight.target.position.set(0, -5, 10)
  scene.add(boxLight);
  scene.add(boxLight.target);
  
  const lightHelper = new THREE.PointLightHelper(bottomLight1, 1)
  const lightHelper2 = new THREE.DirectionalLightHelper(boxLight, 0.1)
  // scene.add(lightHelper)
  // scene.add(lightHelper2)
  // lightHelper2.parent.updateMatrixWorld()
  // lightHelper2.update()
  
  
  boxLight.position.set(0, 0.5, 2);
  boxLight.updateMatrix()
  boxLight.updateMatrixWorld()

  /*
   * STARS
   */
  const particleGeometry = new THREE.BufferGeometry();
  const count = Math.floor(mapRange(fxrand(), 0, 1, 40000, 80000));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const blobParams = {
    size: 1.8,
    sides: 24,
  };

  for (let i = 0; i < count; i += 3) {
    var vertex = randomPointInSphere(blobParams.size);
    positions[i] = vertex.x * 10;
    positions[i + 1] = vertex.y * 10;
    positions[i + 2] = vertex.z * 10;
  }
  for (let i = 0; i < count; i += 3) {
    const rColors = randomFromList(palletes);
    let currColor = new THREE.Color(randomFromList(rColors));
    colors[i] = currColor.r;
    colors[i + 1] = currColor.g;
    colors[i + 2] = currColor.b;
  }
  const TBufferPos = new THREE.BufferAttribute(positions, 3);
  const TBufferColors = new THREE.BufferAttribute(colors, 3);
  particleGeometry.setAttribute("position", TBufferPos);
  particleGeometry.setAttribute("color", TBufferColors);
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.02,
    sizeAttenuation: true,
    transparent: true,
    // alphaMap: particleTexture3
  });
  particlesMaterial.alphaTest = 0.0001;
  // particlesMaterial.vertexColors = true
  // particlesMaterial.transparent = true
  particlesMaterial.vertexColors = true;
  particlesMaterial.blending = THREE.AdditiveBlending;
  // Para hacer transparente la bola
  if(globalConfigs.material){
    particlesMaterial.depthTest = false
  }
  particles = new THREE.Points(particleGeometry, particlesMaterial);
  scene.add(particles);

  if(globalConfigs.material && fxrand() > 0.5){
    const depthOfFieldEffect = new DepthOfFieldEffect(camera, {
      focusDistance: .2,
      focalLength: 1,
      bokehScale: 1,
      height: 480
    });
    const depthPass = new EffectPass(camera, depthOfFieldEffect)
    composer.addPass(depthPass)
  }else{
    const depthOfFieldEffect = new DepthOfFieldEffect(camera, {
      focusDistance: mapRange(fxrand(), 0, 1, 1.2, 1.35),
			focalLength: 2,
			bokehScale: 8,
			height: 480
    });
    const depthPass = new EffectPass(camera, depthOfFieldEffect)
    // composer.addPass(depthPass)
  }
  // composer.addPass(bloomPass)
  // composer.addPass(noisePass)
  // composer.addPass(blurPass)
  composer.addPass(raysPass)
  // composer.addPass(sBloompass)
}

function setNewPoints( a ) {
  let offSets ={
      x: 0.1,
      y: 0.1,
      intensity: globalConfigs.sunNoise,
      speed: 0.0001
  }
  if(!a){
      return false
  }
  const basePositionAttribute = sun.geometry.getAttribute("basePosition");
  const positionAttribute = sun.geometry.getAttribute( 'position' );
  const vertex = new THREE.Vector3();

  for ( let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex++ ) {
      vertex.fromBufferAttribute( basePositionAttribute, vertexIndex );
      var noise = simplex.noise3D(
          vertex.x + offSets.x,
          vertex.y + offSets.y + a * offSets.speed,
          vertex.z * 0.006 + a * 0.0002 );
      var ratio = noise * 0.4 * ( offSets.intensity + 0.1 ) + 0.8;
      vertex.multiplyScalar( ratio );
      positionAttribute.setXYZ(vertexIndex, vertex.x, vertex.y, vertex.z)
  }

  sun.geometry.attributes.position.needsUpdate = true
  sun.geometry.computeBoundingSphere()
}
let rotation = false
let count = 0
function draw(a) {
	const elapsedTime = clock.getElapsedTime()
    sBloom.intensity = mapRange(Math.sin(elapsedTime), -1, 1, 0.1, 1.8)
    bottomLight1.position.y = mapRange(Math.sin(elapsedTime), -1, 1, -2.5, -2.2)
    if(globalConfigs.boxPosition === "Rotating"){
        box.rotation.x += 0.005
        box.rotation.y += 0.008
    }
    // Update controls
    controls.update()
    // Render
    setNewPoints(a)
    // renderer.render(scene, camera)
    composer.render();
    // Call tick again on the next frame
    window.requestAnimationFrame(draw)
    if(count === 0){
      fxpreview()
      count++
    }
    if(rotation){
      particles.rotation.z += 0.002
    }
}

init()
draw()

let song = null;
document.addEventListener('click', function(event) {
  if(!song){
    song = new Audio("./song.wav")
    song.play();
  }
});
document.addEventListener('keyup', (e) => {
  if(e.key === "r"){
    rotation = !rotation
  }
});
