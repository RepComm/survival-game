import { Object3D, Quaternion, Vector3 } from "three";

export class Physics {
  static SINGLETON: Physics;

  private colConfig: Ammo.btDefaultCollisionConfiguration;
  private colDispatcher: Ammo.btCollisionDispatcher;
  private broadphase: Ammo.btDbvtBroadphase;
  private solver: Ammo.btDbvtBroadphase;
  private physicsWorld: Ammo.btDiscreteDynamicsWorld;

  constructor () {
    this.colConfig = new Ammo.btDefaultCollisionConfiguration();
    this.colDispatcher = new Ammo.btCollisionDispatcher( this.colConfig );
    this.broadphase = new Ammo.btDbvtBroadphase();
    this.solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(
      this.colDispatcher,
      this.broadphase as Ammo.btBroadphaseInterface,
      this.solver,
      this.colConfig
    );

    this.physicsWorld.setGravity(
      new Ammo.btVector3( 0, 0, 0 )
    );
  }
  static get(): Physics {
    if (!Physics.SINGLETON) Physics.SINGLETON = new Physics();
    return Physics.SINGLETON;
  }
  getPhysicsWorld (): Ammo.btDiscreteDynamicsWorld {
    return this.physicsWorld;
  }
  step (delta: number): this {
    this.physicsWorld.stepSimulation(delta);
    return this;
  }
  add (body: PhysicsBody): this {
    this.physicsWorld.addRigidBody(body.getPhysicsBody());
    return this;
  }
}

let PhysicsTransformTemp: Ammo.btTransform;
let PhysicsMotionTransformOrigin: Ammo.btVector3;
let PhysicsVectorA: Ammo.btVector3;
let PhysicsBodyRelativePosition: Ammo.btVector3;
let PhysicsBodyQuaternion: Ammo.btQuaternion;

let PhysicsApplyCentralLocalForce: Ammo.btVector3;
let PhysicsApplyLocalTorqueVector: Ammo.btVector3;

export class PhysicsBody {
  protected visual: Object3D;
  protected physicsBody: Ammo.btRigidBody;
  protected physicsTransform: Ammo.btTransform;
  protected localInertia: Ammo.btVector3;

  constructor () {

  }

