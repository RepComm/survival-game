
import { Renderer } from "./components/renderer";
import {
  Scene,
  DirectionalLight,
  MeshStandardMaterial,
  Mesh,
  Geometry,
  CylinderGeometry,
  Vector2,
  Vector3,
  PerspectiveCamera
} from "three";

import { EXPONENT_CSS_STYLES, Panel } from "@repcomm/exponent-ts";
import { Terrain } from "./terrain";
import { Physics, PhysicsSphere } from "./physics";
import { ScatterMeshes, DiamondSquare, EaseInWeak } from "@repcomm/three.terrain";
import { FreeCamera } from "@repcomm/three.lookcamera";
import { GameInput } from "@repcomm/gameinput-ts";
import { Cessna } from "./resources/cessna/cessna";

//Because top level await is a mess
async function main() {

  //Wait on ammo to load (imported w/ html tag)
  await Ammo();
  const physics = Physics.get();

  //Append exponent styles
  EXPONENT_CSS_STYLES.mount(document.head);

  //Create a div to contain the ui
  const container = new Panel()
    .setId("container")
    .mount(document.body);

  const scene = new Scene();

  const cessna = new Cessna();
  scene.add(cessna);

  //Renderer mixes exponent system with three js renderer
  const renderer = new Renderer()
    .mount(container)
    .setScene(scene)
    .setCamera(cessna.getCamera());

  const input = GameInput.get();

  input.createAxis("forward")
  .addInfluence({
    keys: ["s"],
    value: 1.0,
    gpAxes:[1, 7]
  }).addInfluence({
    keys: ["w"],
    value: -1.0
  });

  input.createAxis("side")
  .addInfluence({
    keys: ["d"],
    value: 1.0,
    gpAxes:[0, 6]
  }).addInfluence({
    keys: ["a"],
    value: -1.0,
  });

  input.createAxis("horizontal")
  .addInfluence({
    mouseAxes:[0],
    value: 1.0,
    gpAxes:[3],
    gpAxisScale: 4,
    pointerAxisScale: 0.3
  });

  input.createAxis("vertical")
  .addInfluence({
    mouseAxes:[1],
    value: 1.0,
    gpAxes:[4],
    gpAxisScale: 4,
    pointerAxisScale: 0.3
  });

  input.createAxis("thruster")
  .addInfluence({
    value: 1.0,
    gpAxes:[5]
  });

  setInterval(() => {
    if (!input.raw.pointerIsLocked() && input.raw.getPointerButton(0)) {
      input.raw.pointerTryLock(renderer.getCanvas());
    }
    if (!input.raw.pointerIsLocked()) return;

    physics.step(1/60);

    cessna.update();
  }, 1000 / 60);

  let intervals = 63;

  const terrainOpts = {
    material: new MeshStandardMaterial({
      color: 0x44dd66,
    }),
    easing: EaseInWeak,
    heightmap: DiamondSquare,
    maxHeight: 250,
    minHeight: -100,
    steps: 0,
    useBufferGeometry: false,
    widthSegments: intervals,
    width: 1024,
    heightSegments: intervals,
    height: 1024
  };

  const terrain = new Terrain(terrainOpts);

  // terrain.initPhysics(terrainOpts);
  // physics.getPhysicsWorld().addRigidBody(terrain.getPhysicsBody());

  terrain.rotateX(-Math.PI/2);

  let decor = ScatterMeshes(terrain.getMesh().geometry as Geometry, {
    mesh: new Mesh(new CylinderGeometry(2, 2, 12, 6)),
    w: intervals,
    h: intervals,
    spread: 0.02,
    randomness: Math.random
  });

  terrain.add(decor);

  scene.add(terrain);

  const dirLight = new DirectionalLight(0xffffff, 1);
  scene.add(dirLight);

  (()=>{
    let rect = renderer.getRect();
    let cam = (cessna.getCamera() as PerspectiveCamera);

    cam.aspect = rect.width/rect.height;
    cam.updateProjectionMatrix();
    
  })();
}

main();
