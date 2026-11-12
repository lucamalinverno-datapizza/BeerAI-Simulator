import { describe, expect, it } from 'vitest';
import { CREW, cameraBoom, configureCrew, crewPose, crewPoses, findCrewPath, stepCrew } from '../src/scene/crew/crew';
import { collides } from '../src/scene/navigation/collision';
import { buildObstacles, WALK_BOUNDS } from '../src/scene/navigation/obstacles';
import { PLAYER_RADIUS } from '../src/scene/layout';

const tanks = ['F1','F2','F3','F4','F5','F6','F7','F8'];
const idle = { forward: 0, strafe: 0, run: false, yaw: 0 };
describe('staff navigation and third-person control', () => {
  it('patrols keep every person outside equipment for a full minute with all 8 tank slots', () => {
    configureCrew(tanks);
    const obstacles = buildObstacles(tanks);
    const start = crewPoses.map((p) => ({ x: p.x, z: p.z }));
    const distances = crewPoses.map(() => 0);
    for (let f = 0; f < 60 * 60; f++) {
      const before = crewPoses.map((p) => ({ x: p.x, z: p.z }));
      stepCrew(1/60, null, idle);
      crewPoses.forEach((p,i) => {
        distances[i] += Math.hypot(p.x-before[i].x,p.z-before[i].z);
        if (f % 60 === 0) expect(collides(p.x,p.z,PLAYER_RADIUS,obstacles,WALK_BOUNDS)).toBe(false);
      });
    }
    expect(start).toHaveLength(CREW.length);
    distances.forEach((d,i) => expect(d, crewPoses[i].id).toBeGreaterThan(15));
  });
  it('the selected person stands still without input and moves relative to the camera', () => {
    configureCrew(['F1','F2','F3','F4']);
    const p = crewPose('alex');
    Object.assign(p, { x: -12, z: 3 });
    stepCrew(0.1, 'alex', idle);
    expect([p.x,p.z]).toEqual([-12,3]);
    stepCrew(0.1, 'alex', { ...idle, forward: 1, yaw: Math.PI/2 });
    expect(p.x).toBeCloseTo(-12.32);
    expect(p.z).toBeCloseTo(3);
    stepCrew(0.1, 'alex', { ...idle, strafe: 1, yaw: 0 });
    expect(p.x).toBeCloseTo(-12);
  });
  it('running does not tunnel through tanks or walls, and diagonal speed is normalised', () => {
    configureCrew(['F1','F2','F3','F4']);
    const p = crewPose('alex');
    Object.assign(p, { x: 0, z: -7 });
    for (let i=0;i<200;i++) stepCrew(0.05,'alex',{...idle,forward:1,run:true});
    expect(Math.hypot(p.x,p.z+11)).toBeGreaterThanOrEqual(1.35+PLAYER_RADIUS);
    Object.assign(p, { x: -12, z: 3 });
    stepCrew(0.1, 'alex', {...idle,forward:1,strafe:1});
    expect(Math.hypot(p.x+12,p.z-3)).toBeCloseTo(0.32);
  });
  it('the follow camera boom stops before hall walls and equipment', () => {
    configureCrew(['F1','F2','F3','F4']);
    expect(cameraBoom({x:0,z:-7},Math.PI,5.6)).toBeLessThan(3);
    expect(cameraBoom({x:0,z:16.5},0,5.6)).toBeLessThan(1);
    expect(cameraBoom({x:-12,z:3},0,5.6)).toBeGreaterThan(5.3);
  });
  it('routes around racks and remain valid after F5–F8 appear', () => {
    configureCrew(tanks);
    const path = findCrewPath({x:11,z:6.5},{x:28.5,z:1});
    expect(path.length).toBeGreaterThan(1);
    path.forEach((p)=>expect(collides(p.x,p.z,PLAYER_RADIUS,buildObstacles(tanks),WALK_BOUNDS)).toBe(false));
  });
});
