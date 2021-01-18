import { Object3D, Vector3 } from "three";

export class Physics {
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
      new Ammo.btVector3( 0, -9.8, 0 )
    );
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

let PhysicsMotionTransform: Ammo.btTransform;
let PhysicsMotionTransformOrigin: Ammo.btVector3;
let PhysicsBodyForce: Ammo.btVector3;
let PhysicsBodyRelativePosition: Ammo.btVector3;

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
    if (!PhysicsBodyForce) PhysicsBodyForce = new Ammo.btVector3();
    if (!PhysicsBodyRelativePosition) PhysicsBodyRelativePosition = new Ammo.btVector3;
    PhysicsBodyForce.setValue(force.x, force.y, force.z);

    PhysicsBodyRelativePosition.setValue(relativePosition.x, relativePosition.y, relativePosition.z);

    this.physicsBody.applyForce(PhysicsBodyForce, PhysicsBodyRelativePosition);
    return this;
  }
  getWorldTransform (): Ammo.btTransform {
    if (!PhysicsMotionTransform) PhysicsMotionTransform = new Ammo.btTransform();
    this.physicsBody.getMotionState().getWorldTransform(PhysicsMotionTransform);
    return PhysicsMotionTransform;
  }
  update (): this {
    if (!this.hasVisual()) return;

    this.getWorldTransform();
    PhysicsMotionTransformOrigin = PhysicsMotionTransform.getOrigin();

    this.visual.position.set(
      PhysicsMotionTransformOrigin.x(),
      PhysicsMotionTransformOrigin.y(),
      PhysicsMotionTransformOrigin.z()
    );
    //TODO rotation
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
      this.physicsBody = new Ammo.btRigidBody(info);
  }
}
