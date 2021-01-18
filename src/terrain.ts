
import {
  Terrain as ThreeTerrain,
  TerrainOptions,
  TerrainOptionsDefault
} from "@repcomm/three.terrain";
import { PlaneGeometry } from "three";

export class Terrain extends ThreeTerrain {
  private physicsShape: Ammo.btHeightfieldTerrainShape;
  private physicsTransform: Ammo.btTransform;
  private physicsBody: Ammo.btRigidBody;

  constructor (options: TerrainOptions = TerrainOptionsDefault) {
    super(options);
  }
  getHeightData (): Float32Array {
    const result = new Float32Array(
      this["widthSegments"] * this["heightSegments"]
    );

    let verts = (this.getMesh().geometry as PlaneGeometry).vertices;

    for (let i=0; i<result.length; i++) {
      result[i] = verts[i].z;
    }

    return result;
  }
  getWidthSegmentCount (): number {
    return this["widthSegments"];
  }
  getHeightSegmentCount (): number {
    return this["heightSegments"];
  }
  initPhysics (options: TerrainOptions) {
    let heightData = this.getHeightData();

    //0 = X, 1 = Y, 2 = Z
    const UpAxis = 1;
    // Set this to your needs (inverts the triangles)
    const invertTriangles = false;
    const ammoHeightData = Ammo._malloc( heightData.byteLength );

    for (let i=0; i<heightData.length; i++) {
      Ammo.HEAPF32[ammoHeightData + i] = heightData[i];
    }

    // Creates the heightfield physics shape
    this.physicsShape = new Ammo.btHeightfieldTerrainShape(
      this.getWidthSegmentCount(),
      this.getHeightSegmentCount(),
      ammoHeightData,
      1,
      options.minHeight, //TODO - grab from constructor options
      options.maxHeight, //TODO - grab from constructor options

      UpAxis,
      "PHY_FLOAT" as any, // Ammo.PHY_ScalarType.PHY_FLOAT, //"PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
      invertTriangles
    );

    this.physicsShape.setLocalScaling(new Ammo.btVector3(
      options.width,
      1,
      options.height
    ));

    this.physicsShape.setMargin( 0.05 );

    this.physicsTransform = new Ammo.btTransform();
    this.physicsTransform.setIdentity();
    
    this.physicsTransform.setOrigin(
      new Ammo.btVector3(
        0,
        (options.maxHeight + options.minHeight ) / 2,
        0
      )
    );

    const motionState = new Ammo.btDefaultMotionState( this.physicsTransform );

    const inertia = new Ammo.btVector3( 0, 0, 0 );

    const info = new Ammo.btRigidBodyConstructionInfo(
      0,
      motionState,
      this.physicsShape,
      inertia
    );

	  this.physicsBody = new Ammo.btRigidBody(info);
  }
  getPhysicsBody (): Ammo.btRigidBody {
    return this.physicsBody;
  }
}
