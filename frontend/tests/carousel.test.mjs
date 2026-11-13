import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCarousel } from '../src/core/carousel.ts';

function fixture() {
  let now = 0, id = 0;
  const jobs = new Map();
  const carousel = createCarousel({ count: 3,
    schedule(fn, ms) { const token = ++id; jobs.set(token, { at: now + ms, fn }); return () => jobs.delete(token); },
  });
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const job = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!job || job[1].at > end) break;
      now = job[1].at; jobs.delete(job[0]); job[1].fn();
    }
    now = end;
  }
  return { carousel, advance, jobs };
}
test('rests three seconds after each slow turn and wraps without reversing', () => {
  const { carousel, advance } = fixture();
  carousel.resume('initializing');
  advance(2999); assert.equal(carousel.snapshot().index, 0);
  advance(1); assert.deepEqual(carousel.snapshot(), { index: 1, rotation: -120 });
  advance(1399); assert.equal(carousel.snapshot().index, 1);
  advance(1); // Turn finishes; the next full three-second dwell starts now.
  advance(2999); assert.equal(carousel.snapshot().index, 1);
  advance(1); assert.deepEqual(carousel.snapshot(), { index: 2, rotation: -240 });
  advance(4400); assert.deepEqual(carousel.snapshot(), { index: 0, rotation: -360 });
});
test('overlapping pause reasons remain paused until every reason clears', () => {
  const { carousel, advance } = fixture();
  carousel.resume('initializing');
  carousel.pause('focus'); carousel.pause('dialog');
  advance(6000); assert.equal(carousel.snapshot().index, 0);
  carousel.resume('dialog'); advance(6000); assert.equal(carousel.snapshot().index, 0);
  carousel.resume('focus'); advance(3000); assert.equal(carousel.snapshot().index, 1);
});
test('manual selection restarts the interval and remains possible during reduced motion', () => {
  const { carousel, advance } = fixture();
  carousel.resume('initializing'); advance(2500); carousel.select(2);
  advance(500); assert.equal(carousel.snapshot().index, 2);
  carousel.pause('motion'); carousel.select(-1); advance(12000);
  assert.equal(carousel.snapshot().index, 2);
  carousel.resume('motion'); advance(3000); assert.equal(carousel.snapshot().index, 0);
});
test('disposing cancels timers and notifications', () => {
  const { carousel, advance, jobs } = fixture();
  let updates = 0;
  carousel.subscribe(() => updates++);
  carousel.resume('initializing'); carousel.dispose(); advance(9000); carousel.select(1);
  assert.equal(updates, 0); assert.equal(jobs.size, 0);
});

test('rejects invalid runtime input instead of corrupting selection', () => {
  assert.throws(() => createCarousel({ count: 0 }));
  assert.throws(() => createCarousel({ count: 3, delay: -1 }));
  assert.throws(() => createCarousel({ count: 3, transitionDuration: -1 }));
  const { carousel } = fixture();
  for (const value of [NaN, Infinity, 1.5]) assert.throws(() => carousel.select(value));
  assert.equal(carousel.snapshot().index, 0);
});

test('redundant resume events do not keep postponing autoplay', () => {
  const { carousel, advance } = fixture();
  carousel.resume('initializing');
  advance(2000); carousel.resume('focus'); carousel.resume('pointer');
  advance(1000); assert.equal(carousel.snapshot().index, 1);
});

test('a pause during rotation resumes with a full dwell after settling', () => {
  const { carousel, advance } = fixture();
  carousel.resume('initializing'); advance(3000);
  carousel.pause('pointer'); advance(5000);
  assert.equal(carousel.snapshot().index, 1);
  carousel.resume('pointer'); advance(2999);
  assert.equal(carousel.snapshot().index, 1);
  advance(1); assert.equal(carousel.snapshot().index, 2);
});

test('rapid manual selection replaces the previous turn without extra ticks', () => {
  const { carousel, advance, jobs } = fixture();
  carousel.resume('initializing'); carousel.select(1); advance(500); carousel.select(2);
  advance(1399); assert.equal(carousel.snapshot().index, 2);
  advance(3000); assert.equal(carousel.snapshot().index, 2);
  advance(1); assert.equal(carousel.snapshot().index, 0);
  carousel.dispose(); advance(10000); assert.equal(jobs.size, 0);
});
