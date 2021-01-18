
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

//Because top level await is a mess
async function main() {

  //Wait on ammo to load (imported w/ html tag)
  await Ammo();
  const physics = new Physics();

  //Append exponent styles
  EXPONENT_CSS_STYLES.mount(document.head);

  //Create a div to contain the ui
  const container = new Panel()
    .setId("container")
    .mount(document.body);

  const scene = new Scene();

  const freecam = new FreeCamera();
  scene.add(freecam);

  const freecamPhysics = new PhysicsSphere(1, 1)
  .setVisual(freecam);

  physics.add(freecamPhysics);

  //Renderer mixes exponent system with three js renderer
  const renderer = new Renderer()
    .mount(container)
    .setScene(scene)
    .setCamera(freecam.getCamera());

  const input = GameInput.get();

  input.createAxis("forward")
  .addInfluence({
    keys: ["s"],
    value: 1.0,
    gpAxes:[1]
  }).addInfluence({
    keys: ["w"],
    value: -1.0
  });

  input.createAxis("side")
  .addInfluence({
    keys: ["d"],
    value: 1.0,
    gpAxes:[0]
  }).addInfluence({
    keys: ["a"],
    value: -1.0,
  });

  input.createAxis("horizontal")
  .addInfluence({
    mouseAxes:[0],
    value: 1.0,
    gpAxes:[3]
  });

  input.createAxis("vertical")
  .addInfluence({
    mouseAxes:[1],
    value: 1.0,
    gpAxes:[4]
  });

  const moveVector = new Vector3();

  const rotateSensitivity = 20;
  const moveSpeed = -10;

  setInterval(() => {
    if (!input.raw.pointerIsLocked() && input.raw.getPointerButton(0)) {
      input.raw.pointerTryLock(renderer.getCanvas());
    }
    if (!input.raw.pointerIsLocked()) return;
    moveVector.set(0, 0, 0);

    moveVector.x = input.getAxisValue("side") * moveSpeed;
    moveVector.y = input.getAxisValue("forward") * moveSpeed;

    freecam.addMovementInput(moveVector.y, moveVector.x);

    // freecamPhysics.applyForce(moveVector, freecam.position);

    freecam.addRotationInput(
      input.getAxisValue("horizontal") * rotateSensitivity,
      input.getAxisValue("vertical") * rotateSensitivity
    );

    // physics.step(1/30);
    // freecamPhysics.update();
  }, 1000 / 30);

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

  terrain.initPhysics(terrainOpts);
  physics.getPhysicsWorld().addRigidBody(terrain.getPhysicsBody());

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
    let cam = (freecam.getCamera() as PerspectiveCamera);

    cam.aspect = rect.width/rect.height;
    cam.updateProjectionMatrix();
    
  })();
}

main();
