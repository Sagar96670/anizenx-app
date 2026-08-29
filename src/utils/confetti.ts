import confetti from 'canvas-confetti';

/**
 * Triggers a multi-stage celebratory confetti explosion when VIP is activated.
 */
export function triggerVipCelebration() {
  try {
    // 1. Initial burst from center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#EC4899', '#8B5CF6', '#10B981', '#3B82F6', '#FFD700'],
      zIndex: 99999,
    });

    // 2. Left side cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#F59E0B', '#EF4444', '#8B5CF6', '#FBBF24'],
        zIndex: 99999,
      });
    }, 250);

    // 3. Right side cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899'],
        zIndex: 99999,
      });
    }, 400);

    // 4. Gold star shower finish
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        startVelocity: 30,
        origin: { y: 0.4 },
        colors: ['#FFD700', '#FFA500', '#FFFFFF'],
        shapes: ['star', 'circle'],
        zIndex: 99999,
      });
    }, 700);
  } catch (err) {
    console.warn('Celebration confetti effect failed to run:', err);
  }
}
