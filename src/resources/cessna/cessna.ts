
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Object3D, PerspectiveCamera, Camera, Vector3, AnimationMixer, AnimationClip, AnimationAction, Euler, Quaternion } from "three";
import { Physics, PhysicsBody, PhysicsSphere } from "../../physics";
import { GameInput } from "@repcomm/gameinput-ts";

const gltfLoader = new GLTFLoader();

const input = GameInput.get();

function pressure(airDensity: number, velocity: number): number {
  return airDensity * ((velocity * velocity) / 2);
}

function lift(co: number, airDensity: number, velocity: number, wingArea: number): number {
  return co * pressure(airDensity, velocity) * wingArea;
}

function lerp(v0, v1, t) {
  return v0 * (1 - t) + v1 * t
}

//https://github.com/mattdesl/three-quaternion-from-normal
const setDirectionAxis = new Vector3();
function quaternionFromVector3(normal: Vector3, out?: Quaternion): Quaternion {
  out = out || new Quaternion();
  // vector is assumed to be normalized
  if (normal.y > 0.99999) {
    out.set(0, 0, 0, 1);
  } else if (normal.y < -0.99999) {
    out.set(1, 0, 0, 0);
  } else {
    setDirectionAxis.set(normal.z, 0, -normal.x).normalize();
    var radians = Math.acos(normal.y);
    out.setFromAxisAngle(setDirectionAxis, radians);
  }
  return out;
}

export class Cessna extends Object3D {
  private model: Object3D;
  private physicsBody: PhysicsSphere;
  private camera: PerspectiveCamera;
  private velocity: Vector3;
  private torque: Vector3;

  private propPower: number;

  private mixer: AnimationMixer;
  private animAction0: AnimationAction;

  private quaternionTemp: Quaternion;
  private vectorTempA: Vector3;

  constructor() {
    super();

    this.vectorTempA = new Vector3();
    this.quaternionTemp = new Quaternion();
    this.velocity = new Vector3();
    this.torque = new Vector3();

    this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position.set(0, 5, 15);
    this.add(this.camera);

    gltfLoader.loadAsync("resources/cessna/cessna.glb").then((gltf: GLTF) => {
      // console.log(gltf.scene);
      this.add(gltf.scene);
      for (let anim of gltf.animations) {
        anim.optimize();
      }

      this.mixer = new AnimationMixer(gltf.scene);
      let actions = new Array<AnimationAction>();

      for (let clip of gltf.animations) {
        actions.push(this.mixer.clipAction(clip));
      }

      this.animAction0 = actions[0];

      this.animAction0 = this.mixer.clipAction(gltf.animations[0]);
      // action.setLoop(THREE.LoopOnce);
      this.animAction0.play();
    });

    this.physicsBody = new PhysicsSphere(1, 1);
    this.physicsBody.setVisual(this);

    this.physicsBody.setPositionValues(0, 200, 0);

    this.propPower = 2;

    this.physicsBody.getPhysicsBody().setFriction(0.5);

    Physics.get().add(this.physicsBody);
  }
  getCamera(): Camera {
    return this.camera;
  }
  getPhysics(): PhysicsBody {
    return this.physicsBody;
  }
  getAirspeed(): number {
    return this.getPhysics().getPhysicsBody().getLinearVelocity().length();
  }
  getAngleOfAttack(): number {
    this.physicsBody.getLinearVelocity(this.vectorTempA);
    this.vectorTempA.normalize();
    this.vectorTempA.z = 0;

    quaternionFromVector3(this.vectorTempA, this.quaternionTemp);
    return this.quaternionTemp.angleTo(this.quaternion);
  }
  update() {
    this.mixer.update(1 / 30);
    this.getPhysics().update();

    let aoa = this.getAngleOfAttack();
    let liftAmount = lift(0.08, 0.08, this.getAirspeed(), 5);
    if (liftAmount > 100) liftAmount = 100;

    let upwardLift = lerp(0, liftAmount, aoa / Math.PI);
    let forwardLift = lerp(liftAmount, 0, aoa / Math.PI);

    document.title = (
      `aoa:${aoa.toFixed(2)},
      lift:${liftAmount.toFixed()},
      up:${upwardLift.toFixed()},
      fwd:${forwardLift}`
    );

    let thrusterValue = input.getAxisValue("thruster") *2-1;
    if (thrusterValue > 0) {
      this.propPower += 0.4 * thrusterValue;
    } else {
      this.propPower -= 0.4;
    }
    if (this.propPower < 0) this.propPower = 0;
    if (this.propPower > 10) this.propPower = 10;

    this.velocity.y = upwardLift - 9.8;
    this.velocity.z = -(forwardLift + this.propPower);
    this.velocity.x = 0;

    this.vectorTempA.copy(this.velocity);
    this.vectorTempA.multiplyScalar(-1);

    this.vectorTempA.multiplyScalar(
      this.getPhysics()
      .getPhysicsBody()
      .getAngularVelocity()
      .length() / 2
    );

    this.velocity.add(this.vectorTempA);

    this.getPhysics().applyCentralLocalForce(this.velocity);

    this.torque.x = input.getAxisValue("forward") * 0.5;
    this.torque.z = input.getAxisValue("side") * -0.25;

    this.getPhysics().applyLocalTorque(this.torque);
    // this.getPhysics().applyTorqueBrake(0.1);

  }
}