  getPhysicsBody (): Ammo.btRigidBody {
    return this.physicsBody;
  }
  getVisual (): Object3D {
    return this.visual;
  }
  setVisual (v: Object3D): this {
    this.visual = v;
    return this;
  }
  hasVisual (): boolean {
    return this.visual !== undefined && this.visual !== null;
  }
  getTransform (): Ammo.btTransform {
    return this.physicsTransform;
  }
  applyForce (force: Vector3, relativePosition: Vector3): this {
    if (!PhysicsVectorA) PhysicsVectorA = new Ammo.btVector3();
    if (!PhysicsBodyRelativePosition) PhysicsBodyRelativePosition = new Ammo.btVector3;
    PhysicsVectorA.setValue(force.x, force.y, force.z);

    PhysicsBodyRelativePosition.setValue(relativePosition.x, relativePosition.y, relativePosition.z);

    this.physicsBody.applyForce(PhysicsVectorA, PhysicsBodyRelativePosition);
    return this;
  }
  setLinearVelocity (velocity: Vector3): this {
    if (!PhysicsVectorA) PhysicsVectorA = new Ammo.btVector3();
    PhysicsVectorA.setValue(velocity.x, velocity.y, velocity.z);
    this.getPhysicsBody().setLinearVelocity(PhysicsVectorA);
    return this;
  }
  applyCentralForce (velocity: Vector3): this {
    if (!PhysicsVectorA) PhysicsVectorA = new Ammo.btVector3();
    PhysicsVectorA.setValue(velocity.x, velocity.y, velocity.z);
    this.getPhysicsBody().applyCentralForce(PhysicsVectorA);
    return this;
  }
  applyLocalTorque (localTorque: Vector3): this {
    if (!PhysicsApplyLocalTorqueVector) PhysicsApplyLocalTorqueVector = new Ammo.btVector3();
    PhysicsApplyLocalTorqueVector.setValue(localTorque.x, localTorque.y, localTorque.z);
    this.getPhysicsBody().applyLocalTorque(PhysicsApplyLocalTorqueVector);
    return this;
  }
  applyTorqueBrake (strength: number): this {
    let vel = this.getPhysicsBody().getAngularVelocity();
    vel.setX(-vel.x() * strength );
    vel.setY(-vel.y() * strength );
    vel.setZ(-vel.z() * strength );
    this.getPhysicsBody().setAngularVelocity(vel);
    return this;
  }
  applyCentralLocalForce (velocity: Vector3): this {
    if (!PhysicsApplyCentralLocalForce) PhysicsApplyCentralLocalForce = new Ammo.btVector3();
    PhysicsApplyCentralLocalForce.setValue(velocity.x, velocity.y, velocity.z);
    this.getPhysicsBody().applyCentralLocalForce(PhysicsApplyCentralLocalForce);
    return this;
  }
  setRotation (rotation: Quaternion): this {
    if (!PhysicsBodyQuaternion) PhysicsBodyQuaternion = new Ammo.btQuaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );
    this.getPhysicsBody().getWorldTransform().setRotation(PhysicsBodyQuaternion);
    return this;
  }
  getLinearVelocity (out?: Vector3): Vector3 {
    PhysicsVectorA = this.physicsBody.getLinearVelocity();
    if (!out) out = new Vector3();
    out.set( PhysicsVectorA.x(), PhysicsVectorA.y(), PhysicsVectorA.z() );
    return out;
  }
  setPositionValues (x: number, y: number, z: number): this {
    if (!PhysicsVectorA) PhysicsVectorA = new Ammo.btVector3();
    PhysicsVectorA.setValue(x, y, z);
    this.getWorldTransform().setOrigin(PhysicsVectorA);
    this.getPhysicsBody().setWorldTransform(PhysicsTransformTemp);
    return this;
  }
  getWorldTransform (): Ammo.btTransform {
    if (!PhysicsTransformTemp) PhysicsTransformTemp = new Ammo.btTransform();
    this.physicsBody.getMotionState().getWorldTransform(PhysicsTransformTemp);
    return PhysicsTransformTemp;
  }
  update (): this {
    if (!this.hasVisual()) return;

    this.getWorldTransform();
    PhysicsMotionTransformOrigin = PhysicsTransformTemp.getOrigin();

    this.visual.position.set(
      PhysicsMotionTransformOrigin.x(),
      PhysicsMotionTransformOrigin.y(),
      PhysicsMotionTransformOrigin.z()
    );

    PhysicsBodyQuaternion = PhysicsTransformTemp.getRotation();

    this.visual.quaternion.set(
      PhysicsBodyQuaternion.x(),
      PhysicsBodyQuaternion.y(),
      PhysicsBodyQuaternion.z(),
      PhysicsBodyQuaternion.w()
    );

    return this;
  }
}

export class PhysicsSphere extends PhysicsBody {
  private physicsShape: Ammo.btSphereShape;

  constructor (mass: number, radius: number) {
    super();
    this.physicsShape = new Ammo.btSphereShape(radius),
    this.physicsTransform = new Ammo.btTransform();
    this.physicsTransform.setIdentity();
    const isDynamic = (mass !== 0);

    this.localInertia  = new Ammo.btVector3(0, 0, 0);

    if (isDynamic) this.physicsShape.calculateLocalInertia (mass, this.localInertia);

    // startTransform.setOrigin(new Ammo.btVector3(2, 10, 0));

    const motionState = new Ammo.btDefaultMotionState(this.physicsTransform);
    const info = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      this.physicsShape,
      this.localInertia
    );
    info.m_friction = 0.5;
    this.physicsBody = new Ammo.btRigidBody(info);
  }
}
